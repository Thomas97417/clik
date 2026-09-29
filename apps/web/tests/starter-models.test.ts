import { describe, expect, it } from "vitest";
import { hasOverlappingParts, validateScene } from "@clik/scene";
import {
  STARTER_COLORS,
  STARTER_MODELS,
  starterScene,
} from "../src/lib/clik/starter-models";

describe("Modèles de départ de l’accueil", () => {
  for (const model of STARTER_MODELS) {
    it(`${model.name} est éditable et sans pièces superposées dans chaque couleur`, () => {
      for (const color of STARTER_COLORS) {
        const scene = starterScene(model.id, color.value);
        expect(validateScene(scene)).toEqual(scene);
        expect(hasOverlappingParts(scene)).toBe(false);
        expect(scene.nodes.length).toBeGreaterThan(10);
      }
    });
  }
});
