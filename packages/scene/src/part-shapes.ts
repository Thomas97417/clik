export type PartDimensions = {
  w: number;
  d: number;
  h: number;
  shape: string;
  slopeRun?: number;
};

export const STUD_RADIUS = 0.3;
export const STUD_HEIGHT = 0.18;
export const SOCKET_RADIUS = 0.325;
export type ProfilePoint = [number, number];
export type PartBox = {
  min: [number, number, number];
  max: [number, number, number];
};

/** A shorter run keeps one-brick-high steep slopes distinct from ordinary slopes. */
export function slopeCrease({ d, slopeRun = d - 1 }: PartDimensions) {
  return -d / 2 + slopeRun;
}

export function slopeRoofHeight(
  { d, h, slopeRun = d - 1 }: PartDimensions,
  z: number,
) {
  return 0.25 + (h - 0.25) * Math.min((z + d / 2) / slopeRun, 1);
}

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
export function roundProfile(
  w: number,
  d: number,
  segments = w === 1 ? 24 : 48,
): [number, number][] {
  const key = `${w}:${d}:${segments}`;
  if (roundProfiles.has(key)) return roundProfiles.get(key)!;
  const points: [number, number][] = Array.from(
    { length: segments },
    (_, i) => {
      const angle = (i * Math.PI * 2) / segments;
      return [(w / 2) * Math.cos(angle), (d / 2) * Math.sin(angle)];
    },
  );
  if (w === 2 && d === 2) {
    for (const x of [-0.5, 0.5])
      for (const z of [-0.5, 0.5])
        for (let i = 0; i < segments; i++) {
          const angle = (i * Math.PI * 2) / segments;
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

const footprints = new Map<string, ProfilePoint[]>();

/** Counterclockwise X/Z outlines, shared by the mesh, sockets and collisions. */
export function partFootprint(part: PartDimensions): ProfilePoint[] {
  const { w, d, shape } = part;
  const key = `${shape}:${w}:${d}`;
  const cached = footprints.get(key);
  if (cached) return cached;
  const x = w / 2,
    z = d / 2;
  let points: ProfilePoint[];
  if (shape === "quarter") {
    points = [
      [-x, -z],
      ...Array.from({ length: 17 }, (_, i): ProfilePoint => {
        const angle = (i * Math.PI) / 32;
        return [-x + w * Math.cos(angle), -z + d * Math.sin(angle)];
      }),
    ];
  } else if (shape === "cone" || shape === "dome") {
    points = roundProfile(w, d, 24);
  } else if (shape === "round") {
    points = roundProfile(w, d);
  } else {
    points = [
      [-x, -z],
      [x, -z],
      [x, z],
      [-x, z],
    ];
  }
  footprints.set(key, points);
  return points;
}

export function footprintContains(
  points: ProfilePoint[],
  x: number,
  z: number,
  margin = 0,
) {
  return points.every(([ax, az], i) => {
    const [bx, bz] = points[(i + 1) % points.length];
    return (
      ((bx - ax) * (z - az) - (bz - az) * (x - ax)) /
        Math.hypot(bx - ax, bz - az) >=
      margin - 1e-8
    );
  });
}

export function footprintHasSocket(
  part: PartDimensions,
  column: number,
  row: number,
) {
  return footprintContains(
    partFootprint(part),
    column - (part.w - 1) / 2,
    row - (part.d - 1) / 2,
    SOCKET_RADIUS + 0.02,
  );
}

/** Flat feet only: no socket may hang under an opening or a raised underside. */
export function bottomFootprints(part: PartDimensions): ProfilePoint[][] {
  const { w, d, shape } = part;
  const x = w / 2,
    z = d / 2;
  if (shape === "inverted-slope")
    return [
      [
        [-x, slopeCrease(part)],
        [x, slopeCrease(part)],
        [x, z],
        [-x, z],
      ],
    ];
  return [partFootprint(part)];
}

export function curvedRoofProfile({ d, h }: PartDimensions): ProfilePoint[] {
  return Array.from({ length: 17 }, (_, i): ProfilePoint => {
    const angle = (i * Math.PI) / 32;
    return [
      -d / 2 + d * (1 - Math.cos(angle)),
      0.25 + (h - 0.25) * Math.sin(angle),
    ];
  });
}

export function profileRoofHeight(part: PartDimensions, z: number) {
  if (part.shape !== "curved-slope")
    return part.shape === "slope" ? slopeRoofHeight(part, z) : part.h;
  const points = curvedRoofProfile(part);
  for (let i = 1; i < points.length; i++) {
    const [right, high] = points[i],
      [left, low] = points[i - 1];
    if (z <= right)
      return low + (high - low) * Math.max(0, (z - left) / (right - left));
  }
  return part.h;
}

/** Z/Y profiles have the same facets in the visible surface and the solid body. */
export function verticalProfile(part: PartDimensions): ProfilePoint[] {
  const { d, h } = part;
  const z = d / 2;
  if (part.shape === "inverted-slope")
    return [
      [-z, h - 0.25],
      [slopeCrease(part), 0],
      [z, 0],
      [z, h],
      [-z, h],
    ];
  return [[-z, 0], [z, 0], ...curvedRoofProfile(part).reverse()];
}

export function radialSections({ h, shape }: PartDimensions) {
  const rim = 0.28;
  return shape === "cone"
    ? [
        { y: 0, scale: 1 },
        { y: rim, scale: 1 },
        { y: h, scale: 0 },
      ]
    : [
        { y: 0, scale: 1 },
        ...Array.from({ length: 7 }, (_, i) => ({
          y: rim + (h - rim) * Math.sin((i * Math.PI) / 12),
          scale: i === 6 ? 0 : Math.cos((i * Math.PI) / 12),
        })),
      ];
}

/** Separate solids retain the recesses between the grille ribs. */
export function partBoxes(part: PartDimensions): PartBox[] {
  const { w, d, h, shape } = part;
  const x = w / 2,
    z = d / 2;
  if (shape === "grille") {
    const floor = 0.28,
      rib = 0.16,
      count = d * 2 + 1;
    return [
      { min: [-x, 0, -z], max: [x, floor, z] },
      { min: [-x, floor, -z], max: [-x + rib, h, z] },
      { min: [x - rib, floor, -z], max: [x, h, z] },
      ...Array.from({ length: count }, (_, i): PartBox => {
        const start = -z + (i * (d - rib)) / (count - 1);
        return { min: [-x, floor, start], max: [x, h, start + rib] };
      }),
    ];
  }
  return [];
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
