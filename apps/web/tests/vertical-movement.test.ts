import { beforeEach, describe, expect, it } from "vitest";
import { Box3, Matrix4, Vector3 } from "three";
import {
  CATALOG,
  applyDelta,
  emptyScene,
  group,
  hasOverlappingParts,
  makePart,
  stepSelection,
  worldMatrix,
  type Part,
} from "@clik/scene";
import { useEditor } from "../src/lib/clik/store";

beforeEach(() => {
  useEditor.getState().load(emptyScene(), "Hauteur");
  useEditor.setState({ snap: true });
});

const height = (scene: ReturnType<typeof emptyScene>, id: string) =>
  new Vector3().setFromMatrixPosition(worldMatrix(scene, id)).y;

describe("Déplacement vertical limité à la place disponible", () => {
  for (const direction of [-1, 1]) {
    it.each([0.1, 0.4, 0.8, 1.2, 1.6])(
      `${direction > 0 ? "monte" : "descend"} de la distance libre, jusqu’à 1,2 unité (espace : %s)`,
      (gap) => {
        const moving = makePart("brick-1x1", "#4079e8", [
          0,
          direction > 0 ? 0 : 1.2 + gap,
          0,
        ]);
        const obstacle = makePart("brick-1x1", "#ef4444", [
          0,
          direction > 0 ? 1.2 + gap : 0,
          0,
        ]);
        const scene = { ...emptyScene(), nodes: [moving, obstacle] };
        const next = stepSelection(scene, [moving.id], [0, direction * 1.2, 0]);
        expect(height(next, moving.id)).toBeCloseTo(
          moving.position[1] + direction * Math.min(gap, 1.2),
          8,
        );
        expect(next.nodes[1]).toEqual(obstacle);
        expect(hasOverlappingParts(next)).toBe(false);
        if (gap <= 1.2) {
          expect(
            stepSelection(next, [moving.id], [0, direction * 1.2, 0]),
          ).toBe(next);
          expect(
            hasOverlappingParts(
              applyDelta(
                next,
                [moving.id],
                new Matrix4().makeTranslation(0, direction * 0.001, 0),
              ),
            ),
          ).toBe(true);
        }
      },
    );
  }

  it.each([true, false])(
    "atteint le contact sans arrondir le mouvement partiel, avec aimantation=%s, et conserve annuler/rétablir",
    (snap) => {
      const part = makePart("brick-1x1", "#4079e8");
      const ceiling = makePart("brick-2x2", "#ef4444", [0, 1.73, 0]);
      const scene = { ...emptyScene(), nodes: [part, ceiling] };
      const editor = useEditor.getState();
      editor.load(scene, "Plafond");
      useEditor.setState({ snap });
      editor.select(part.id);
      editor.nudge([0, 1.2, 0]);
      const moved = useEditor.getState().scene;
      expect(height(moved, part.id)).toBeCloseTo(0.53, 8);
      expect(hasOverlappingParts(moved)).toBe(false);
      for (let i = 0; i < 5; i++) editor.nudge([0, 1.2, 0]);
      expect(useEditor.getState().scene).toBe(moved);
      expect(useEditor.getState().past).toHaveLength(1);
      expect(useEditor.getState().serial).toBe(1);
      editor.undo();
      expect(useEditor.getState().scene).toEqual(scene);
      editor.redo();
      expect(useEditor.getState().scene).toEqual(moved);
    },
  );

  it("descend jusqu’au sol si le pas dépasse la hauteur restante", () => {
    const part = makePart("brick-1x1", "#4079e8", [0.5, 0.35, 0.5]);
    const scene = { ...emptyScene(), nodes: [part] };
    const next = stepSelection(scene, [part.id], [0, -1.2, 0]);
    expect(next.nodes[0].position).toEqual([0.5, 0, 0.5]);
    expect(stepSelection(next, [part.id], [0, -1.2, 0])).toBe(next);
    const away = stepSelection(next, [part.id], [0, 1.2, 0]);
    expect(away.nodes[0].position).toEqual([0.5, 1.2, 0.5]);
  });

  it.each([-1, 1])(
    "ne traverse pas un obstacle fin même si la destination finale serait libre (sens : %s)",
    (direction) => {
      const part = makePart("plate-1x1", "#4079e8", [
        0,
        direction > 0 ? 0 : 1.5,
        0,
      ]);
      const obstacle = makePart("plate-1x1", "#ef4444", [
        0,
        direction > 0 ? 0.7 : 0.8,
        0,
      ]);
      const scene = { ...emptyScene(), nodes: [part, obstacle] };
      const next = stepSelection(scene, [part.id], [0, direction * 1.2, 0]);
      expect(height(next, part.id)).toBeCloseTo(direction > 0 ? 0.3 : 1.2, 8);
      expect(hasOverlappingParts(next)).toBe(false);
    },
  );

  it("déplace une sélection multiple du même montant, limité par la pièce la plus proche d’un obstacle", () => {
    const a = makePart("brick-1x1", "#4079e8");
    const b = makePart("brick-1x1", "#4079e8", [4, 0, 0]);
    const scene = {
      ...emptyScene(),
      nodes: [
        a,
        b,
        makePart("plate-1x1", "#ef4444", [0, 1.6, 0]),
        makePart("plate-1x1", "#ef4444", [4, 1.4, 0]),
      ],
    };
    const next = stepSelection(scene, [a.id, b.id], [0, 1.2, 0]);
    for (const part of [a, b])
      expect(height(next, part.id)).toBeCloseTo(0.2, 8);
    expect(hasOverlappingParts(next)).toBe(false);
  });

  it("conserve les transformations locales d’un assemblage incliné et imbriqué", () => {
    const a = makePart("brick-1x1", "#4079e8", [-2, 0, 0]);
    const b = makePart("brick-1x1", "#41a66b", [2, 0.4, 0]);
    let scene = group(
      { ...emptyScene(), nodes: [a, b] },
      [a.id, b.id],
      "inner",
    );
    scene = group(scene, ["inner"], "outer");
    scene.nodes.find((node) => node.id === "outer")!.position = [3, 2, -4];
    scene.nodes.find((node) => node.id === "outer")!.rotation = [
      0.2, 0.7, -0.15,
    ];
    const bounds = new Box3();
    for (const part of [a, b]) {
      const { w, h, d } = CATALOG[part.type];
      bounds.union(
        new Box3(
          new Vector3(-w / 2, 0, -d / 2),
          new Vector3(w / 2, h, d / 2),
        ).applyMatrix4(worldMatrix(scene, part.id)),
      );
    }
    const ceiling = makePart("plate-8x8", "#ef4444", [
      3,
      bounds.max.y + 0.3,
      -4,
    ]);
    scene.nodes.push(ceiling);
    const next = stepSelection(scene, ["outer", "inner", a.id], [0, 1.2, 0]);
    for (const part of [a, b]) {
      expect(height(next, part.id) - height(scene, part.id)).toBeCloseTo(
        0.3,
        8,
      );
      expect(next.nodes.find((node) => node.id === part.id)).toEqual(
        scene.nodes.find((node) => node.id === part.id),
      );
    }
    expect(next.nodes.find((node) => node.id === "inner")).toEqual(
      scene.nodes.find((node) => node.id === "inner"),
    );
    expect(next.nodes.find((node) => node.id === ceiling.id)).toEqual(ceiling);
    expect(hasOverlappingParts(next)).toBe(false);
  });

  it("descend sur la surface réelle d’une pente", () => {
    const slope = makePart("slope-2x2", "#ef4444");
    const part = makePart("brick-1x1", "#4079e8", [0, 1.6, -0.9]);
    const scene = { ...emptyScene(), nodes: [slope, part] };
    const next = stepSelection(scene, [part.id], [0, -1.2, 0]);
    expect(height(next, part.id)).toBeCloseTo(0.82, 8);
    expect(hasOverlappingParts(next)).toBe(false);
    expect(stepSelection(next, [part.id], [0, -1.2, 0])).toBe(next);
  });

  it("monte dans le vide d’une arche jusqu’à sa voûte", () => {
    const arch = makePart("arch-1x4x3", "#ef4444");
    const part = makePart("brick-1x1", "#4079e8");
    const scene = { ...emptyScene(), nodes: [arch, part] };
    const next = stepSelection(scene, [part.id], [0, 1.2, 0]);
    expect(height(next, part.id)).toBeGreaterThan(1.04);
    expect(height(next, part.id)).toBeLessThan(1.07);
    expect(hasOverlappingParts(next)).toBe(false);
    expect(
      hasOverlappingParts(
        applyDelta(next, [part.id], new Matrix4().makeTranslation(0, 0.001, 0)),
      ),
    ).toBe(true);
  });

  it.each(["round", "corner", "side-contact"])(
    "n’est pas arrêté par une boîte englobante ou un contact latéral (%s)",
    (shape) => {
      const part = makePart(
        shape === "round" ? "round-brick-1x1" : "brick-1x1",
        "#4079e8",
        shape === "corner" ? [0.5, 0, 0.5] : [0, 0, 0],
      );
      const obstacle =
        shape === "round"
          ? makePart("round-brick-1x1", "#ef4444", [0.75, 1.6, 0.75])
          : shape === "corner"
            ? makePart("corner-brick-2x2", "#ef4444", [0, 1.6, 0])
            : makePart("brick-1x1", "#ef4444", [1, 1.6, 0]);
      const scene = { ...emptyScene(), nodes: [part, obstacle] };
      const next = stepSelection(scene, [part.id], [0, 1.2, 0]);
      expect(height(next, part.id)).toBeCloseTo(1.2, 8);
      expect(hasOverlappingParts(next)).toBe(false);
    },
  );

  it("respecte les pièces masquées et verrouillées, même lorsqu’elles sont dans la sélection", () => {
    const moving = makePart("brick-1x1", "#4079e8");
    const ceiling = {
      ...makePart("brick-2x2", "#ef4444", [0, 1.6, 0]),
      hidden: true,
      locked: true,
    };
    const scene = group(
      { ...emptyScene(), nodes: [moving, ceiling] },
      [ceiling.id],
      "locked",
    );
    const next = stepSelection(scene, [moving.id, "locked"], [0, 1.2, 0]);
    expect(height(next, moving.id)).toBeCloseTo(0.4, 8);
    expect(next.nodes.find((node) => node.id === ceiling.id)).toEqual(
      scene.nodes.find((node) => node.id === ceiling.id),
    );
    expect(hasOverlappingParts(next)).toBe(false);
  });

  it("n’ajoute aucun historique si la sélection est bloquée ou vide", () => {
    const editor = useEditor.getState();
    editor.nudge([0, -1.2, 0]);
    expect(useEditor.getState().past).toHaveLength(0);
    const part: Part = { ...makePart("brick-1x1", "#4079e8"), locked: true };
    const scene = { ...emptyScene(), nodes: [part] };
    editor.load(scene, "Verrouillée");
    editor.select(part.id);
    editor.nudge([0, 1.2, 0]);
    expect(useEditor.getState().scene).toEqual(scene);
    expect(useEditor.getState().past).toHaveLength(0);
  });
});
