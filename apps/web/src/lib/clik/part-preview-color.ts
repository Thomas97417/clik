import { Color } from "three";

// One neutral image per shape; a lightweight filter supplies the chosen shade.
export const PART_PREVIEW_COLOR = "#808080";
const reference = new Color(PART_PREVIEW_COLOR).r;

export function partPreviewColorMatrix(color: string) {
  const { r, g, b } = new Color(color);
  return `${r / reference} 0 0 0 0 0 ${g / reference} 0 0 0 0 0 ${b / reference} 0 0 0 0 0 1 0`;
}
