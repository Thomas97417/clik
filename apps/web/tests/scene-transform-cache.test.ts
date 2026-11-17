import { describe, expect, it } from "vitest";
import { Matrix4 } from "three";
import {
  ancestors,
  emptyScene,
  group,
  inherited,
  makePart,
  worldMatrix,
} from "@clik/scene";

describe("transformations réutilisées", () => {
  it("ne laisse pas une inversion du résultat corrompre les matrices suivantes", () => {
    const part = makePart("brick-1x1", "#4079e8", [1, 2, 3]);
    const scene = group({ ...emptyScene(), nodes: [part] }, [part.id], "g");
    const expected = worldMatrix(scene, part.id).clone();
    worldMatrix(scene, part.id)
      .invert()
      .multiply(new Matrix4().makeTranslation(9, 9, 9));
    expect(worldMatrix(scene, part.id).elements).toEqual(expected.elements);
  });

  it("invalide les descendants quand un ancêtre change, sans altérer l’ancien document", () => {
    const part = makePart("brick-1x1", "#4079e8", [1, 2, 3]);
    const before = group(
      group({ ...emptyScene(), nodes: [part] }, [part.id], "inner"),
      ["inner"],
      "outer",
    );
    const expected = worldMatrix(before, part.id);
    const after = {
      ...before,
      nodes: before.nodes.map((n) =>
        n.id === "outer"
          ? { ...n, position: [7, 0, 0] as [number, number, number] }
          : n,
      ),
    };
    const moved = new Matrix4().makeTranslation(7, 0, 0).multiply(expected);
    expect(worldMatrix(after, part.id).elements).toEqual(moved.elements);
    expect(worldMatrix(before, part.id).elements).toEqual(expected.elements);
    expect(worldMatrix(after, part.id).elements).toEqual(moved.elements);
  });

  it("supporte aussi les changements en place des coordonnées, parents, flags et de l’ordre", () => {
    const part = makePart("brick-1x1", "#4079e8");
    const scene = group({ ...emptyScene(), nodes: [part] }, [part.id], "g");
    worldMatrix(scene, part.id);
    const parent = scene.nodes.find((n) => n.id === "g")!;
    parent.position[0] = 7;
    expect(worldMatrix(scene, part.id).elements[12]).toBe(7);
    parent.hidden = true;
    parent.locked = true;
    expect(inherited(scene, part.id, "hidden")).toBe(true);
    expect(inherited(scene, part.id, "locked")).toBe(true);
    scene.nodes.reverse();
    expect(worldMatrix(scene, part.id).elements[12]).toBe(7);
    const child = scene.nodes.find((n) => n.id === part.id)!;
    child.parentId = null;
    expect(worldMatrix(scene, part.id).elements[12]).toBe(0);
    expect(ancestors(scene, part.id)).toEqual([]);
    expect(inherited(scene, part.id, "hidden")).toBe(false);
    const added = makePart("brick-1x1", "#4079e8", [4, 0, 0]);
    scene.nodes.push(added);
    expect(worldMatrix(scene, added.id).elements[12]).toBe(4);
  });
});
