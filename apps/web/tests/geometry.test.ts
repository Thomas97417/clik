import { describe, expect, it } from "vitest";
import {
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
  type Matrix4,
} from "three";
import {
  CATALOG,
  hasTopStud,
  hasBottomSocket,
  emptyScene,
  makePart,
  matrix,
  snapCandidate,
  type PartType,
} from "@clik/scene";
import { geometry } from "../src/lib/clik/geometry";

const types = Object.keys(CATALOG) as PartType[];
function cells(type: PartType, top = false) {
  const { w, d } = CATALOG[type];
  return Array.from({ length: w * d }, (_, i) => ({
    x: i % w,
    z: Math.floor(i / w),
  }))
    .filter(({ x, z }) =>
      top ? hasTopStud(type, z, x) : hasBottomSocket(type, x, z),
    )
    .map(({ x, z }) => ({ x, z, cx: x - (w - 1) / 2, cz: z - (d - 1) / 2 }));
}
function rimOffset(type: PartType, x: number, z: number) {
  return CATALOG[type].shape === "round" && Math.hypot(x, z) > 0
    ? new Vector3(-x, 0, -z).normalize().multiplyScalar(0.4)
    : new Vector3(0.4, 0, 0);
}
function hit(
  type: PartType,
  origin: Vector3,
  direction: Vector3,
  transform?: Matrix4,
) {
  const mesh = new Mesh(geometry(type), new MeshBasicMaterial());
  if (transform) mesh.applyMatrix4(transform);
  mesh.updateMatrixWorld(true);
  const intersection = new Raycaster(origin, direction).intersectObject(
    mesh,
  )[0];
  mesh.material.dispose();
  return intersection;
}

describe("Géométrie des emboîtements", () => {
  it.each(types)(
    "%s : logements ouverts, parois intérieures et plafond assez profond pour les plots",
    (type) => {
      const { w, d } = CATALOG[type];
      expect(geometry(type)).toBe(geometry(type));
      for (let x = 0; x < w; x++)
        for (let z = 0; z < d; z++) {
          if (!hasBottomSocket(type, x, z)) continue;
          const cx = x - (w - 1) / 2,
            cz = z - (d - 1) / 2;
          const ceiling = hit(
            type,
            new Vector3(cx, -1, cz),
            new Vector3(0, 1, 0),
          );
          expect(ceiling).toBeDefined();
          expect(ceiling.point.y).toBeGreaterThan(0.18);
          const rim = hit(
            type,
            new Vector3(cx, -1, cz).add(rimOffset(type, cx, cz)),
            new Vector3(0, 1, 0),
          );
          expect(rim.point.y).toBeCloseTo(0, 6);
          const wall = hit(
            type,
            new Vector3(cx, 0.1, cz),
            new Vector3(1, 0, 0),
          );
          expect(wall.distance).toBeCloseTo(0.325, 5);
          expect(wall.face!.normal.x).toBeLessThan(0);
        }
    },
  );
  it.each(types)(
    "%s : le bas se pose à zéro et les plots commencent sur le corps",
    (type) => {
      const { h, w, d } = CATALOG[type];
      const g = geometry(type);
      expect(g.boundingBox!.min.y).toBeCloseTo(0, 6);
      expect(g.boundingBox!.max.y).toBeCloseTo(
        h + (cells(type, true).length ? 0.18 : 0),
        6,
      );
      const anchor = cells(type, true)[0] ?? cells(type)[0];
      const top = hit(
        type,
        new Vector3(anchor.cx, h + 1, anchor.cz).add(
          rimOffset(type, anchor.cx, anchor.cz),
        ),
        new Vector3(0, -1, 0),
      );
      expect(top.point.y).toBeCloseTo(h, 6);
      expect(g.getAttribute("position").count).toBeLessThan(
        1000 * w * d + 1000,
      );
    },
  );
  it.each(types.filter((type) => cells(type, true).length > 0))(
    "%s : contact sans vide après aimantation, même après rotation",
    (type) => {
      const { h } = CATALOG[type];
      const target = makePart(type, "#4079e8", [2, 3, 4]);
      target.rotation = [0.3, 0.7, -0.2];
      const tm = matrix(target),
        normal = new Vector3(0, 1, 0).transformDirection(tm);
      const anchor = cells(type, true)[0];
      const center = new Vector3(anchor.cx, h, anchor.cz).applyMatrix4(tm);
      const upper = makePart(
        "brick-1x1",
        "#ef4444",
        center.clone().addScaledVector(normal, 0.15).toArray(),
      );
      upper.rotation = [...target.rotation];
      const result = snapCandidate(
        { ...emptyScene(), nodes: [target] },
        upper,
        true,
      );
      expect(result.kind).toBe("attachment");
      const um = matrix(result.part);
      const contact = rimOffset(type, anchor.cx, anchor.cz).applyMatrix4(um);
      const lowerRoof = hit(
        type,
        contact.clone().addScaledVector(normal, 0.1),
        normal.clone().negate(),
        tm,
      );
      const upperRim = hit(
        "brick-1x1",
        contact.clone().addScaledVector(normal, -0.1),
        normal,
        um,
      );
      expect(lowerRoof.point.distanceTo(upperRim.point)).toBeLessThan(0.00001);
      const studTop = new Vector3(anchor.cx, h + 0.18, anchor.cz)
        .applyMatrix4(tm)
        .applyMatrix4(um.clone().invert());
      expect(studTop.x).toBeCloseTo(0, 6);
      expect(studTop.z).toBeCloseTo(0, 6);
      expect(studTop.y).toBeCloseTo(0.18, 6);
    },
  );
});

describe("Nouveaux modèles du catalogue", () => {
  it.each(types)("%s : se fixe par ses logements inférieurs", (type) => {
    const target = makePart("brick-1x1", "#4079e8");
    const anchor = cells(type)[0];
    const upper = makePart(type, "#ef4444", [-anchor.cx, 1.3, -anchor.cz]);
    const result = snapCandidate(
      { ...emptyScene(), nodes: [target] },
      upper,
      true,
    );
    expect(result.kind).toBe("attachment");
    expect(result.part.position[1]).toBeCloseTo(1.2);
    expect(result.points.map((p) => p.position)).toEqual([[0, 1.2, 0]]);
  });
  it.each(types.filter((type) => CATALOG[type].shape === "slope"))(
    "%s : rampe continue et accroches uniquement sur la rangée haute",
    (type) => {
      const { w, d, h } = CATALOG[type];
      for (const z of [-d / 2 + 0.2, -0.25, d / 2 - 1, d / 2 - 0.15]) {
        const roof = hit(
          type,
          new Vector3(w / 2 - 0.1, h + 1, z),
          new Vector3(0, -1, 0),
        );
        const expected =
          z < d / 2 - 1 ? 0.25 + ((h - 0.25) * (z + d / 2)) / (d - 1) : h;
        expect(roof.point.y).toBeCloseTo(expected, 5);
      }
      const target = makePart(type, "#4079e8");
      const upper = makePart("brick-1x1", "#ef4444", [
        -(w - 1) / 2,
        h,
        -(d - 1) / 2,
      ]);
      expect(
        snapCandidate({ ...emptyScene(), nodes: [target] }, upper, true).kind,
      ).toBe("grid");
    },
  );
  it.each(types.filter((type) => cells(type, true).length === 0))(
    "%s : surface lisse sans plots ni accroches fictives",
    (type) => {
      const { w, d, h } = CATALOG[type];
      const target = makePart(type, "#4079e8");
      for (let x = 0; x < w; x++)
        for (let z = 0; z < d; z++) {
          if (!hasBottomSocket(type, x, z)) continue;
          const cx = x - (w - 1) / 2,
            cz = z - (d - 1) / 2;
          expect(
            hit(type, new Vector3(cx, h + 1, cz), new Vector3(0, -1, 0)).point
              .y,
          ).toBeCloseTo(h, 6);
          const upper = makePart("brick-1x1", "#ef4444", [cx, h, cz]);
          expect(
            snapCandidate({ ...emptyScene(), nodes: [target] }, upper, true)
              .kind,
          ).toBe("grid");
        }
    },
  );
});

describe("Volumes ouverts du catalogue", () => {
  it.each(["arch-1x4x3", "arch-1x6x3"] as const)(
    "%s : l’ouverture est traversable, la voûte et les montants sont visibles",
    (type) => {
      expect(
        hit(type, new Vector3(0, 1, 3), new Vector3(0, 0, -1)),
      ).toBeUndefined();
      expect(
        hit(type, new Vector3(0, 2.8, 3), new Vector3(0, 0, -1)).point.z,
      ).toBeCloseTo(0.49);
      expect(
        hit(type, new Vector3(0, -1, 0), new Vector3(0, 1, 0)).point.y,
      ).toBeCloseTo(2.4);
      expect(
        hit(
          type,
          new Vector3((CATALOG[type].w - 1) / 2, 1, 3),
          new Vector3(0, 0, -1),
        ).point.z,
      ).toBeCloseTo(0.49);
      const arch = makePart(type, "#4079e8", [0, 1.3, 0]);
      const support = makePart("brick-1x1", "#ef4444");
      expect(
        snapCandidate({ ...emptyScene(), nodes: [support] }, arch, true).kind,
      ).toBe("grid");
    },
  );
  it.each(["corner-brick-2x2", "corner-plate-2x2", "corner-tile-2x2"] as const)(
    "%s : le coin absent n’a ni matière ni accroche",
    (type) => {
      expect(
        hit(type, new Vector3(0.5, 3, 0.5), new Vector3(0, -1, 0)),
      ).toBeUndefined();
      const corner = makePart(type, "#4079e8");
      const upper = makePart("brick-1x1", "#ef4444", [
        0.5,
        CATALOG[type].h,
        0.5,
      ]);
      expect(
        snapCandidate({ ...emptyScene(), nodes: [corner] }, upper, true).kind,
      ).toBe("grid");
      const lower = makePart("brick-1x1", "#ef4444", [0.5, 0, 0.5]);
      expect(
        snapCandidate(
          { ...emptyScene(), nodes: [lower] },
          { ...corner, position: [0, 1.3, 0] },
          true,
        ).kind,
      ).toBe("grid");
    },
  );
  it.each(["round-brick-1x1", "round-plate-1x1", "round-tile-1x1"] as const)(
    "%s : le contour est circulaire",
    (type) => {
      expect(
        hit(type, new Vector3(0.4, 3, 0.4), new Vector3(0, -1, 0)),
      ).toBeUndefined();
      expect(
        hit(type, new Vector3(1, 0.1, 0), new Vector3(-1, 0, 0)).point.x,
      ).toBeCloseTo(0.49);
    },
  );
});

describe("Plaques et tuiles rondes de plusieurs diamètres", () => {
  it.each([
    [2, 4],
    [3, 5],
    [4, 12],
    [6, 24],
    [8, 44],
  ])(
    "diamètre %i : %i logements réels, et des plots uniquement sur la plaque",
    (size, count) => {
      const plate = `round-plate-${size}x${size}` as PartType;
      const tile = `round-tile-${size}x${size}` as PartType;
      expect(cells(plate)).toHaveLength(count);
      expect(cells(tile)).toHaveLength(count);
      expect(cells(plate, true)).toHaveLength(count);
      expect(cells(tile, true)).toHaveLength(0);
      for (const type of [plate, tile]) {
        // Bounding-square corners must remain empty, even below the piece.
        const x = size / 2 - 0.1;
        expect(
          hit(type, new Vector3(x, 2, x), new Vector3(0, -1, 0)),
        ).toBeUndefined();
        expect(
          hit(type, new Vector3(x, -1, x), new Vector3(0, 1, 0)),
        ).toBeUndefined();
        if (size > 2) {
          expect(hasBottomSocket(type, 0, 0)).toBe(false);
          expect(hasTopStud(type, 0, 0)).toBe(false);
          const support = makePart(type, "#4079e8");
          const corner = makePart("brick-1x1", "#ef4444", [
            (size - 1) / 2,
            0.4,
            (size - 1) / 2,
          ]);
          expect(
            snapCandidate({ ...emptyScene(), nodes: [support] }, corner, true)
              .kind,
          ).toBe("grid");
        }
      }
      const support = makePart(plate, "#4079e8");
      const upper = makePart(tile, "#ef4444", [0, 0.5, 0]);
      const result = snapCandidate(
        { ...emptyScene(), nodes: [support] },
        upper,
        true,
      );
      expect(result.kind).toBe("attachment");
      expect(result.part.position).toEqual([0, 0.4, 0]);
      expect(result.points).toHaveLength(count);
    },
  );
});
