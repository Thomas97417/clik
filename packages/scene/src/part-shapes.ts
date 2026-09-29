export type PartDimensions = { w: number; d: number; h: number; shape: string };

/** Shared facets: the visible underside and collision solids use the same arch. */
export function archProfile({ w, h }: PartDimensions): [number, number][] {
  const radius = w / 2 - 1;
  const spring = h - 1.2 - radius;
  return Array.from({ length: 17 }, (_, i) => {
    const angle = Math.PI - (i * Math.PI) / 16;
    return [radius * Math.cos(angle), spring + radius * Math.sin(angle)];
  });
}

const roundProfiles = new Map<string, [number, number][]>();

/** The 2×2 rim is reinforced around its four standard sockets, within its 2×2 footprint. */
export function roundProfile(w: number, d: number): [number, number][] {
  const key = `${w}:${d}`;
  if (roundProfiles.has(key)) return roundProfiles.get(key)!;
  const segments = w === 1 ? 24 : 48;
  const points: [number, number][] = Array.from(
    { length: segments },
    (_, i) => {
      const angle = (i * Math.PI * 2) / segments;
      return [
        (w / 2 - 0.01) * Math.cos(angle),
        (d / 2 - 0.01) * Math.sin(angle),
      ];
    },
  );
  if (w === 2 && d === 2) {
    for (const x of [-0.5, 0.5])
      for (const z of [-0.5, 0.5])
        for (let i = 0; i < 48; i++) {
          const angle = (i * Math.PI * 2) / 48;
          points.push([x + 0.35 * Math.cos(angle), z + 0.35 * Math.sin(angle)]);
        }
    // Convex hull of the circular rim and the socket walls.
    points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (a: number[], b: number[], c: number[]) =>
      (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const half = (ordered: [number, number][]) => {
      const hull: [number, number][] = [];
      for (const point of ordered) {
        while (
          hull.length >= 2 &&
          cross(hull[hull.length - 2], hull[hull.length - 1], point) <= 0
        )
          hull.pop();
        hull.push(point);
      }
      hull.pop();
      return hull;
    };
    const hull = [...half(points), ...half([...points].reverse())];
    roundProfiles.set(key, hull);
    return hull;
  }
  roundProfiles.set(key, points);
  return points;
}

const roundSocketPatterns = new Map<string, boolean[]>();

/** Keep complete socket walls inside the visible, faceted perimeter. */
export function roundHasSocket(
  w: number,
  d: number,
  column: number,
  row: number,
) {
  const key = `${w}:${d}`;
  let pattern = roundSocketPatterns.get(key);
  if (!pattern) {
    const points = roundProfile(w, d);
    pattern = Array.from({ length: w * d }, (_, i) => {
      const x = (i % w) - (w - 1) / 2,
        z = Math.floor(i / w) - (d - 1) / 2;
      return points.every(([ax, az], edge) => {
        const [bx, bz] = points[(edge + 1) % points.length];
        const distance =
          ((bx - ax) * (z - az) - (bz - az) * (x - ax)) /
          Math.hypot(bx - ax, bz - az);
        return distance >= 0.345 - 1e-8;
      });
    });
    roundSocketPatterns.set(key, pattern);
  }
  return pattern[row * w + column] ?? false;
}
