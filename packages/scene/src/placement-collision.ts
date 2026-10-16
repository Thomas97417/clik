import { Box3, Matrix4, Vector3 } from "three";
import {
  archProfile,
  roundProfile,
  slopeCrease,
  slopeRoofHeight,
  type PartDimensions,
} from "./part-shapes";

type Body = {
  vertices: Vector3[];
  normals: Vector3[];
  edges: Vector3[];
  bounds: Box3;
  pieces?: Body[];
};

function prism(profile: Vector3[], extrusion: Vector3, matrix: Matrix4): Body {
  const vertices = profile.flatMap((point) => [
    point.clone().applyMatrix4(matrix),
    point.clone().add(extrusion).applyMatrix4(matrix),
  ]);
  const edges = [extrusion.clone()];
  const normals = [extrusion.clone()];
  profile.forEach((point, i) => {
    const edge = profile[(i + 1) % profile.length].clone().sub(point);
    edges.push(edge);
    normals.push(new Vector3().crossVectors(edge, extrusion));
  });
  return {
    vertices,
    edges: edges.map((v) => v.transformDirection(matrix)),
    normals: normals.map((v) => v.transformDirection(matrix)),
    bounds: new Box3().setFromPoints(vertices),
  };
}
function compound(pieces: Body[]): Body {
  return {
    pieces,
    vertices: [],
    edges: [],
    normals: [],
    bounds: pieces.reduce((box, piece) => box.union(piece.bounds), new Box3()),
  };
}

const solids = (body: Body): Body[] =>
  body.pieces ? body.pieces.flatMap(solids) : [body];

function separatingAxes(a: Body, b: Body) {
  const axes = [...a.normals, ...b.normals];
  for (const edge of a.edges)
    for (const other of b.edges) {
      const axis = new Vector3().crossVectors(edge, other);
      if (axis.lengthSq() > 1e-12) axes.push(axis.normalize());
    }
  return axes;
}

// Studs intentionally enter sockets. Concave shapes are unions of convex solids.
export function placementBody(
  dimensions: PartDimensions,
  matrix: Matrix4,
): Body {
  const { w, d, h, shape } = dimensions;
  if (shape === "round") {
    return prism(
      roundProfile(w, d).map(([x, z]) => new Vector3(x, 0, z)),
      new Vector3(0, h, 0),
      matrix,
    );
  }
  if (shape === "corner") {
    const x = w / 2,
      z = d / 2,
      cut = 0;
    const rectangle = (
      left: number,
      right: number,
      front: number,
      back: number,
    ) =>
      prism(
        [
          [left, front],
          [right, front],
          [right, back],
          [left, back],
        ].map(([px, pz]) => new Vector3(px, 0, pz)),
        new Vector3(0, h, 0),
        matrix,
      );
    return compound([rectangle(-x, x, -z, cut), rectangle(-x, cut, cut, z)]);
  }
  if (shape === "arch") {
    const curve = archProfile(dimensions);
    const sections: [number, number][][] = [
      [
        [-w / 2, 0],
        [curve[0][0], 0],
        [curve[0][0], h],
        [-w / 2, h],
      ],
      [
        [curve[curve.length - 1][0], 0],
        [w / 2, 0],
        [w / 2, h],
        [curve[curve.length - 1][0], h],
      ],
      ...curve
        .slice(0, -1)
        .map((point, i) => [
          point,
          curve[i + 1],
          [curve[i + 1][0], h] as [number, number],
          [point[0], h] as [number, number],
        ]),
    ];
    return compound(
      sections.map((section) =>
        prism(
          section.map(([x, y]) => new Vector3(x, y, -d / 2)),
          new Vector3(0, 0, d),
          matrix,
        ),
      ),
    );
  }
  const x = w / 2,
    z = d / 2;
  const profile =
    shape === "slope"
      ? [
          [-z, 0],
          [z, 0],
          [z, h],
          [slopeCrease(dimensions), h],
          [-z, slopeRoofHeight(dimensions, -z)],
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
  if (a.pieces || b.pieces) {
    let lift = 0;
    for (const part of a.pieces ?? [a])
      for (const other of b.pieces ?? [b])
        lift = Math.max(lift, penetrationLift(part, other, offset));
    return lift;
  }
  let lift = Infinity;
  for (let axis of separatingAxes(a, b)) {
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
export function collisionClearance(
  moving: Body[],
  obstacles: Body[],
  grid = false,
) {
  moving = moving.flatMap(solids);
  obstacles = obstacles.flatMap(solids);
  let lift = 0;
  // Every intersecting pair has a finite vertical interval. Once exited upwards,
  // it cannot be entered again, so at most one exit per pair is necessary.
  for (let pass = 0; pass <= moving.length * obstacles.length; pass++) {
    const before = lift;
    for (const part of moving)
      for (const obstacle of obstacles) {
        const amount = penetrationLift(part, obstacle, lift);
        if (amount > 1e-8) {
          lift += amount;
          if (grid) lift = Math.ceil((lift - 1e-8) / 0.4) * 0.4;
        }
      }
    if (lift === before) break;
  }
  return lift;
}

export function bodiesOverlap(a: Body, b: Body) {
  return penetrationLift(a, b, 0) > 1e-8;
}

// Sweep a convex solid along world Y. Intersect its overlap intervals on every
// separating axis to find the first contact, even if the endpoint is free.
function verticalContact(a: Body, b: Body, direction: number, limit: number) {
  const swept = a.bounds.clone();
  swept.min.y += Math.min(0, direction * limit);
  swept.max.y += Math.max(0, direction * limit);
  if (!swept.intersectsBox(b.bounds)) return limit;

  let enter = -Infinity,
    exit = Infinity;
  for (const axis of separatingAxes(a, b)) {
    const av = a.vertices.map((v) => v.dot(axis));
    const bv = b.vertices.map((v) => v.dot(axis));
    const minA = Math.min(...av),
      maxA = Math.max(...av),
      minB = Math.min(...bv),
      maxB = Math.max(...bv);
    const speed = direction * axis.y;
    if (Math.abs(speed) <= 1e-8) {
      if (maxA <= minB + 1e-8 || maxB <= minA + 1e-8) return limit;
      continue;
    }
    const first = (minB - maxA) / speed;
    const last = (maxB - minA) / speed;
    enter = Math.max(enter, Math.min(first, last));
    exit = Math.min(exit, Math.max(first, last));
    if (exit <= Math.max(enter, 0) + 1e-8) return limit;
  }
  return Math.min(limit, Math.max(0, enter));
}

/** Stop a rigid selection at the first obstacle or the floor, without a gap. */
export function verticalTravel(
  moving: Body[],
  obstacles: Body[],
  amount: number,
) {
  if (!moving.length || !amount) return 0;
  const direction = Math.sign(amount);
  const bottom = Math.min(...moving.map((body) => body.bounds.min.y));
  let distance = Math.abs(amount);
  if (direction < 0) distance = Math.min(distance, Math.max(0, bottom));
  const targets = obstacles.flatMap(solids);
  for (const part of moving.flatMap(solids))
    for (const obstacle of targets) {
      distance = verticalContact(part, obstacle, direction, distance);
      if (distance <= 1e-8) return 0;
    }
  const travel = direction * distance;
  return bottom + travel < -1e-6 ? 0 : travel;
}
