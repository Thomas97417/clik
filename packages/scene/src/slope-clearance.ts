import { Box3, Matrix4, Vector3 } from "three";

type Body = {
  vertices: Vector3[];
  normals: Vector3[];
  edges: Vector3[];
  bounds: Box3;
};

// Convex body only: studs intentionally enter the sockets of an attached piece.
export function placementBody(
  { w, d, h, shape }: { w: number; d: number; h: number; shape: string },
  matrix: Matrix4,
): Body {
  const x = w / 2 - 0.01,
    z = d / 2 - 0.01;
  const profile =
    shape === "slope"
      ? [
          [-z, 0],
          [z, 0],
          [z, h],
          [d / 2 - 1, h],
          [-z, 0.25 + ((h - 0.25) * 0.01) / (d - 1)],
        ]
      : [
          [-z, 0],
          [z, 0],
          [z, h],
          [-z, h],
        ];
  const vertices = [-x, x].flatMap((px) =>
    profile.map(([pz, py]) => new Vector3(px, py, pz).applyMatrix4(matrix)),
  );
  const edges = [new Vector3(1, 0, 0)];
  const normals = [new Vector3(1, 0, 0)];
  profile.forEach(([pz, py], i) => {
    const [nz, ny] = profile[(i + 1) % profile.length];
    edges.push(new Vector3(0, ny - py, nz - pz));
    normals.push(new Vector3(0, pz - nz, ny - py));
  });
  return {
    vertices,
    edges: edges.map((v) => v.transformDirection(matrix)),
    normals: normals.map((v) => v.transformDirection(matrix)),
    bounds: new Box3().setFromPoints(vertices),
  };
}

// Separating-axis test for convex prisms, including rotated ramps. If their
// solids intersect, find the smallest upward translation that separates them.
function penetrationLift(a: Body, b: Body, offset: number) {
  if (
    !a.bounds
      .clone()
      .translate(new Vector3(0, offset, 0))
      .intersectsBox(b.bounds)
  )
    return 0;
  const axes = [...a.normals, ...b.normals];
  for (const edge of a.edges)
    for (const other of b.edges) {
      const axis = new Vector3().crossVectors(edge, other);
      if (axis.lengthSq() > 1e-12) axes.push(axis.normalize());
    }
  let lift = Infinity;
  for (let axis of axes) {
    if (axis.y < 0) axis = axis.clone().negate();
    const av = a.vertices.map((v) => v.dot(axis) + offset * axis.y);
    const bv = b.vertices.map((v) => v.dot(axis));
    const minA = Math.min(...av),
      maxA = Math.max(...av);
    const minB = Math.min(...bv),
      maxB = Math.max(...bv);
    if (maxA <= minB + 1e-8 || maxB <= minA + 1e-8) return 0;
    if (axis.y > 1e-8) lift = Math.min(lift, (maxB - minA) / axis.y);
  }
  return Number.isFinite(lift) ? lift : 0;
}

/** A common lift preserves the relative positions of all members of a group. */
export function slopeClearance(moving: Body[], slopes: Body[], grid = false) {
  let lift = 0;
  // Every intersecting pair has a finite vertical interval. Once exited upwards,
  // it cannot be entered again, so at most one exit per pair is necessary.
  for (let pass = 0; pass <= moving.length * slopes.length; pass++) {
    const before = lift;
    for (const part of moving)
      for (const slope of slopes) {
        const amount = penetrationLift(part, slope, lift);
        if (amount > 1e-8) {
          lift += amount;
          if (grid) lift = Math.ceil((lift - 1e-8) / 0.4) * 0.4;
        }
      }
    if (lift === before) break;
  }
  return lift;
}
