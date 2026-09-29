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
  emptyScene,
  makePart,
  matrix,
  snapCandidate,
  type PartType,
} from "@clik/scene";
import { geometry } from "../src/lib/clik/geometry";

const types = Object.keys(CATALOG) as PartType[];
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
            new Vector3(cx + 0.4, -1, cz),
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
        h + (hasTopStud(type, d - 1) ? 0.18 : 0),
        6,
      );
      // Between studs, over the flat rear half even for the slope.
      const top = hit(
        type,
        new Vector3((w - 1) / 2 + 0.4, h + 1, (d - 1) / 2),
        new Vector3(0, -1, 0),
      );
      expect(top.point.y).toBeCloseTo(h, 6);
      expect(g.getAttribute("position").count).toBeLessThan(
        1000 * w * d + 1000,
      );
    },
  );
  it.each(types.filter((type) => CATALOG[type].shape !== "tile"))(
    "%s : contact sans vide après aimantation, même après rotation",
    (type) => {
      const { h, w, d } = CATALOG[type];
      const target = makePart(type, "#4079e8", [2, 3, 4]);
      target.rotation = [0.3, 0.7, -0.2];
      const tm = matrix(target),
        normal = new Vector3(0, 1, 0).transformDirection(tm);
      const center = new Vector3((w - 1) / 2, h, (d - 1) / 2).applyMatrix4(tm);
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
      const contact = new Vector3(0.4, 0, 0).applyMatrix4(um);
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
      const studTop = new Vector3((w - 1) / 2, h + 0.18, (d - 1) / 2)
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
    const { w, d } = CATALOG[type];
    const target = makePart("brick-1x1", "#4079e8");
    const upper = makePart(type, "#ef4444", [(w - 1) / 2, 1.3, (d - 1) / 2]);
    const result = snapCandidate(
      { ...emptyScene(), nodes: [target] },
      upper,
      true,
    );
    expect(result.kind).toBe("attachment");
    expect(result.part.position[1]).toBeCloseTo(1.2);
    expect(result.points).toEqual([[0, 1.2, 0]]);
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
  it.each(types.filter((type) => CATALOG[type].shape === "tile"))(
    "%s : surface lisse sans plots ni accroches fictives",
    (type) => {
      const { w, d, h } = CATALOG[type];
      const target = makePart(type, "#4079e8");
      for (let x = 0; x < w; x++)
        for (let z = 0; z < d; z++) {
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
