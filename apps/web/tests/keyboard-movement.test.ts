import { beforeEach, describe, expect, it } from "vitest";
import {
  emptyScene,
  group,
  makePart,
  stepSelection,
  transform,
  worldMatrix,
} from "@clik/scene";
import { useEditor } from "../src/lib/clik/store";

beforeEach(() => {
  useEditor.getState().load(emptyScene(), "Clavier");
  useEditor.setState({ snap: true });
});
describe("Déplacement par pas de grille", () => {
  it("conserve rotation et décalage de grille sans aimantation, avec annuler/rétablir", () => {
    const part = makePart("brick-1x1", "#4079e8", [0.5, 0, 0.5]);
    part.rotation = [0, Math.PI / 2, 0];
    const s = useEditor.getState();
    s.load({ ...emptyScene(), nodes: [part] }, "Clavier");
    s.select(part.id);
    useEditor.setState({ snap: false });
    s.nudge([1, 0, 0]);
    s.nudge([0, 0.4, 0]);
    const moved = useEditor.getState().scene.nodes[0];
    expect(moved.position).toEqual([1.5, 0.4, 0.5]);
    expect(moved.rotation[1]).toBeCloseTo(Math.PI / 2);
    expect(useEditor.getState().past).toHaveLength(2);
    s.undo();
    expect(useEditor.getState().scene.nodes[0].position).toEqual([1.5, 0, 0.5]);
    s.redo();
    expect(useEditor.getState().scene.nodes[0].position).toEqual([
      1.5, 0.4, 0.5,
    ]);
  });
  it("déplace un groupe tourné et un enfant sélectionnés une seule fois dans les axes mondiaux", () => {
    const a = makePart("brick-1x1", "#4079e8");
    const b = makePart("brick-1x1", "#4079e8", [3, 0, 0]);
    const scene = group(
      { ...emptyScene(), nodes: [a, b] },
      [a.id, b.id],
      "group",
    );
    scene.nodes.find((n) => n.id === "group")!.rotation = [0, Math.PI / 2, 0];
    const next = stepSelection(scene, ["group", a.id], [1, 0, -1]);
    for (const p of [a, b]) {
      const before = transform(worldMatrix(scene, p.id));
      const after = transform(worldMatrix(next, p.id));
      expect(after.position[0]).toBeCloseTo(before.position[0] + 1);
      expect(after.position[2]).toBeCloseTo(before.position[2] - 1);
      expect(after.rotation).toEqual(before.rotation);
    }
    const childOnly = stepSelection(scene, [a.id], [1, 0, 0]);
    expect(transform(worldMatrix(childOnly, a.id)).position[0]).toBeCloseTo(
      transform(worldMatrix(scene, a.id)).position[0] + 1,
    );
    expect(worldMatrix(childOnly, b.id)).toEqual(worldMatrix(scene, b.id));
  });
  it("bloque les destinations occupées et le sol sans historique, et accepte le contact d’empilement", () => {
    const a = makePart("plate-1x1", "#4079e8", [0.5, 0.4, 0.5]);
    const b = makePart("plate-1x1", "#4079e8", [1.5, 0.4, 0.5]);
    b.hidden = true;
    const s = useEditor.getState();
    s.load({ ...emptyScene(), nodes: [a, b] }, "Clavier");
    s.select(a.id);
    s.nudge([1, 0, 0]);
    expect(useEditor.getState().past).toHaveLength(0);
    s.nudge([0, -0.4, 0]);
    const atFloor = useEditor.getState().scene;
    s.nudge([0, -0.4, 0]);
    expect(useEditor.getState().scene).toBe(atFloor);
    expect(useEditor.getState().past).toHaveLength(1);
    s.nudge([1, 0, 0]);
    expect(useEditor.getState().scene.nodes[0].position).toEqual([1.5, 0, 0.5]);
    s.nudge([0, 0.4, 0]);
    expect(useEditor.getState().scene.nodes[0].position).toEqual([1.5, 0, 0.5]);
  });
  it("respecte les branches verrouillées et déplace les autres racines sélectionnées", () => {
    const a = makePart("brick-1x1", "#4079e8");
    const b = makePart("brick-1x1", "#4079e8", [4, 0, 0]);
    a.locked = true;
    const scene = group(
      { ...emptyScene(), nodes: [a, b] },
      [a.id],
      "locked-group",
    );
    const next = stepSelection(scene, ["locked-group", b.id], [0, 0, 1]);
    expect(worldMatrix(next, a.id)).toEqual(worldMatrix(scene, a.id));
    expect(next.nodes.find((n) => n.id === b.id)!.position).toEqual([4, 0, 1]);
    expect(stepSelection(scene, ["locked-group"], [1, 0, 0])).toBe(scene);
  });
  it("ignore les collisions étrangères à la sélection et protège les pièces inclinées du sol", () => {
    const a = makePart("brick-1x1", "#4079e8", [0, 1, 0]);
    a.rotation = [Math.PI / 2, 0, 0];
    const b = makePart("brick-1x1", "#4079e8", [10, 0, 0]);
    const c = makePart("brick-1x1", "#4079e8", [10, 0, 0]);
    const scene = { ...emptyScene(), nodes: [a, b, c] };
    const next = stepSelection(scene, [a.id], [0, -0.4, 0]);
    expect(next).not.toBe(scene);
    expect(stepSelection(next, [a.id], [0, -0.4, 0])).toBe(next);
  });
  it("ne perturbe pas un glisser-déplacer et respecte la clôture du défi", () => {
    const a = makePart("brick-1x1", "#4079e8");
    const s = useEditor.getState();
    s.load({ ...emptyScene(), nodes: [a] }, "Clavier");
    s.select(a.id);
    s.begin(a.id);
    const before = useEditor.getState().scene;
    s.nudge([1, 0, 0]);
    expect(useEditor.getState().scene).toBe(before);
    s.cancel();
    useEditor.setState({
      challenge: {
        closesAt: Date.now() - 1000,
        serverOffset: 0,
        stock: [{ type: a.type, quantity: 1 }],
      },
    });
    expect(() => s.nudge([1, 0, 0])).toThrow("clos");
    expect(useEditor.getState().scene).toBe(before);
    expect(useEditor.getState().past).toHaveLength(0);
  });
});
