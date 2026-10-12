import { beforeEach, describe, expect, it } from "vitest";
import {
  COLORS,
  emptyScene,
  group,
  makePart,
  validateScene,
} from "@clik/scene";
import { useEditor } from "../src/lib/clik/store";

beforeEach(() => {
  useEditor.getState().load(emptyScene(), "Couleurs");
  useEditor.setState({ color: "#4079e8" });
});

describe("Couleurs des pièces", () => {
  it.each([...COLORS, "#f5f5f3", "#ffffff", "#123abc", "#AABBCC"])(
    "conserve une teinte RGB %s, y compris les anciens blancs",
    (color) => {
      const scene = { ...emptyScene(), nodes: [makePart("brick-1x1", color)] };
      expect(validateScene(JSON.parse(JSON.stringify(scene)))).toEqual(scene);
    },
  );
  it.each([
    "#fff",
    "#12345678",
    "red",
    "#gg0000",
    "rgb(12 34 56)",
    "var(--color)",
    "url(example)",
    "#123456\n",
  ])("refuse la couleur invalide ou non opaque %s", (color) => {
    const scene = { ...emptyScene(), nodes: [makePart("brick-1x1", color)] };
    expect(() => validateScene(scene)).toThrow();
    expect(() => useEditor.getState().setColor(color)).toThrow();
    expect(useEditor.getState().scene).toEqual(emptyScene());
    expect(useEditor.getState().color).toBe("#4079e8");
    expect(useEditor.getState().past).toHaveLength(0);
  });
  it("suit la pièce sélectionnée et la dernière sélection multiple sans modifier la scène", () => {
    const red = makePart("brick-1x1", "#ef4444");
    const custom = makePart("brick-2x2", "#AABBCC", [4, 0, 0]);
    const scene = { ...emptyScene(), nodes: [red, custom] };
    const editor = useEditor.getState();
    editor.load(scene, "Test");
    editor.select(red.id);
    expect(useEditor.getState().color).toBe(red.color);
    editor.select(custom.id, true);
    expect(useEditor.getState().color).toBe("#aabbcc");
    editor.select(custom.id, true);
    expect(useEditor.getState().color).toBe(red.color);
    expect(useEditor.getState().scene).toEqual(scene);
    expect(useEditor.getState().past).toHaveLength(0);
    expect(useEditor.getState().serial).toBe(0);
  });
  it("suit la sélection restante après un clic avec Maj sur un enfant de groupe", () => {
    const part = makePart("brick-1x1", "#ef4444");
    const other = makePart("brick-1x1", "#123abc", [4, 0, 0]);
    const scene = group(
      { ...emptyScene(), nodes: [part, other] },
      [part.id],
      "assembly",
    );
    const editor = useEditor.getState();
    editor.load(scene, "Test");
    editor.select("assembly");
    editor.select(other.id, true);
    editor.deselect(other.id);
    expect(useEditor.getState().color).toBe(part.color);
    editor.select(other.id, true);
    editor.deselect(part.id);
    expect(useEditor.getState().selection).toEqual([other.id]);
    expect(useEditor.getState().color).toBe(other.color);
    expect(useEditor.getState().scene).toEqual(scene);
    expect(useEditor.getState().past).toHaveLength(0);
  });
  it("recolore un groupe, respecte les verrouillages et utilise la teinte pour les nouveaux ajouts", () => {
    const free = makePart("brick-1x1", "#ef4444");
    const locked = {
      ...makePart("brick-1x1", "#41a66b", [3, 0, 0]),
      locked: true,
    };
    const outside = makePart("brick-1x1", "#4079e8", [6, 0, 0]);
    const scene = group(
      { ...emptyScene(), nodes: [free, locked, outside] },
      [free.id, locked.id],
      "assembly",
    );
    const editor = useEditor.getState();
    editor.load(scene, "Test");
    editor.select("assembly");
    expect(useEditor.getState().color).toBe(free.color);
    editor.setColor("#9B7653");
    expect(
      useEditor.getState().scene.nodes.find((n) => n.id === free.id),
    ).toMatchObject({ color: "#9b7653" });
    expect(
      useEditor.getState().scene.nodes.find((n) => n.id === locked.id),
    ).toEqual(scene.nodes.find((n) => n.id === locked.id));
    expect(
      useEditor.getState().scene.nodes.find((n) => n.id === outside.id),
    ).toEqual(outside);
    expect(useEditor.getState().past).toHaveLength(1);
    editor.add("plate-1x1");
    expect(useEditor.getState().scene.nodes.at(-1)).toMatchObject({
      color: "#9b7653",
    });
  });
  it("ne recolore pas les enfants d’un groupe verrouillé", () => {
    const part = makePart("brick-1x1", "#f5f5f3");
    const scene = group(
      { ...emptyScene(), nodes: [part] },
      [part.id],
      "assembly",
    );
    scene.nodes.find((node) => node.id === "assembly")!.locked = true;
    const editor = useEditor.getState();
    editor.load(scene, "Test");
    editor.select(part.id);
    expect(useEditor.getState().color).toBe("#f5f5f3");
    editor.setColor("#8b5e3c");
    expect(useEditor.getState().scene).toEqual(scene);
    expect(useEditor.getState().past).toHaveLength(0);
  });
  it("regroupe les aperçus d’un réglage dans une seule annulation et restaure la palette", () => {
    const part = makePart("brick-1x1", "#4079e8");
    const scene = { ...emptyScene(), nodes: [part] };
    const editor = useEditor.getState();
    editor.load(scene, "Test");
    editor.select(part.id);
    editor.begin();
    editor.previewColor("#123456");
    editor.previewColor("#654321");
    expect(useEditor.getState().scene.nodes[0]).toMatchObject({
      color: "#654321",
    });
    expect(useEditor.getState().gesture?.scene).toEqual(scene);
    expect(useEditor.getState().serial).toBe(0);
    expect(useEditor.getState().past).toHaveLength(0);
    editor.end();
    expect(useEditor.getState().gesture).toBeNull();
    expect(useEditor.getState().color).toBe("#654321");
    expect(useEditor.getState().past).toHaveLength(1);
    expect(useEditor.getState().serial).toBe(1);
    editor.undo();
    expect(useEditor.getState().scene).toEqual(scene);
    expect(useEditor.getState().color).toBe(part.color);
    editor.redo();
    expect(useEditor.getState().scene.nodes[0]).toMatchObject({
      color: "#654321",
    });
    expect(useEditor.getState().color).toBe("#654321");
  });
  it("annule un aperçu et un aller-retour sans polluer l’historique", () => {
    const part = makePart("brick-1x1", "#4079e8");
    const scene = { ...emptyScene(), nodes: [part] };
    const editor = useEditor.getState();
    editor.load(scene, "Test");
    editor.select(part.id);
    editor.begin();
    editor.previewColor("#654321");
    editor.cancel();
    expect(useEditor.getState().scene).toEqual(scene);
    expect(useEditor.getState().color).toBe(part.color);
    editor.begin();
    editor.previewColor("#654321");
    editor.previewColor(part.color);
    editor.end();
    expect(useEditor.getState().scene).toEqual(scene);
    expect(useEditor.getState().gesture).toBeNull();
    expect(useEditor.getState().past).toHaveLength(0);
    expect(useEditor.getState().serial).toBe(0);
  });
});
