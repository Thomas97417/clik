import { describe, expect, it } from "vitest";
import {
  isMacKeyboard,
  shortcutKeys,
  type ShortcutKey,
} from "../src/lib/clik/editor-shortcuts";

describe("Touches adaptées au système", () => {
  it.each([
    ["MacIntel", true],
    ["macOS", true],
    ["Win32", false],
    ["Linux x86_64", false],
    ["iPad", true],
    ["", false],
  ] as const)("détecte %s", (platform, expected) => {
    expect(isMacKeyboard({ platform })).toBe(expected);
  });
  it("privilégie la plateforme fournie par le navigateur", () => {
    expect(
      isMacKeyboard({
        userAgentData: { platform: "Windows" },
        platform: "MacIntel",
      }),
    ).toBe(false);
    expect(
      isMacKeyboard({
        userAgentData: { platform: "macOS" },
        platform: "Win32",
      }),
    ).toBe(true);
  });
  it("utilise l’agent utilisateur lorsque la plateforme est absente", () => {
    expect(
      isMacKeyboard({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      }),
    ).toBe(true);
    expect(
      isMacKeyboard({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }),
    ).toBe(false);
  });
  it("adapte le modificateur et son ordre sans modifier la combinaison", () => {
    const combination: readonly ShortcutKey[] = ["shift", "mod", "Z"];
    const mac = shortcutKeys(combination, true);
    const pc = shortcutKeys(combination, false);
    expect(mac.map((key) => key.glyph)).toEqual(["⇧", "⌘", "Z"]);
    expect(pc.map((key) => key.glyph)).toEqual(["Ctrl", "⇧", "Z"]);
    expect(mac.map((key) => key.label)).toContain("Commande");
    expect(pc.map((key) => key.label)).toContain("Contrôle");
    expect(combination).toEqual(["shift", "mod", "Z"]);
  });
});
