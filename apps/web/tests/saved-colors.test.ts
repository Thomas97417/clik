import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  emptySavedColors,
  parseSavedColors,
  readSavedColors,
  rememberSavedColor,
  SAVED_COLORS_KEY,
  type SavedColors,
} from "../src/lib/clik/saved-colors";

let stored: Map<string, string>;
beforeEach(() => {
  stored = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("Couleurs personnelles de la palette", () => {
  it.each([null, "null", "{}", "[]", "invalide"])(
    "démarre avec trois cases vides si la préférence est absente ou invalide (%s)",
    (raw) => {
      expect(parseSavedColors(raw)).toEqual([null, null, null]);
    },
  );

  it("restaure les trois emplacements, normalise les teintes et ignore les valeurs supplémentaires", () => {
    expect(
      parseSavedColors('["#A16B45", "#FFFFFF", "#123abc", "#000000"]'),
    ).toEqual(["#a16b45", "#ffffff", "#123abc"]);
    expect(parseSavedColors('["#123abc", "red", "#ABCDEF"]')).toEqual([
      "#123abc",
      null,
      "#abcdef",
    ]);
    expect(parseSavedColors('[null, {"color":"#123abc"}, "#fff"]')).toEqual([
      null,
      null,
      null,
    ]);
  });

  it("conserve, remplace et libère chaque case sans décaler les autres", () => {
    let colors = rememberSavedColor(0, "#A16B45", emptySavedColors());
    colors = rememberSavedColor(2, "#123abc", colors);
    expect(readSavedColors()).toEqual(["#a16b45", null, "#123abc"]);
    colors = rememberSavedColor(0, "#ffffff", colors);
    expect(readSavedColors()).toEqual(["#ffffff", null, "#123abc"]);
    colors = rememberSavedColor(0, null, colors);
    expect(colors).toEqual([null, null, "#123abc"]);
    expect(JSON.parse(stored.get(SAVED_COLORS_KEY)!)).toEqual(colors);
  });

  it("préserve une couleur ajoutée dans un autre onglet avant l’enregistrement", () => {
    const previous = rememberSavedColor(0, "#123abc", emptySavedColors());
    stored.set(SAVED_COLORS_KEY, '["#123abc", "#a16b45", null]');
    const colors = rememberSavedColor(2, "#ffffff", previous);
    expect(colors).toEqual(["#123abc", "#a16b45", "#ffffff"]);
    expect(previous).toEqual(["#123abc", null, null]);
  });

  it("reste utilisable en mémoire si le navigateur bloque les préférences", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("Stockage bloqué");
      },
      setItem: () => {
        throw new Error("Stockage bloqué");
      },
    });
    expect(readSavedColors()).toEqual([null, null, null]);
    let colors = rememberSavedColor(0, "#123abc", emptySavedColors());
    colors = rememberSavedColor(1, "#a16b45", colors);
    expect(colors).toEqual(["#123abc", "#a16b45", null]);
  });

  it("ne dépend pas du stockage pendant le rendu serveur", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(readSavedColors()).toEqual([null, null, null]);
  });

  it("refuse une couleur ou une case invalide sans modifier les préférences", () => {
    const colors: SavedColors = ["#123abc", null, null];
    stored.set(SAVED_COLORS_KEY, JSON.stringify(colors));
    for (const slot of [-1, 3, 0.5, Number.NaN])
      expect(() => rememberSavedColor(slot, "#ffffff", colors)).toThrow();
    expect(() => rememberSavedColor(0, "#fff", colors)).toThrow();
    expect(readSavedColors()).toEqual(colors);
  });
});
