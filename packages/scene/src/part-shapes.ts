export type PartDimensions = { w: number; d: number; h: number; shape: string };
export const ROUND_SEGMENTS = 24;

/** Shared facets: the visible underside and collision solids use the same arch. */
export function archProfile({ w, h }: PartDimensions): [number, number][] {
  const radius = w / 2 - 1;
  const spring = h - 1.2 - radius;
  return Array.from({ length: 17 }, (_, i) => {
    const angle = Math.PI - (i * Math.PI) / 16;
    return [radius * Math.cos(angle), spring + radius * Math.sin(angle)];
  });
}
