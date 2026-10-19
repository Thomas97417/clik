import {
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Path,
  Shape,
  ShapeGeometry,
  Vector2,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  CATALOG,
  STUD_RADIUS,
  STUD_HEIGHT,
  SOCKET_RADIUS,
  bottomFootprints,
  footprintContains,
  hasBottomSocket,
  hasTopStud,
  partBoxes,
  partFootprint,
  profileRoofHeight,
  radialSections,
  verticalProfile,
  type PartDimensions,
  type PartType,
  type ProfilePoint,
} from "@clik/scene";

const segments = 24;
const profiledShapes = new Set([
  "inverted-slope",
  "curved-slope",
  "quarter",
  "cone",
  "dome",
  "grille",
  "masonry",
]);

function face(points: ProfilePoint[]) {
  return new Shape(points.map(([x, y]) => new Vector2(x, y)));
}

/** Replace only the contact plane with a perforated face and real cavities. */
function openBottom(source: BufferGeometry, top?: number) {
  const mesh = source.index ? source.toNonIndexed() : source;
  const positions = mesh.getAttribute("position");
  const keep: number[] = [];
  for (let i = 0; i < positions.count; i += 3) {
    const at = (y: number) =>
      [0, 1, 2].every((j) => Math.abs(positions.getY(i + j) - y) < 1e-6);
    if (at(0) || (top !== undefined && at(top))) continue;
    keep.push(i, i + 1, i + 2);
  }
  const result = new BufferGeometry();
  for (const name of ["position", "normal", "uv"]) {
    const attribute = mesh.getAttribute(name);
    const values = keep.flatMap((i) =>
      Array.from(
        { length: attribute.itemSize },
        (_, j) => attribute.array[i * attribute.itemSize + j],
      ),
    );
    result.setAttribute(
      name,
      new Float32BufferAttribute(values, attribute.itemSize),
    );
  }
  if (mesh !== source) mesh.dispose();
  source.dispose();
  return result;
}

function horizontalFace(
  points: ProfilePoint[],
  y: number,
  up: boolean,
  holes: Path[] = [],
) {
  const outline = face(points.map(([x, z]) => [x, up ? -z : z]));
  outline.holes = holes;
  const geometry = new ShapeGeometry(outline, segments / 2);
  geometry.rotateX(up ? -Math.PI / 2 : Math.PI / 2);
  geometry.translate(0, y, 0);
  return geometry.toNonIndexed();
}

function roundedBody(part: PartDimensions) {
  const outline = partFootprint(part),
    sections = radialSections(part);
  const vertices: number[] = [],
    normals: number[] = [];
  const point = (i: number, section: (typeof sections)[number]) => {
    const [x, z] = outline[i];
    return new Vector3(x * section.scale, section.y, z * section.scale);
  };
  const normal = (
    i: number,
    section: (typeof sections)[number],
    base: boolean,
  ) => {
    const [x, z] = outline[i],
      radius = Math.hypot(x, z);
    if (base) return new Vector3(x, 0, z).normalize();
    if (part.shape === "cone")
      return new Vector3(
        x / radius,
        radius / (part.h - 0.28),
        z / radius,
      ).normalize();
    const sine = Math.max(0, (section.y - 0.28) / (part.h - 0.28));
    return new Vector3(
      (section.scale * x) / radius,
      (sine * radius) / (part.h - 0.28),
      (section.scale * z) / radius,
    ).normalize();
  };
  const triangle = (points: Vector3[], directions: Vector3[]) => {
    if (
      new Vector3()
        .crossVectors(
          points[1].clone().sub(points[0]),
          points[2].clone().sub(points[0]),
        )
        .lengthSq() < 1e-14
    )
      return;
    points.forEach((p, i) => {
      vertices.push(...p.toArray());
      normals.push(...directions[i].toArray());
    });
  };
  sections.slice(1).forEach((top, level) => {
    const bottom = sections[level],
      base = level === 0;
    outline.forEach((_, i) => {
      const j = (i + 1) % outline.length;
      const a = point(i, bottom),
        b = point(j, bottom),
        c = point(j, top),
        d = point(i, top);
      const an = normal(i, bottom, base),
        bn = normal(j, bottom, base),
        cn = normal(j, top, base),
        dn = normal(i, top, base);
      triangle([a, d, c], [an, dn, cn]);
      triangle([a, c, b], [an, cn, bn]);
    });
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geometry.setAttribute(
    "uv",
    new Float32BufferAttribute(new Float32Array((vertices.length / 3) * 2), 2),
  );
  return geometry;
}

/** Recessed mortar is modelled in the surface, retaining exact outer dimensions. */
function masonry(part: PartDimensions) {
  const { w, d, h } = part;
  const inset = 0.035,
    gap = 0.045;
  const core = new BoxGeometry(w - inset * 2, h, d - inset * 2).translate(
    0,
    h / 2,
    0,
  );
  const parts = [openBottom(core, h)];
  for (let row = 0; row < 3; row++) {
    const low = (row * h) / 3 + (row ? gap / 2 : 0);
    const high = ((row + 1) * h) / 3 - (row < 2 ? gap / 2 : 0);
    for (const axis of ["x", "z"] as const) {
      const length = axis === "x" ? w : d;
      const cuts = [-length / 2, length / 2];
      for (
        let seam = -Math.ceil(length / 2) * 2 + (row % 2);
        seam < length / 2;
        seam += 2
      )
        if (seam > -length / 2 + 1e-6) cuts.push(seam);
      cuts.sort((a, b) => a - b);
      cuts.slice(1).forEach((right, i) => {
        const left = cuts[i] + (i ? gap / 2 : 0);
        const end = right - (i < cuts.length - 2 ? gap / 2 : 0);
        for (const sign of [-1, 1]) {
          const panel =
            axis === "x"
              ? new BoxGeometry(end - left, high - low, inset).translate(
                  (left + end) / 2,
                  (low + high) / 2,
                  sign * (d / 2 - inset / 2),
                )
              : new BoxGeometry(inset, high - low, end - left).translate(
                  sign * (w / 2 - inset / 2),
                  (low + high) / 2,
                  (left + end) / 2,
                );
          parts.push(openBottom(panel, h));
        }
      });
    }
  }
  parts.push(horizontalFace(partFootprint(part), h, true));
  return parts;
}

export function profileGeometry(type: PartType): BufferGeometry | null {
  const part = CATALOG[type];
  if (!profiledShapes.has(part.shape)) return null;
  const parts: BufferGeometry[] = [];
  if (part.shape === "inverted-slope" || part.shape === "curved-slope") {
    const shell = new ExtrudeGeometry(
      face(verticalProfile(part).map(([z, y]) => [-z, y])),
      { depth: part.w, bevelEnabled: false, curveSegments: 1 },
    );
    shell.rotateY(Math.PI / 2);
    shell.translate(-part.w / 2, 0, 0);
    parts.push(openBottom(shell));
  } else if (part.shape === "quarter") {
    const shell = new ExtrudeGeometry(
      face(partFootprint(part).map(([x, z]) => [x, -z])),
      { depth: part.h, bevelEnabled: false, curveSegments: 1 },
    );
    shell.rotateX(-Math.PI / 2);
    parts.push(openBottom(shell));
  } else if (part.shape === "cone" || part.shape === "dome") {
    parts.push(roundedBody(part));
  } else if (part.shape === "grille") {
    for (const { min, max } of partBoxes(part))
      parts.push(
        openBottom(
          new BoxGeometry(
            max[0] - min[0],
            max[1] - min[1],
            max[2] - min[2],
          ).translate(
            (min[0] + max[0]) / 2,
            (min[1] + max[1]) / 2,
            (min[2] + max[2]) / 2,
          ),
        ),
      );
  } else if (part.shape === "masonry") {
    parts.push(...masonry(part));
  }

  const holes: { x: number; z: number; path: Path }[] = [];
  for (let x = 0; x < part.w; x++)
    for (let z = 0; z < part.d; z++) {
      const cx = x - (part.w - 1) / 2,
        cz = z - (part.d - 1) / 2;
      if (hasBottomSocket(type, x, z)) {
        const depth = ["cone", "dome", "grille"].includes(part.shape)
          ? 0.2
          : part.shape === "curved-slope"
            ? Math.min(0.3, profileRoofHeight(part, cz - SOCKET_RADIUS) - 0.08)
            : part.h - 0.12;
        const path = new Path();
        path.absarc(cx, cz, SOCKET_RADIUS, 0, Math.PI * 2, true);
        holes.push({ x: cx, z: cz, path });
        const socket = new CylinderGeometry(
          SOCKET_RADIUS,
          SOCKET_RADIUS,
          depth,
          segments,
          1,
          true,
        );
        const indices = socket.index!,
          normals = socket.getAttribute("normal");
        for (let i = 0; i < indices.count; i += 3) {
          const second = indices.getX(i + 1);
          indices.setX(i + 1, indices.getX(i + 2));
          indices.setX(i + 2, second);
        }
        for (let i = 0; i < normals.array.length; i++) normals.array[i] *= -1;
        socket.translate(cx, depth / 2, cz);
        parts.push(socket.toNonIndexed());
        socket.dispose();
        const ceiling = new CircleGeometry(SOCKET_RADIUS, segments)
          .rotateX(Math.PI / 2)
          .translate(cx, depth, cz);
        parts.push(ceiling.toNonIndexed());
        ceiling.dispose();
      }
      if (hasTopStud(type, z, x)) {
        const stud = new CylinderGeometry(
          0.29,
          STUD_RADIUS,
          STUD_HEIGHT,
          segments,
        ).translate(cx, part.h + STUD_HEIGHT / 2, cz);
        parts.push(stud.toNonIndexed());
        stud.dispose();
      }
    }
  for (const footprint of bottomFootprints(part)) {
    const openings = holes
      .filter(({ x, z }) => footprintContains(footprint, x, z))
      .map(({ path }) => path);
    parts.push(horizontalFace(footprint, 0, false, openings));
  }
  const merged = mergeGeometries(parts);
  parts.forEach((geometry) => geometry.dispose());
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}
