import { describe, expect, it } from "vitest";
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import {
  CATALOG,
  emptyScene,
  hasBottomSocket,
  hasTopStud,
  hasOverlappingParts,
  makePart,
  snapCandidate,
  type PartType,
} from "@clik/scene";
import { geometry } from "../src/lib/clik/geometry";

function ray(
  type: PartType,
  from: [number, number, number],
  direction: [number, number, number],
) {
  const mesh = new Mesh(geometry(type), new MeshBasicMaterial());
  const result = new Raycaster(
    new Vector3(...from),
    new Vector3(...direction),
  ).intersectObject(mesh)[0];
  mesh.material.dispose();
  return result;
}
const roof = (type: PartType, x: number, z: number) =>
  ray(type, [x, CATALOG[type].h + 1, z], [0, -1, 0])?.point.y;
const overlaps = (
  a: ReturnType<typeof makePart>,
  b: ReturnType<typeof makePart>,
) => hasOverlappingParts({ ...emptyScene(), nodes: [a, b] });

describe("Profils des nouvelles familles", () => {
  it.each([
    "slope-inverted-2x1",
    "slope-inverted-2x2",
    "slope-inverted-3x2",
  ] as const)(
    "%s : accroches sur tout le dessus, logements seulement sous le talon",
    (type) => {
      const { w, d, h } = CATALOG[type];
      for (let x = 0; x < w; x++)
        for (let z = 0; z < d; z++) {
          expect(hasTopStud(type, z, x)).toBe(true);
          expect(hasBottomSocket(type, x, z)).toBe(z === d - 1);
        }
      const target = makePart(type, "#4079e8");
      const moving = makePart("brick-1x1", "#ef4444", [
        -(w - 1) / 2,
        h + 0.1,
        -(d - 1) / 2,
      ]);
      expect(
        snapCandidate({ ...emptyScene(), nodes: [target] }, moving, true).kind,
      ).toBe("attachment");
    },
  );

  it("la place sous une pente inversée reste libre jusqu’au contact réel", () => {
    const ramp = makePart("slope-inverted-2x2", "#4079e8", [0, 0.4, 0]);
    const plate = makePart("plate-1x1", "#ef4444", [0, 0, -0.5]);
    expect(overlaps(ramp, plate)).toBe(false);
    plate.position[1] = 0.01;
    expect(overlaps(ramp, plate)).toBe(true);
  });

  it.each([
    "slope-curved-2x1",
    "slope-curved-2x2",
    "slope-curved-3x2",
  ] as const)("%s : la courbe visible détermine la hauteur de pose", (type) => {
    const { d } = CATALOG[type];
    const front = roof(type, 0, -d / 2 + 0.1)!;
    const middle = roof(type, 0, 0)!;
    const back = roof(type, 0, d / 2 - 0.1)!;
    expect(front).toBeLessThan(middle);
    expect(middle).toBeLessThan(back);
    expect(middle).toBeGreaterThan((front + back) / 2);
    const ramp = makePart(type, "#4079e8");
    const moving = makePart("brick-1x1", "#ef4444", [0, 0.1, -d / 2 + 0.5]);
    const result = snapCandidate(
      { ...emptyScene(), nodes: [ramp] },
      moving,
      false,
    ).part;
    expect(result.position[1]).toBeCloseTo(roof(type, 0, -d / 2 + 1)!, 5);
    expect(overlaps(ramp, result)).toBe(false);
    expect(
      overlaps(ramp, {
        ...result,
        position: [
          result.position[0],
          result.position[1] - 0.001,
          result.position[2],
        ],
      }),
    ).toBe(true);
  });

  it.each([
    "round-quarter-plate-2x2",
    "round-quarter-tile-2x2",
    "round-quarter-plate-4x4",
    "round-quarter-tile-4x4",
  ] as const)("%s : le coin extérieur arrondi reste vide", (type) => {
    const { w, d } = CATALOG[type];
    const x = w / 2 - 0.1,
      z = d / 2 - 0.1;
    expect(roof(type, x, z)).toBeUndefined();
    expect(hasBottomSocket(type, w - 1, d - 1)).toBe(false);
    expect(
      overlaps(
        makePart(type, "#4079e8"),
        makePart("round-brick-1x1", "#ef4444", [x, 0, z]),
      ),
    ).toBe(false);
  });

  it.each([
    "round-cone-1x1",
    "round-cone-2x2",
    "round-dome-2x2",
    "round-dome-4x4",
  ] as const)(
    "%s : une calotte fermée, plus haute au centre, sans plots fictifs",
    (type) => {
      const { w, d, h } = CATALOG[type];
      const center = roof(type, 0.01, 0)!;
      expect(center).toBeGreaterThan(h * 0.95);
      expect(center).toBeGreaterThan(roof(type, w * 0.4, 0)!);
      for (let x = 0; x < w; x++)
        for (let z = 0; z < d; z++) expect(hasTopStud(type, z, x)).toBe(false);
    },
  );

  it("le dôme accepte une pièce dans l’espace libre au-dessus de son bord", () => {
    const dome = makePart("round-dome-4x4", "#4079e8");
    const piece = makePart("brick-1x1", "#ef4444", [1.5, 2.1, 1.5]);
    expect(overlaps(dome, piece)).toBe(false);
    expect(
      snapCandidate({ ...emptyScene(), nodes: [dome] }, piece, false).part,
    ).toBe(piece);
    piece.position[1] = 1;
    expect(overlaps(dome, piece)).toBe(true);
    expect(
      snapCandidate({ ...emptyScene(), nodes: [dome] }, piece, false).part
        .position[1],
    ).toBeLessThan(2.1);
  });

  it.each(["tile-grille-1x2", "tile-grille-2x2"] as const)(
    "%s : les rainures et le fond sont réellement modélisés",
    (type) => {
      const rib = roof(type, 0, 0)!;
      const recess = roof(type, 0, 0.2)!;
      expect(rib).toBeCloseTo(0.4, 6);
      expect(recess).toBeCloseTo(0.28, 6);
    },
  );

  it.each(["brick-masonry-1x2", "brick-masonry-1x4"] as const)(
    "%s : joints creusés et faces extérieures à la dimension nominale",
    (type) => {
      const panel = ray(type, [0.4, 0.2, 3], [0, 0, -1])!.point.z;
      const joint = ray(type, [0.4, 0.4, 3], [0, 0, -1])!.point.z;
      expect(panel).toBeCloseTo(0.5, 6);
      expect(joint).toBeCloseTo(0.465, 6);
    },
  );
});
