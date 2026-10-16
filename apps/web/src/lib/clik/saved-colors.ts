import { colorSchema, type PartColor } from "@clik/scene";

export const SAVED_COLORS_KEY = "clik-editor-saved-colors-v1";
export type SavedColors = [
  PartColor | null,
  PartColor | null,
  PartColor | null,
];
export const emptySavedColors = (): SavedColors => [null, null, null];

export function parseSavedColors(raw: string | null): SavedColors {
  const colors = emptySavedColors();
  try {
    const saved: unknown = JSON.parse(raw ?? "null");
    if (Array.isArray(saved)) {
      colors.forEach((_, index) => {
        const color = colorSchema.safeParse(saved[index]);
        if (color.success) colors[index] = color.data.toLowerCase();
      });
    }
  } catch {
    // An invalid preference must not prevent opening the editor.
  }
  return colors;
}

export function readSavedColors(fallback = emptySavedColors()): SavedColors {
  try {
    return parseSavedColors(localStorage.getItem(SAVED_COLORS_KEY));
  } catch {
    return fallback;
  }
}

export function rememberSavedColor(
  slot: number,
  value: PartColor | null,
  fallback: SavedColors,
): SavedColors {
  if (!Number.isInteger(slot) || slot < 0 || slot >= 3)
    throw new RangeError("Emplacement de couleur invalide.");
  const color = value === null ? null : colorSchema.parse(value).toLowerCase();
  // Merge with the latest palette so an edit in another tab is kept.
  const next = [...readSavedColors(fallback)] as SavedColors;
  next[slot] = color;
  try {
    localStorage.setItem(SAVED_COLORS_KEY, JSON.stringify(next));
  } catch {
    // The palette remains usable for this visit if storage is unavailable.
  }
  return next;
}
