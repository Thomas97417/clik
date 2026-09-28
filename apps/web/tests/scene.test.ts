import { describe, expect, it, beforeEach } from "vitest";
import { Box3, Matrix4, Vector3 } from "three";
import {
  type SceneDocument,
  type Part,
  CATALOG,
  descendants,
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
const boundsOf = (scene: SceneDocument, part: Part) => {
  const { w, h, d } = CATALOG[part.type];
  return new Box3(
    new Vector3(-w / 2, 0, -d / 2),
    new Vector3(w / 2, h + 0.2, d / 2),
  ).applyMatrix4(worldMatrix(scene, part.id));
};
const expectFreeCopies = (
  before: SceneDocument,
  after: SceneDocument,
  ids: string[],
) => {
  const copied = new Set(descendants(after, ids));
  for (const part of after.nodes) {
    if (part.kind !== "part" || !copied.has(part.id)) continue;
    for (const original of before.nodes) {
      if (original.kind === "part")
        expect(
          boundsOf(after, part).intersectsBox(boundsOf(before, original)),
        ).toBe(false);
    }
  }
};
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
    close(
      worldMatrix(copy.scene, child.id),
      new Matrix4().makeTranslation(3, 0, 0).multiply(worldMatrix(scene, p.id)),
    );
  });
  it("place les copies successives hors des pièces existantes, même masquées et verrouillées", () => {
    const part = makePart("brick-2x4", "#4079e8");
    const obstacle = makePart("brick-2x4", "#ef4444", [3, 0, 0]);
    obstacle.hidden = true;
    obstacle.locked = true;
    let scene = { ...emptyScene(), nodes: [part, obstacle] } as SceneDocument;
    for (let i = 0; i < 8; i++) {
      const previous = structuredClone(scene);
      const result = duplicate(scene, [part.id]);
      expectFreeCopies(scene, result.scene, result.ids);
      expect(scene).toEqual(previous);
      scene = result.scene;
    }
  });
  it("déplace rigidement un groupe imbriqué tourné et une sélection multiple", () => {
    const a = makePart("brick-2x4", "#4079e8", [1, 2, 3]);
    const b = makePart("brick-1x1", "#ef4444", [6, 4, -2]);
    let scene = group({ ...emptyScene(), nodes: [a, b] }, [a.id], "inner");
    scene = group(scene, ["inner", b.id], "outer");
    scene = applyDelta(
      scene,
      ["outer"],
      new Matrix4()
        .makeRotationX(0.4)
        .multiply(new Matrix4().makeRotationY(0.7)),
    );
    for (const selected of [["inner"], ["inner", b.id]]) {
      const result = duplicate(scene, selected);
      expectFreeCopies(scene, result.scene, result.ids);
      const originals = scene.nodes.filter(
        (n): n is Part =>
          n.kind === "part" && descendants(scene, selected).includes(n.id),
      );
      const copies = result.scene.nodes.filter(
        (n): n is Part =>
          n.kind === "part" && !scene.nodes.some((old) => old.id === n.id),
      );
      const offset = new Vector3()
        .setFromMatrixPosition(worldMatrix(result.scene, copies[0].id))
        .sub(
          new Vector3().setFromMatrixPosition(
            worldMatrix(scene, originals[0].id),
          ),
        );
      expect(offset.y).toBeCloseTo(0, 8);
      expect(offset.length()).toBeGreaterThan(0);
      copies.forEach((copy, i) =>
        close(
          worldMatrix(result.scene, copy.id),
          new Matrix4()
            .makeTranslation(...offset.toArray())
            .multiply(worldMatrix(scene, originals[i].id)),
        ),
      );
      expect(copies[0].position).toEqual(a.position);
      expect(
        result.scene.nodes.find((n) => n.id === result.ids[0])!.parentId,
      ).toBe("outer");
    }
  });
  it("conserve le placement du presse-papiers si libre et le décale si occupé", () => {
    const part = makePart("brick-1x1", "#4079e8", [4, 2, -3]);
    const clipboard = { ...emptyScene(), nodes: [part] };
    const empty = duplicate(clipboard, [part.id], emptyScene());
    close(
      worldMatrix(empty.scene, empty.ids[0]),
      worldMatrix(clipboard, part.id),
    );
    const occupied = duplicate(clipboard, [part.id], empty.scene);
    expectFreeCopies(empty.scene, occupied.scene, occupied.ids);
  });
  it("choisit un autre côté aux limites des coordonnées autorisées", () => {
    const part = makePart("brick-2x2", "#4079e8", [9999, 0, 0]);
    const scene = { ...emptyScene(), nodes: [part] };
    const result = duplicate(scene, [part.id]);
    expectFreeCopies(scene, result.scene, result.ids);
    expect(result.scene.nodes[1].position).toEqual([9996, 0, 0]);
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
  it("Échap restaure le début du geste et copier/coller recrée le groupe", () => {
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
  it("annule et rétablit en une opération la duplication d’un groupe sans chevauchement", () => {
    const editor = useEditor.getState();
    editor.add("brick-2x4");
    editor.group();
    const before = useEditor.getState().scene;
    const historyLength = useEditor.getState().past.length;
    editor.duplicate();
    const after = useEditor.getState().scene;
    expectFreeCopies(before, after, useEditor.getState().selection);
    expect(useEditor.getState().past).toHaveLength(historyLength + 1);
    editor.undo();
    expect(useEditor.getState().scene).toEqual(before);
    editor.redo();
    expect(useEditor.getState().scene).toEqual(after);
  });
  it.each([true, false])(
    "ajoute toutes les formes sans chevauchement (aimantation %s), en une opération",
    (snap) => {
      const editor = useEditor.getState();
      useEditor.setState({ snap, color: "#ef4444" });
      for (const type of Object.keys(CATALOG) as (keyof typeof CATALOG)[]) {
        const before = useEditor.getState().scene;
        const historyLength = useEditor.getState().past.length;
        editor.add(type);
        const { scene, selection, past } = useEditor.getState();
        expectFreeCopies(before, scene, selection);
        const added = scene.nodes.find((n) => n.id === selection[0]) as Part;
        expect(added.type).toBe(type);
        expect(added.color).toBe("#ef4444");
        expect(added.position[1]).toBe(0);
        if (!before.nodes.length) expect(added.position).toEqual([0, 0, 0]);
        expect(scene.nodes.slice(0, -1)).toEqual(before.nodes);
        expect(past).toHaveLength(historyLength + 1);
        editor.undo();
        expect(useEditor.getState().scene).toEqual(before);
        editor.redo();
        expect(useEditor.getState().scene).toEqual(scene);
      }
    },
  );
  it("évite les enfants d’un groupe tourné, masqué et verrouillé lors de l’ajout", () => {
    const obstacle = makePart("brick-2x4", "#4079e8");
    let scene = group(
      { ...emptyScene(), nodes: [obstacle] },
      [obstacle.id],
      "assembly",
    );
    scene = applyDelta(
      scene,
      ["assembly"],
      new Matrix4().makeRotationY(Math.PI / 4),
    );
    const assembly = scene.nodes.find((n) => n.id === "assembly")!;
    assembly.hidden = true;
    assembly.locked = true;
    useEditor.getState().load(scene, "Test");
    useEditor.getState().add("plate-2x4");
    const after = useEditor.getState();
    expectFreeCopies(scene, after.scene, after.selection);
  });
  it("ne crée ni pièce ni historique lorsque la limite d’ajout est atteinte", () => {
    const part = makePart("brick-1x1", "#4079e8");
    const scene = {
      ...emptyScene(),
      nodes: Array.from({ length: 500 }, (_, i) => ({
        ...part,
        id: String(i),
      })),
    };
    const editor = useEditor.getState();
    editor.load(scene, "Test");
    expect(() => editor.add("brick-2x2")).toThrow("500");
    expect(useEditor.getState().scene).toEqual(scene);
    expect(useEditor.getState().past).toHaveLength(0);
    expect(useEditor.getState().selection).toEqual([]);
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

it("décrit les plots visés dans le repère mondial d’une cible tournée", async () => {
  const { snapCandidate } = await import("@clik/scene");
  const target = makePart("brick-2x2", "#ef4444", [2, 3, 4]);
  target.rotation = [0.4, 0.2, 0.1];
  const scene = { ...emptyScene(), nodes: [target] };
  const top = new Vector3(0, 1.2, 0).applyMatrix4(
    worldMatrix(scene, target.id),
  );
  const p = makePart(
    "brick-2x2",
    "#4079e8",
    top.clone().addScalar(0.1).toArray(),
  );
  p.rotation = [...target.rotation];
  const preview = snapCandidate(scene, p, true);
  expect(preview.kind).toBe("attachment");
  expect(preview.targetId).toBe(target.id);
  expect(preview.points).toHaveLength(4);
  const inverse = worldMatrix(scene, target.id).invert();
  for (const point of preview.points)
    expect(new Vector3(...point).applyMatrix4(inverse).y).toBeCloseTo(1.2, 8);
  expect(snapCandidate(scene, p, false).kind).toBe("none");
  expect(snapCandidate(emptyScene(), p, true).points).toEqual([]);
});

it("utilise la pièce saisie comme référence et ignore les autres pièces déplacées", async () => {
  const { previewSelection } = await import("@clik/scene");
  const a = makePart("brick-1x1", "#4079e8", [7.1, 1.3, 0]);
  const b = makePart("brick-1x1", "#4079e8", [0.1, 1.3, 0]);
  const target = makePart("brick-1x1", "#ef4444");
  const scene = group(
    { ...emptyScene(), nodes: [a, b, target] },
    [a.id, b.id],
    "g",
  );
  const preview = previewSelection(scene, ["g"], true, b.id);
  expect(preview.targetId).toBe(target.id);
  expect(
    new Vector3().setFromMatrixPosition(worldMatrix(preview.scene, b.id)).y,
  ).toBeCloseTo(1.2);
  expect(
    new Vector3().setFromMatrixPosition(worldMatrix(preview.scene, a.id)).x,
  ).toBeCloseTo(7);
  expect(previewSelection(scene, ["g", target.id], true, b.id).kind).toBe(
    "grid",
  );
});

it("dépose exactement l’aperçu, sans sérialiser les étapes ni ajouter d’historique pour un clic", () => {
  const s = useEditor.getState();
  s.load(emptyScene(), "Test");
  useEditor.setState({ snap: true });
  s.add("brick-1x1");
  const past = useEditor.getState().past.length;
  s.begin();
  s.end();
  expect(useEditor.getState().past).toHaveLength(past);
  s.begin();
  s.preview(new Matrix4().makeTranslation(2.3, 0, 0.2));
  const candidate = useEditor.getState().snapPreview!.scene;
  expect(useEditor.getState().serial).toBe(1);
  expect(useEditor.getState().scene.nodes[0].position[0]).toBeCloseTo(2.3);
  s.end();
  expect(useEditor.getState().scene).toBe(candidate);
  expect(useEditor.getState().past).toHaveLength(past + 1);
  expect(useEditor.getState().snapPreview).toBeNull();
  s.begin();
  s.preview(new Matrix4().makeTranslation(3, 0, 0));
  s.cancel();
  expect(useEditor.getState().scene).toBe(candidate);
  expect(useEditor.getState().past).toHaveLength(past + 1);
});

it("préserve les branches verrouillées et déplace les autres racines sélectionnées", () => {
  const s = useEditor.getState();
  const locked = { ...makePart("brick-1x1", "#4079e8"), locked: true };
  const free = makePart("brick-1x1", "#ef4444", [3, 0, 0]);
  const scene = group(
    { ...emptyScene(), nodes: [locked, free] },
    [locked.id],
    "locked-group",
  );
  s.load(scene, "Test");
  useEditor.setState({ selection: ["locked-group", free.id], snap: false });
  s.begin(free.id);
  s.preview(new Matrix4().makeTranslation(2, 0, 0));
  s.end();
  close(
    worldMatrix(useEditor.getState().scene, locked.id),
    worldMatrix(scene, locked.id),
  );
  expect(
    useEditor.getState().scene.nodes.find((n) => n.id === free.id)!.position[0],
  ).toBe(5);
});
