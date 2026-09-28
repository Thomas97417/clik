import { describe, expect, it, beforeEach } from "vitest";
import { Matrix4, Vector3 } from "three";
import {
  type SceneDocument,
  applyDelta,
  duplicate,
  emptyScene,
  group,
  makePart,
  reparent,
  snapPart,
  ungroup,
  validateScene,
  worldMatrix,
} from "@clik/scene";
import { useEditor } from "../src/lib/clik/store";
const close = (a: Matrix4, b: Matrix4) =>
  a.elements.forEach((n, i) => expect(n).toBeCloseTo(b.elements[i], 8));
describe("SceneDocument et transformations", () => {
  it("conserve les positions lors du groupement, réorganisation et dissociation imbriqués", () => {
    const p = makePart("brick-2x4", "#4079e8", [3, 2, -4]);
    p.rotation = [0.3, 0.7, 1.1];
    let s: SceneDocument = { ...emptyScene(), nodes: [p] };
    const before = worldMatrix(s, p.id);
    s = group(s, [p.id], "g1");
    s = group(s, ["g1"], "g2");
    s = applyDelta(s, ["g2"], new Matrix4().makeRotationY(0.6));
    const moved = worldMatrix(s, p.id);
    s = reparent(s, [p.id], null);
    close(worldMatrix(s, p.id), moved);
    s = reparent(s, [p.id], "g1");
    s = ungroup(s, ["g2", "g1"]);
    close(worldMatrix(s, p.id), moved);
    expect(before.equals(moved)).toBe(false);
  });
  it("duplique un groupe et ses enfants avec des identifiants indépendants", () => {
    const p = makePart("brick-2x2", "#ef4444", [1, 2, 3]);
    const scene = group({ ...emptyScene(), nodes: [p] }, [p.id], "group");
    const copy = duplicate(scene, ["group"]);
    expect(new Set(copy.scene.nodes.map((n) => n.id)).size).toBe(4);
    const child = copy.scene.nodes.find(
      (n) => n.id !== p.id && n.kind === "part",
    )!;
    expect(child.parentId).toBe(copy.ids[0]);
    close(worldMatrix(copy.scene, child.id), worldMatrix(scene, p.id));
  });
  it("emboîte après rotation autour de plusieurs axes", () => {
    const target = makePart("brick-1x1", "#ef4444", [2, 3, 4]);
    target.rotation = [0.6, 0.8, 0.2];
    const point = new Vector3(0, 1.2, 0).applyMatrix4(
      worldMatrix({ ...emptyScene(), nodes: [target] }, target.id),
    );
    const p = makePart(
      "brick-1x1",
      "#4079e8",
      point.clone().addScalar(0.1).toArray(),
    );
    p.rotation = [...target.rotation];
    const result = snapPart({ ...emptyScene(), nodes: [target] }, p, true);
    result.position.forEach((n, i) =>
      expect(n).toBeCloseTo(point.toArray()[i], 8),
    );
    expect(snapPart({ ...emptyScene(), nodes: [target] }, p, false)).toEqual(p);
  });
  it("autorise les chevauchements mais refuse cycles, couleurs et plus de 500 pièces", () => {
    const p = makePart("brick-1x1", "#4079e8");
    expect(
      validateScene({ ...emptyScene(), nodes: [p, { ...p, id: "b" }] }),
    ).toBeTruthy();
    expect(() =>
      validateScene({ ...emptyScene(), nodes: [{ ...p, color: "#badbad" }] }),
    ).toThrow();
    const g = group({ ...emptyScene(), nodes: [p] }, [p.id], "g");
    expect(() => reparent(g, ["g"], "g")).toThrow();
    expect(() =>
      validateScene({
        ...emptyScene(),
        nodes: Array.from({ length: 501 }, (_, i) => ({ ...p, id: String(i) })),
      }),
    ).toThrow("500");
  });
  it("rejette NaN, parents inexistants, ids dupliqués et dépassement en octets", () => {
    const p = makePart("brick-1x1", "#4079e8");
    expect(() =>
      validateScene({
        ...emptyScene(),
        nodes: [{ ...p, position: [NaN, 0, 0] }],
      }),
    ).toThrow();
    expect(() =>
      validateScene({
        ...emptyScene(),
        nodes: [{ ...p, parentId: "missing" }],
      }),
    ).toThrow();
    expect(() => validateScene({ ...emptyScene(), nodes: [p, p] })).toThrow();
    expect(() => validateScene({ padding: "é".repeat(300000) })).toThrow("512");
  });
});
describe("Historique de l’atelier", () => {
  beforeEach(() => useEditor.getState().load(emptyScene(), "Test"));
  it("regroupe les mouvements intermédiaires en un seul geste annulable", () => {
    const s = useEditor.getState();
    s.add("brick-1x1");
    const id = useEditor.getState().selection[0];
    useEditor.setState({ snap: false });
    s.begin();
    s.preview(new Matrix4().makeTranslation(1, 0, 0));
    s.preview(new Matrix4().makeTranslation(4, 0, 0));
    s.end();
    expect(useEditor.getState().past).toHaveLength(2);
    expect(useEditor.getState().scene.nodes[0].position[0]).toBe(4);
    s.undo();
    expect(useEditor.getState().scene.nodes[0].position[0]).toBe(0);
    s.redo();
    expect(useEditor.getState().scene.nodes[0].id).toBe(id);
    expect(useEditor.getState().scene.nodes[0].position[0]).toBe(4);
  });
  it("Échap restaure le début du geste et copier/coller préserve les positions mondiales", () => {
    const s = useEditor.getState();
    s.add("brick-2x2");
    s.begin();
    s.preview(new Matrix4().makeTranslation(9, 0, 0));
    s.cancel();
    expect(useEditor.getState().scene.nodes[0].position[0]).toBe(0);
    s.group();
    s.copy();
    s.paste();
    expect(
      useEditor.getState().scene.nodes.filter((n) => n.kind === "part"),
    ).toHaveLength(2);
  });
  it("respecte le verrouillage hérité", () => {
    const s = useEditor.getState();
    s.add("brick-1x1");
    const id = useEditor.getState().selection[0];
    s.group();
    const g = useEditor.getState().selection[0];
    s.patch(g, { locked: true });
    s.select(id);
    s.remove();
    expect(useEditor.getState().scene.nodes).toHaveLength(2);
    s.patch(id, { position: [10, 0, 0] });
    expect(useEditor.getState().scene.nodes[0].position[0]).toBe(0);
  });
});

it("copie 300 pièces dans un autre document sans compter le presse-papiers dans la limite", () => {
  const p = makePart("brick-1x1", "#4079e8");
  const clipboard = {
    ...emptyScene(),
    nodes: Array.from({ length: 300 }, (_, i) => ({ ...p, id: `copy-${i}` })),
  };
  const result = duplicate(
    clipboard,
    clipboard.nodes.map((n) => n.id),
    emptyScene(),
  );
  expect(result.scene.nodes).toHaveLength(300);
});

it("aimante un groupe comme un ensemble sans déformer ses enfants", async () => {
  const { snapSelection } = await import("@clik/scene");
  const target = makePart("brick-1x1", "#ef4444", [0, 0, 0]),
    a = makePart("brick-1x1", "#4079e8", [0.1, 1.3, 0.1]),
    b = makePart("brick-1x1", "#4079e8", [2.1, 1.3, 0.1]);
  let scene = group(
    { ...emptyScene(), nodes: [target, a, b] },
    [a.id, b.id],
    "assembly",
  );
  const before = new Vector3()
    .setFromMatrixPosition(worldMatrix(scene, b.id))
    .sub(new Vector3().setFromMatrixPosition(worldMatrix(scene, a.id)));
  scene = snapSelection(scene, ["assembly"], true);
  expect(
    new Vector3()
      .setFromMatrixPosition(worldMatrix(scene, a.id))
      .distanceTo(new Vector3(0, 1.2, 0)),
  ).toBeLessThan(1e-8);
  const after = new Vector3()
    .setFromMatrixPosition(worldMatrix(scene, b.id))
    .sub(new Vector3().setFromMatrixPosition(worldMatrix(scene, a.id)));
  expect(after.distanceTo(before)).toBeLessThan(1e-8);
});
