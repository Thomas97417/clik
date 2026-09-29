import {
  BufferGeometry,
  CircleGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Path,
  Shape,
  ShapeGeometry,
  Vector2,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CATALOG, hasTopStud, type PartType } from "@clik/scene";

const geometries = new Map<PartType, BufferGeometry>();
const STUD_RADIUS = 0.3;
const STUD_HEIGHT = 0.18;
const SOCKET_RADIUS = STUD_RADIUS + 0.025;
const SEGMENTS = 24;

function outline(w: number, d: number, inset = 0) {
  const x = w / 2 - 0.01 - inset,
    z = d / 2 - 0.01 - inset,
    r = 0.045 - inset;
  const shape = new Shape();
  shape.moveTo(-x + r, -z);
  shape.lineTo(x - r, -z);
  shape.quadraticCurveTo(x, -z, x, -z + r);
  shape.lineTo(x, z - r);
  shape.quadraticCurveTo(x, z, x - r, z);
  shape.lineTo(-x + r, z);
  shape.quadraticCurveTo(-x, z, -x, z - r);
  shape.lineTo(-x, -z + r);
  shape.quadraticCurveTo(-x, -z, -x + r, -z);
  return shape;
}

// Split the roof at the slope's crease, so no triangle cuts across both planes.
function halfRoof(points: Vector2[], front: boolean, crease: number) {
  const result: Vector2[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    const inside = front ? a.y <= crease : a.y >= crease;
    if (inside) result.push(a);
    if (inside !== (front ? b.y <= crease : b.y >= crease))
      result.push(
        new Vector2(a.x + ((b.x - a.x) * (crease - a.y)) / (b.y - a.y), crease),
      );
  }
  return result;
}

export function geometry(type: PartType) {
  if (geometries.has(type)) return geometries.get(type)!;
  const { w, d, h } = CATALOG[type];
  const slope = CATALOG[type].shape === "slope";
  const crease = d / 2 - 1;
  const roofHeight = (z: number) =>
    slope && z < crease ? 0.25 + ((h - 0.25) * (z + d / 2)) / (d - 1) : h;
  const parts: BufferGeometry[] = [];
  const base = outline(w, d);
  const contour = (shape: Shape) => {
    const points = shape.getPoints(4).slice(0, -1);
    if (!slope) return points;
    return points.flatMap((a, i) => {
      const b = points[(i + 1) % points.length];
      return (a.y - crease) * (b.y - crease) < 0
        ? [
            a,
            new Vector2(
              a.x + ((b.x - a.x) * (crease - a.y)) / (b.y - a.y),
              crease,
            ),
          ]
        : [a];
    });
  };
  const outer = contour(base);
  const top = contour(outline(w, d, 0.012));

  for (let x = 0; x < w; x++)
    for (let z = 0; z < d; z++) {
      const cx = x - (w - 1) / 2,
        cz = z - (d - 1) / 2;
      // Keep the ceiling below even the lowest edge of a socket under a ramp.
      const socketDepth = slope
        ? Math.min(0.3, roofHeight(cz - SOCKET_RADIUS) - 0.08)
        : h - 0.12;
      const hole = new Path();
      hole.absarc(cx, cz, SOCKET_RADIUS, 0, Math.PI * 2, true);
      base.holes.push(hole);
      // Open underside, inward-facing walls, and a recessed ceiling. These are
      // actual cavities: picking and shadows use the same geometry as rendering.
      const socket = new CylinderGeometry(
        SOCKET_RADIUS,
        SOCKET_RADIUS,
        socketDepth,
        SEGMENTS,
        1,
        true,
      );
      const indices = socket.index!,
        normals = socket.getAttribute("normal");
      for (let i = 0; i < indices.count; i += 3) {
        const b = indices.getX(i + 1);
        indices.setX(i + 1, indices.getX(i + 2));
        indices.setX(i + 2, b);
      }
      for (let i = 0; i < normals.array.length; i++) normals.array[i] *= -1;
      socket.translate(cx, socketDepth / 2, cz);
      parts.push(socket.toNonIndexed());
      const ceiling = new CircleGeometry(SOCKET_RADIUS, SEGMENTS);
      ceiling.rotateX(Math.PI / 2);
      ceiling.translate(cx, socketDepth, cz);
      parts.push(ceiling.toNonIndexed());
      if (!hasTopStud(type, z)) continue;
      const stud = new CylinderGeometry(
        0.29,
        STUD_RADIUS,
        STUD_HEIGHT,
        SEGMENTS,
      );
      stud.translate(cx, h + STUD_HEIGHT / 2, cz);
      parts.push(stud.toNonIndexed());
    }

  const bottom = new Shape(outer);
  bottom.holes = base.holes;
  const underside = new ShapeGeometry(bottom, SEGMENTS / 2);
  underside.rotateX(Math.PI / 2);
  parts.push(underside.toNonIndexed());

  const walls: number[] = [];
  const quad = (a: number[], b: number[], c: number[], d: number[]) =>
    walls.push(...a, ...b, ...c, ...a, ...c, ...d);
  for (let i = 0; i < outer.length; i++) {
    const j = (i + 1) % outer.length,
      a = outer[i],
      b = outer[j],
      ta = top[i],
      tb = top[j];
    // Exact y=0 / y=h contact planes; only the upper edge has a tiny chamfer.
    quad(
      [a.x, 0, a.y],
      [a.x, roofHeight(a.y) - 0.012, a.y],
      [b.x, roofHeight(b.y) - 0.012, b.y],
      [b.x, 0, b.y],
    );
    quad(
      [a.x, roofHeight(a.y) - 0.012, a.y],
      [ta.x, roofHeight(ta.y), ta.y],
      [tb.x, roofHeight(tb.y), tb.y],
      [b.x, roofHeight(b.y) - 0.012, b.y],
    );
  }
  const sides = new BufferGeometry();
  sides.setAttribute("position", new Float32BufferAttribute(walls, 3));
  sides.setAttribute(
    "uv",
    new Float32BufferAttribute(new Float32Array((walls.length / 3) * 2), 2),
  );
  sides.computeVertexNormals();
  parts.push(sides);
  for (const points of slope
    ? [halfRoof(top, true, crease), halfRoof(top, false, crease)]
    : [top]) {
    const roof = new ShapeGeometry(
      new Shape(points.map((p) => new Vector2(p.x, -p.y))),
    );
    roof.rotateX(-Math.PI / 2);
    const position = roof.getAttribute("position");
    // Preserve Z when mapping the 2D roof into the scene, including off-center creases.
    for (let i = 0; i < position.count; i++)
      position.setY(i, roofHeight(position.getZ(i)));
    roof.computeVertexNormals();
    parts.push(roof.toNonIndexed());
  }
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  geometries.set(type, merged);
  return merged;
}
