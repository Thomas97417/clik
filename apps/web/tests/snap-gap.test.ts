import { afterEach, describe, expect, it } from "vitest";
import { Matrix4 } from "three";
import {
  emptyScene,
  group,
  hasOverlappingParts,
  makePart,
  snapCandidate,
  type SceneDocument,
} from "@clik/scene";
import { useEditor } from "../src/lib/clik/store";

afterEach(() => useEditor.getState().load(emptyScene(), "Libre"));

describe("Emboîtement dans un espace sous une brique", () => {
  for (const grouped of [false, true]) {
    it(`préfère l’accroche libre sous le plafond avant de corriger la collision temporaire, groupe ${grouped}`, () => {
      const lower = makePart("brick-2x2", "#4079e8");
      const upper = makePart("brick-2x2", "#4079e8", [0, 2.4, 0]);
      const moving = makePart("brick-2x2", "#ef4444", [4, 0, 0]);
      let scene: SceneDocument = {
        ...emptyScene(),
        nodes: [lower, upper, moving],
      };
      if (grouped) scene = group(scene, [moving.id], "assembly");
      const s = useEditor.getState();
      s.load(scene, "Entre deux briques");
      s.select(grouped ? "assembly" : moving.id);
      useEditor.setState({ snap: true });
      s.begin(moving.id);
      // The pointer is on a stud, 0.2 above the lower brick's body.
      s.preview(new Matrix4().makeTranslation(-4, 1.4, 0));
      const preview = useEditor.getState().snapPreview!;
      expect(preview.kind).toBe("attachment");
      expect(preview.targetId).toBe(lower.id);
      expect(preview.points).toHaveLength(4);
      const y = grouped
        ? preview.scene.nodes.find((n) => n.id === "assembly")!.position[1]
        : preview.scene.nodes.find((n) => n.id === moving.id)!.position[1];
      expect(y).toBeCloseTo(1.2);
      expect(hasOverlappingParts(preview.scene)).toBe(false);
      expect(hasOverlappingParts(useEditor.getState().scene)).toBe(false);
      const displayed = useEditor.getState().scene;
      expect(
        displayed.nodes.find(
          (n) => n.id === (grouped ? "assembly" : moving.id),
        )!.position[1],
      ).toBeCloseTo(1.2);
      s.end();
      expect(useEditor.getState().scene).toBe(preview.scene);
      expect(useEditor.getState().past).toHaveLength(1);
      s.undo();
      expect(useEditor.getState().scene).toEqual(scene);
    });
  }
  it("refuse un espace trop bas et conserve les contacts valides sous une pièce tournée", () => {
    const lower = makePart("brick-2x2", "#4079e8");
    const upper = makePart("brick-2x2", "#4079e8", [0, 2.4, 0]);
    lower.rotation[1] = upper.rotation[1] = Math.PI / 2;
    const moving = makePart("brick-2x2", "#ef4444", [0, 1.4, 0]);
    for (const ceiling of [2.4, 2]) {
      upper.position[1] = ceiling;
      const scene = { ...emptyScene(), nodes: [lower, upper] };
      const candidate = snapCandidate(scene, moving, true);
      expect(candidate.part.position[1]).toBeCloseTo(
        ceiling === 2.4 ? 1.2 : 3.2,
      );
      expect(
        hasOverlappingParts({
          ...scene,
          nodes: [...scene.nodes, candidate.part],
        }),
      ).toBe(false);
    }
  });
});
