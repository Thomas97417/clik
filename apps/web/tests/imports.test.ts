import { beforeEach, describe, expect, it } from "vitest";
import { Box3, Matrix4, Vector3 } from "three";
import {
  CATALOG,
  emptyScene,
  group,
  importAssembly,
  makePart,
  worldMatrix,
  type Part,
  type SceneDocument,
} from "@clik/scene";
import { useEditor } from "../src/lib/clik/store";
const bounds = (scene: SceneDocument, part: Part) => {
  const { w, h, d } = CATALOG[part.type];
  return new Box3(
    new Vector3(-w / 2, 0, -d / 2),
    new Vector3(w / 2, h + 0.2, d / 2),
  ).applyMatrix4(worldMatrix(scene, part.id));
};
const source = () => ({
  ...emptyScene(),
  nodes: [makePart("brick-2x4", "#4079e8")],
});
beforeEach(() => useEditor.getState().load(emptyScene(), "Destination"));

describe("Import de projets dans la construction", () => {
  it("conserve un assemblage tourné et imbriqué, au sol et hors des obstacles", () => {
    const a = makePart("slope-2x2", "#4079e8", [3, 4, 5]);
    a.name = "Pente";
    const b = makePart("plate-2x4", "#f8cc36", [-3, 5, 2]);
    b.name = "Plaque";
    b.hidden = true;
    b.locked = true;
    let from = group({ ...emptyScene(), nodes: [a, b] }, [a.id], "inner");
    from = group(from, ["inner", b.id], "outer");
    from.nodes.find((n) => n.id === "outer")!.rotation = [0.2, 0.7, 0.1];
    const snapshot = structuredClone(from);
    const obstacle = makePart("brick-2x4", "#ef4444");
    obstacle.hidden = true;
    obstacle.locked = true;
    const into = { ...emptyScene(), nodes: [obstacle] };
    const result = importAssembly(into, from, "Mon modèle");
    expect(from).toEqual(snapshot);
    expect(result.scene.nodes.slice(0, into.nodes.length)).toEqual(into.nodes);
    expect(new Set(result.scene.nodes.map((n) => n.id)).size).toBe(
      result.scene.nodes.length,
    );
    let delta: Matrix4 | undefined;
    const assemblyBounds = new Box3();
    for (const original of [a, b]) {
      const copy = result.scene.nodes.find(
        (n): n is Part => n.kind === "part" && n.name === original.name,
      )!;
      const matrix = worldMatrix(result.scene, copy.id);
      delta ??= matrix
        .clone()
        .multiply(worldMatrix(from, original.id).invert());
      const expected = delta.clone().multiply(worldMatrix(from, original.id));
      matrix.elements.forEach((value, i) =>
        expect(value).toBeCloseTo(expected.elements[i], 8),
      );
      expect(copy.color).toBe(original.color);
      expect(copy.hidden).toBe(original.hidden);
      expect(copy.locked).toBe(original.locked);
      expect(
        bounds(result.scene, copy).intersectsBox(bounds(into, obstacle)),
      ).toBe(false);
      assemblyBounds.union(bounds(result.scene, copy));
    }
    expect(assemblyBounds.min.y).toBeCloseTo(0, 8);
  });
  it("importe plusieurs fois avec des noms distincts et une seule opération d’historique", () => {
    const item = {
      id: "import-1",
      title: "Maison",
      receiptIds: ["receipt"],
      sources: [
        {
          publicationId: "A",
          versionId: "vA",
          title: "Original",
          author: "Alice",
        },
      ],
    };
    const editor = useEditor.getState();
    editor.importProject(source(), item);
    expect(useEditor.getState().past).toHaveLength(1);
    const first = useEditor.getState().scene;
    editor.undo();
    expect(useEditor.getState().scene.nodes).toHaveLength(0);
    expect(useEditor.getState().provenance.imports).toEqual([]);
    editor.redo();
    expect(useEditor.getState().scene).toEqual(first);
    expect(useEditor.getState().provenance.imports).toEqual([item]);
    editor.importProject(source(), { ...item, id: "import-2" });
    expect(
      useEditor
        .getState()
        .scene.nodes.filter((n) => n.kind === "group")
        .map((n) => n.name),
    ).toEqual(["Maison", "Maison (2)"]);
    const importedParts = useEditor
      .getState()
      .scene.nodes.filter((n): n is Part => n.kind === "part");
    expect(
      bounds(useEditor.getState().scene, importedParts[0]).intersectsBox(
        bounds(useEditor.getState().scene, importedParts[1]),
      ),
    ).toBe(false);
  });
  it("conserve les attributions après dissociation et suppression", () => {
    const editor = useEditor.getState();
    editor.importProject(source(), {
      id: "import",
      title: "Maison",
      receiptIds: [],
      sources: [],
    });
    editor.ungroup();
    editor.selectAll();
    editor.remove();
    expect(useEditor.getState().scene.nodes).toHaveLength(0);
    expect(useEditor.getState().provenance.imports).toHaveLength(1);
  });
  it("refuse atomiquement les projets vides, les limites dépassées et les ateliers de défi", () => {
    const editor = useEditor.getState(),
      item = { id: "import", title: "Maison", receiptIds: [], sources: [] };
    expect(() => editor.importProject(emptyScene(), item)).toThrow(
      "aucune pièce",
    );
    const full = {
      ...emptyScene(),
      nodes: Array.from({ length: 500 }, (_, i) =>
        makePart("brick-2x2", "#4079e8", [i * 3, 0, 0]),
      ),
    };
    editor.load(full, "Plein");
    expect(() => editor.importProject(source(), item)).toThrow("500 pièces");
    expect(useEditor.getState().scene).toEqual(full);
    expect(useEditor.getState().past).toHaveLength(0);
    expect(useEditor.getState().provenance.imports).toHaveLength(0);
    const groups = {
      ...emptyScene(),
      nodes: Array.from({ length: 1000 }, (_, i) => ({
        id: `group-${i}`,
        kind: "group" as const,
        name: "Groupe",
        parentId: null,
        position: [0, 0, 0] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        hidden: false,
        locked: false,
      })),
    };
    expect(() => importAssembly(groups, source(), "Projet")).toThrow();
    editor.load(emptyScene(), "Défi", {
      stock: [],
      closesAt: Date.now() + 10000,
      serverOffset: 0,
    });
    expect(() => editor.importProject(source(), item)).toThrow("atelier libre");
  });
});
