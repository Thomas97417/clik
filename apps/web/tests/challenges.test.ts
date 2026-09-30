import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CATALOG,
  challengeStock,
  challengeStart,
  countStock,
  emptyScene,
  makePart,
  type ChallengeStock,
} from "@clik/scene";
import { useEditor } from "../src/lib/clik/store";
afterEach(() => {
  vi.useRealTimers();
  useEditor.getState().load(emptyScene(), "Libre");
});
describe("Lots quotidiens", () => {
  it("génère des lots stables, variés et compatibles avec le catalogue", () => {
    const lots = new Set<string>();
    for (let n = 0; n < 366; n++) {
      const day = new Date(Date.UTC(2026, 0, 1 + n)).toISOString().slice(0, 10);
      const lot = challengeStock(day);
      expect(lot).toEqual(challengeStock(day));
      expect(lot).toHaveLength(12);
      expect(new Set(lot.map((i) => i.type)).size).toBe(12);
      expect(lot.reduce((s, i) => s + i.quantity, 0)).toBe(100);
      for (const item of lot) expect(CATALOG[item.type]).toBeDefined();
      lots.add(JSON.stringify(lot));
    }
    expect(lots.size).toBeGreaterThan(350);
    expect(() => challengeStart("2026-02-30")).toThrow();
  });
});
describe("Stock de l’éditeur", () => {
  const stock: ChallengeStock = [{ type: "brick-1x1", quantity: 2 }];
  function load() {
    useEditor
      .getState()
      .load(emptyScene(), "Défi", {
        stock,
        closesAt: Date.now() + 3600000,
        serverOffset: 0,
      });
    return useEditor.getState();
  }
  it("bloque les ajouts, les modèles interdits et les duplications sans toucher à l’historique", () => {
    const s = load();
    s.add("brick-1x1");
    s.duplicate();
    const before = useEditor.getState();
    expect(() => s.add("brick-1x1")).toThrow("2 exemplaires");
    expect(() => s.duplicate()).toThrow("2 exemplaires");
    expect(() => s.add("brick-2x4")).toThrow("absente");
    expect(useEditor.getState().scene).toBe(before.scene);
    expect(useEditor.getState().past).toBe(before.past);
    s.remove();
    s.add("brick-1x1");
    expect(countStock(useEditor.getState().scene)["brick-1x1"]).toBe(2);
    s.undo();
    expect(countStock(useEditor.getState().scene)["brick-1x1"]).toBe(1);
    s.redo();
    expect(countStock(useEditor.getState().scene)["brick-1x1"]).toBe(2);
  });
  it("refuse un collage de groupe entier dépassant le stock et compte les pièces masquées", () => {
    const s = load();
    s.add("brick-1x1");
    s.duplicate();
    s.selectAll();
    s.group();
    s.copy();
    const before = useEditor.getState().scene;
    expect(() => s.paste()).toThrow("2 exemplaires");
    expect(useEditor.getState().scene).toBe(before);
    s.patch(useEditor.getState().selection[0], { hidden: true });
    expect(() => s.add("brick-1x1")).toThrow("2 exemplaires");
  });
  it("bloque les modifications à minuit et réinitialise les contraintes pour un projet libre", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const s = load();
    s.add("brick-1x1");
    vi.setSystemTime(3601000);
    expect(() => s.add("brick-1x1")).toThrow("clos");
    expect(() => s.undo()).toThrow("clos");
    s.load(emptyScene(), "Libre");
    s.add("brick-2x4");
    expect(useEditor.getState().challenge).toBeNull();
  });
  it("refuse un changement de type et un collage provenant d’une création libre", () => {
    const s = useEditor.getState();
    s.load(
      { ...emptyScene(), nodes: [makePart("brick-2x4", "#4079e8")] },
      "Libre",
    );
    s.selectAll();
    s.copy();
    load();
    expect(() => s.paste()).toThrow("absente");
    s.add("brick-1x1");
    expect(() =>
      s.patch(useEditor.getState().selection[0], { type: "brick-2x4" }),
    ).toThrow("absente");
  });
});
