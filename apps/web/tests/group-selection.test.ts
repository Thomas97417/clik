import { beforeEach, describe, expect, it } from "vitest";
import {
  descendants,
  emptyScene,
  group,
  makePart,
  worldMatrix,
} from "@clik/scene";
import { useEditor } from "../src/lib/clik/store";

beforeEach(() => {
  useEditor.getState().load(emptyScene(), "Sélection");
});

function setup() {
  const a = makePart("brick-1x1", "#4079e8");
  const b = makePart("brick-1x1", "#ef4444", [3, 0, 0]);
  const c = makePart("brick-1x1", "#41a66b", [6, 0, 0]);
  const d = makePart("brick-1x1", "#9b7653", [9, 0, 0]);
  const scene = group(
    { ...emptyScene(), nodes: [a, b, c, d] },
    [a.id, b.id],
    "pair",
  );
  const editor = useEditor.getState();
  editor.load(scene, "Sélection");
  return { a, b, c, d, scene, editor };
}

describe("Sélection automatique des groupes complets", () => {
  it("sélectionne le groupe au dernier clic et conserve la couleur de cette pièce, sans modifier le projet", () => {
    const { a, b, scene, editor } = setup();
    editor.select(a.id);
    expect(useEditor.getState().selection).toEqual([a.id]);
    editor.select(b.id, true);
    const state = useEditor.getState();
    expect(state.selection).toEqual(["pair"]);
    expect(descendants(state.scene, state.selection)).toEqual([
      a.id,
      b.id,
      "pair",
    ]);
    expect(state.color).toBe(b.color);
    expect(state.scene).toEqual(scene);
    expect(state.past).toHaveLength(0);
    expect(state.serial).toBe(0);
  });

  it("reconnaît plusieurs groupes dans un cadre et garde les pièces extérieures séparées", () => {
    const { a, b, c, d, scene, editor } = setup();
    const other = makePart("brick-1x1", "#123abc", [12, 0, 0]);
    const next = group(
      { ...scene, nodes: [...scene.nodes, other] },
      [c.id, d.id],
      "other-pair",
    );
    editor.load(next, "Deux groupes");
    editor.selectMany([a.id, c.id, b.id, d.id, other.id]);
    expect(useEditor.getState().selection).toEqual([
      "pair",
      "other-pair",
      other.id,
    ]);
    expect(useEditor.getState().color).toBe(other.color);
    editor.selectMany(["pair", a.id, b.id, a.id]);
    expect(useEditor.getState().selection).toEqual(["pair"]);
  });

  it("complète un groupe avec un cadre ajouté à la sélection existante", () => {
    const { a, b, c, editor } = setup();
    editor.select(c.id);
    editor.selectMany([a.id], true);
    expect(useEditor.getState().selection).toEqual([c.id, a.id]);
    editor.selectMany([b.id], true);
    expect(useEditor.getState().selection).toEqual([c.id, "pair"]);
    expect(useEditor.getState().color).toBe(b.color);
    editor.selectMany([c.id]);
    expect(useEditor.getState().selection).toEqual([c.id]);
  });

  it("remonte les groupes imbriqués seulement lorsque chacun est complet", () => {
    const { a, b, c, d, scene, editor } = setup();
    editor.load(group(scene, ["pair", c.id], "outer"), "Imbriqués");
    editor.selectMany([a.id, b.id, d.id]);
    expect(useEditor.getState().selection).toEqual(["pair", d.id]);
    editor.select(c.id, true);
    expect(useEditor.getState().selection).toEqual(["outer", d.id]);
    expect(useEditor.getState().color).toBe(c.color);
  });

  it("reconnaît aussi les groupes qui ne contiennent qu’une seule pièce", () => {
    const a = makePart("brick-1x1", "#ef4444");
    const scene = group(
      group({ ...emptyScene(), nodes: [a] }, [a.id], "inner"),
      ["inner"],
      "outer",
    );
    const editor = useEditor.getState();
    editor.load(scene, "Une pièce");
    editor.select(a.id);
    expect(useEditor.getState().selection).toEqual(["outer"]);
    expect(useEditor.getState().color).toBe(a.color);
  });

  it("permet de cibler explicitement un sous-groupe dans la liste pour modifier ses propriétés", () => {
    const { a, b, scene, editor } = setup();
    editor.load(group(scene, ["pair"], "outer"), "Sous-groupe");
    editor.selectMany([a.id, b.id]);
    expect(useEditor.getState().selection).toEqual(["outer"]);
    editor.select("pair");
    expect(useEditor.getState().selection).toEqual(["pair"]);
    expect(useEditor.getState().past).toHaveLength(0);
  });

  it.each(["scène", "liste"])(
    "Maj dans la %s retire une pièce et garde les autres, puis rétablit le groupe si on la reprend",
    (source) => {
      const { a, b, c, d, scene, editor } = setup();
      editor.load(group(scene, ["pair", c.id], "outer"), "Imbriqués");
      editor.selectMany([a.id, b.id, c.id, d.id]);
      expect(useEditor.getState().selection).toEqual(["outer", d.id]);
      if (source === "scène") editor.deselect(a.id);
      else editor.select(a.id, true);
      expect(new Set(useEditor.getState().selection)).toEqual(
        new Set([b.id, c.id, d.id]),
      );
      editor.select(a.id, true);
      expect(useEditor.getState().selection).toEqual(["outer", d.id]);
      expect(useEditor.getState().color).toBe(a.color);
      expect(useEditor.getState().past).toHaveLength(0);
    },
  );

  it("permet de retirer une branche entière d’un groupe sélectionné", () => {
    const { a, b, c, d, scene, editor } = setup();
    editor.load(group(scene, ["pair", c.id], "outer"), "Imbriqués");
    editor.selectMany([a.id, b.id, c.id, d.id]);
    editor.select("pair", true);
    expect(useEditor.getState().selection).toEqual([c.id, d.id]);
    editor.select("pair", true);
    expect(useEditor.getState().selection).toEqual(["outer", d.id]);
    editor.select("outer", true);
    expect(useEditor.getState().selection).toEqual([d.id]);
  });

  it("ne sélectionne pas indirectement une pièce masquée dans un cadre", () => {
    const { a, b, scene, editor } = setup();
    scene.nodes.find((node) => node.id === b.id)!.hidden = true;
    editor.load(scene, "Masquée");
    editor.selectMany([a.id, b.id]);
    expect(useEditor.getState().selection).toEqual([a.id]);
    // Hidden pieces remain available when explicitly selected in the tree.
    editor.select(b.id, true);
    expect(useEditor.getState().selection).toEqual(["pair"]);
  });

  it("ne sélectionne pas spontanément les groupes vides ou les identifiants absents", () => {
    const part = makePart("brick-1x1", "#4079e8");
    const scene = group({ ...emptyScene(), nodes: [part] }, [], "empty");
    const editor = useEditor.getState();
    editor.load(scene, "Vide");
    editor.selectMany([]);
    expect(useEditor.getState().selection).toEqual([]);
    editor.select("missing");
    expect(useEditor.getState().selection).toEqual([]);
    editor.select(part.id);
    expect(useEditor.getState().selection).toEqual([part.id]);
    editor.select("empty", true);
    expect(useEditor.getState().selection).toEqual([part.id, "empty"]);
  });

  it("ignore les sous-groupes vides pour reconnaître un groupe dont toutes les pièces sont sélectionnées", () => {
    const { a, b, scene, editor } = setup();
    const withEmpty = group(scene, [], "empty");
    const nestedEmpty = group(withEmpty, ["empty"], "empty-wrapper");
    editor.load(
      group(nestedEmpty, ["pair", "empty-wrapper"], "outer"),
      "Branche vide",
    );
    editor.selectMany([]);
    expect(useEditor.getState().selection).toEqual([]);
    editor.selectMany([a.id]);
    expect(useEditor.getState().selection).toEqual([a.id]);
    editor.selectMany([b.id], true);
    expect(useEditor.getState().selection).toEqual(["outer"]);
    editor.deselect(a.id);
    expect(useEditor.getState().selection).not.toContain("outer");
    expect(useEditor.getState().selection).toContain(b.id);
  });

  it("déplace chaque pièce une seule fois et duplique l’assemblage complet", () => {
    const { a, b, c, scene, editor } = setup();
    editor.selectMany([a.id, b.id]);
    editor.nudge([0, 0, 1]);
    const moved = useEditor.getState().scene;
    for (const part of [a, b]) {
      const before = worldMatrix(scene, part.id).elements;
      const after = worldMatrix(moved, part.id).elements;
      expect(after[12]).toBeCloseTo(before[12]);
      expect(after[13]).toBeCloseTo(before[13]);
      expect(after[14]).toBeCloseTo(before[14] + 1);
    }
    expect(worldMatrix(moved, c.id)).toEqual(worldMatrix(scene, c.id));
    expect(useEditor.getState().past).toHaveLength(1);
    editor.duplicate();
    const state = useEditor.getState();
    expect(state.selection).toHaveLength(1);
    const copies = state.scene.nodes.filter((node) =>
      descendants(state.scene, state.selection).includes(node.id),
    );
    expect(copies.filter((node) => node.kind === "group")).toHaveLength(1);
    expect(copies.filter((node) => node.kind === "part")).toHaveLength(2);
    editor.undo();
    expect(useEditor.getState().scene).toEqual(moved);
    editor.undo();
    expect(useEditor.getState().scene).toEqual(scene);
  });
});
