import { describe, expect, it } from "vitest";
import { Color } from "three";
import { emptyScene, group, makePart, type SceneNode } from "@clik/scene";
import {
  PART_PREVIEW_COLOR,
  partPreviewColorMatrix,
} from "../src/lib/clik/part-preview-color";
import { sceneLayoutKey } from "../src/lib/clik/scene-layout";

describe("Miniatures recolorées sans nouveau rendu 3D", () => {
  it.each(["#4079e8", "#f2e8d5", "#8b5e3c", "#000000", "#ffffff", "#A16B45"])(
    "restitue la couleur %s en conservant la transparence et les ombres",
    (color) => {
      const coefficients = partPreviewColorMatrix(color).split(" ").map(Number);
      expect(coefficients).toHaveLength(20);
      const reference = new Color(PART_PREVIEW_COLOR);
      const apply = (pixel: number[]) =>
        [0, 1, 2, 3].map((channel) =>
          coefficients
            .slice(channel * 5, channel * 5 + 5)
            .reduce((sum, value, i) => sum + value * (pixel[i] ?? 1), 0),
        );
      const expected = new Color(color);
      const result = apply([reference.r, reference.g, reference.b, 0.35]);
      result
        .slice(0, 3)
        .forEach((value, i) =>
          expect(value).toBeCloseTo(
            [expected.r, expected.g, expected.b][i],
            10,
          ),
        );
      expect(result[3]).toBe(0.35);
      expect(apply([0, 0, 0, 0])).toEqual([0, 0, 0, 0]);
      const shadow = apply([
        reference.r / 2,
        reference.g / 2,
        reference.b / 2,
        1,
      ]);
      shadow
        .slice(0, 3)
        .forEach((value, i) => expect(value).toBeCloseTo(result[i] / 2, 10));
    },
  );
});

describe("Disposition physique de la scène", () => {
  const part = makePart("brick-1x1", "#4079e8");
  const scene = group(
    { ...emptyScene(), nodes: [part] },
    [part.id],
    "assembly",
  );
  it("réutilise les calculs physiques après des changements de couleur, de nom ou de présentation", () => {
    const recolored = {
      ...scene,
      nodes: scene.nodes.map((node) => ({
        ...node,
        name: "Renommé",
        hidden: true,
        locked: true,
        ...(node.kind === "part" ? { color: "#a16b45" } : {}),
      })),
    };
    expect(sceneLayoutKey(recolored)).toBe(sceneLayoutKey(scene));
  });
  it.each([
    { position: [4, 0, 0] },
    { rotation: [0, Math.PI / 2, 0] },
    { parentId: null },
    { type: "plate-1x1" },
  ])("invalide les calculs physiques lorsque la pièce change : %j", (patch) => {
    const changed = {
      ...scene,
      nodes: scene.nodes.map((node) =>
        node.id === part.id ? ({ ...node, ...patch } as SceneNode) : node,
      ),
    };
    expect(sceneLayoutKey(changed)).not.toBe(sceneLayoutKey(scene));
  });
  it("invalide aussi les calculs lorsqu’un parent est transformé ou une pièce ajoutée ou retirée", () => {
    const moved = {
      ...scene,
      nodes: scene.nodes.map((node) =>
        node.id === "assembly"
          ? { ...node, position: [10, 0, 0] as [number, number, number] }
          : node,
      ),
    };
    expect(sceneLayoutKey(moved)).not.toBe(sceneLayoutKey(scene));
    expect(
      sceneLayoutKey({
        ...scene,
        nodes: [...scene.nodes, makePart("brick-1x1", "#4079e8")],
      }),
    ).not.toBe(sceneLayoutKey(scene));
    expect(
      sceneLayoutKey({
        ...scene,
        nodes: scene.nodes.filter((node) => node.id !== part.id),
      }),
    ).not.toBe(sceneLayoutKey(scene));
  });
});
