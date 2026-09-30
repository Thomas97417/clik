import { describe, expect, it } from "vitest";
import {
  emptyScene,
  group,
  makePart,
  worldMatrix,
  type SceneDocument,
} from "@clik/scene";
import { useEditor } from "../src/lib/clik/store";

function setup() {
  const a = makePart("brick-1x1", "#4079e8", [3, 0, 0]);
  const b = makePart("brick-2x2", "#ef4444", [-3, 0, 0]);
  const support = makePart("brick-2x2", "#4079e8");
  const scene = group(
    { ...emptyScene(), nodes: [a, b, support] },
    [support.id],
    "target",
  );
  const target = scene.nodes.find((n) => n.id === "target")!;
  target.position = [6, 2, -3];
  target.rotation = [0.2, 0.7, -0.4];
  const store = useEditor.getState();
  store.load(scene, "Réorganisation");
  useEditor.setState({ selection: [b.id, a.id] });
  return { a, b, support, scene, store };
}
function expectWorldUnchanged(before: SceneDocument, after: SceneDocument) {
  for (const node of before.nodes) {
    const matrix = worldMatrix(after, node.id);
    worldMatrix(before, node.id).elements.forEach((n, i) =>
      expect(matrix.elements[i]).toBeCloseTo(n, 8),
    );
  }
}

describe("réorganisation de la sélection", () => {
  it("déplace toutes les pièces vers un groupe tourné, en une seule opération annulable", () => {
    const { a, b, scene, store } = setup();
    store.reparent(a.id, "target");
    const after = useEditor.getState();
    for (const id of [a.id, b.id])
      expect(after.scene.nodes.find((n) => n.id === id)!.parentId).toBe(
        "target",
      );
    expect(after.selection).toEqual([b.id, a.id]);
    expectWorldUnchanged(scene, after.scene);
    expect(after.past).toHaveLength(1);
    store.undo();
    expect(useEditor.getState().scene).toEqual(scene);
    store.redo();
    expect(useEditor.getState().scene).toEqual(after.scene);
  });
  it("déplace un groupe et ses descendants sélectionnés une seule fois", () => {
    const { a, b, scene, store } = setup();
    const nested = group(scene, [a.id], "nested");
    store.load(nested, "Groupe");
    useEditor.setState({ selection: ["nested", a.id, b.id] });
    store.reparent(a.id, "target");
    const after = useEditor.getState().scene;
    expect(after.nodes.find((n) => n.id === a.id)!.parentId).toBe("nested");
    expect(after.nodes.find((n) => n.id === "nested")!.parentId).toBe("target");
    expect(after.nodes.find((n) => n.id === b.id)!.parentId).toBe("target");
    expectWorldUnchanged(nested, after);
  });
  it("réordonne la sélection comme un bloc et permet son retour à la racine", () => {
    const { a, b, support, scene, store } = setup();
    store.reparent(a.id, "target", support.id);
    expect(
      useEditor
        .getState()
        .scene.nodes.filter((n) => n.parentId === "target")
        .map((n) => n.id),
    ).toEqual([a.id, b.id, support.id]);
    store.reparent(b.id, null);
    const after = useEditor.getState();
    for (const id of [a.id, b.id])
      expect(after.scene.nodes.find((n) => n.id === id)!.parentId).toBeNull();
    expectWorldUnchanged(scene, after.scene);
  });
  it("une pièce extérieure à la sélection se déplace seule", () => {
    const { a, b, store } = setup();
    useEditor.setState({ selection: [b.id] });
    store.reparent(a.id, "target");
    expect(
      useEditor.getState().scene.nodes.find((n) => n.id === a.id)!.parentId,
    ).toBe("target");
    expect(
      useEditor.getState().scene.nodes.find((n) => n.id === b.id)!.parentId,
    ).toBeNull();
  });
  it("place les branches tout en bas, même si leur parent ne change pas", () => {
    const { a, b, scene, store } = setup();
    store.reparent(a.id, null);
    const after = useEditor.getState();
    expect(
      after.scene.nodes.filter((n) => !n.parentId).map((n) => n.id),
    ).toEqual(["target", a.id, b.id]);
    expectWorldUnchanged(scene, after.scene);
    expect(after.past).toHaveLength(1);
    store.reparent(a.id, null);
    expect(useEditor.getState().past).toHaveLength(1);
  });
  it("range à la fin d’un groupe sans créer d’historique pour un ordre identique", () => {
    const { a, b, support, store } = setup();
    store.reparent(a.id, "target", support.id);
    store.reparent(a.id, "target");
    const after = useEditor.getState();
    expect(
      after.scene.nodes.filter((n) => n.parentId === "target").map((n) => n.id),
    ).toEqual([support.id, a.id, b.id]);
    expect(after.past).toHaveLength(2);
    // The global array also contains the group header, which is not a sibling.
    store.reparent(a.id, "target");
    expect(useEditor.getState().past).toHaveLength(2);
  });
  it("respecte le verrouillage des pièces sélectionnées et du groupe cible", () => {
    const { a, b, scene, store } = setup();
    scene.nodes.find((n) => n.id === b.id)!.locked = true;
    store.load(scene, "Verrouillage");
    useEditor.setState({ selection: [b.id, a.id] });
    store.reparent(a.id, "target");
    expect(
      useEditor.getState().scene.nodes.find((n) => n.id === a.id)!.parentId,
    ).toBe("target");
    expect(
      useEditor.getState().scene.nodes.find((n) => n.id === b.id)!.parentId,
    ).toBeNull();
    const original = structuredClone(scene);
    original.nodes.find((n) => n.id === "target")!.locked = true;
    store.load(original, "Cible verrouillée");
    useEditor.setState({ selection: [a.id, b.id] });
    store.reparent(a.id, "target");
    expect(useEditor.getState().past).toHaveLength(0);
    expect(useEditor.getState().scene).toEqual(original);
  });
  it("refuse un cycle sans déplacer partiellement la sélection", () => {
    const { a, scene, store } = setup();
    useEditor.setState({ selection: [a.id, "target"] });
    expect(() => store.reparent(a.id, "target")).toThrow();
    expect(useEditor.getState().scene).toEqual(scene);
    expect(useEditor.getState().past).toHaveLength(0);
  });
});
