import { describe, expect, it } from "vitest";
import { hasOverlappingParts, validateScene, type Part } from "@clik/scene";
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
        const parts = scene.nodes.filter(
          (node): node is Part => node.kind === "part",
        );
        expect(parts.length).toBeGreaterThan(40);
        expect(
          new Set(parts.map((part) => part.type)).size,
        ).toBeGreaterThanOrEqual(10);
      }
    });
  }
  it("changer la couleur conserve toutes les pièces et leur assemblage", () => {
    for (const model of STARTER_MODELS) {
      const original = starterScene(model.id, "#ef4444");
      const recolored = starterScene(model.id, "#8b5bd6");
      expect(recolored.nodes).toEqual(
        original.nodes.map((node) =>
          node.kind === "part" && node.color === "#ef4444"
            ? { ...node, color: "#8b5bd6" }
            : node,
        ),
      );
      expect(starterScene(model.id, "#ef4444")).toEqual(original);
    }
  });
});
