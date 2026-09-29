import { describe, expect, it } from "vitest";
import { Matrix4, Vector3 } from "three";
import {
  CATALOG,
  emptyScene,
  makePart,
  snapCandidate,
  previewSelection,
  hasOverlappingParts,
  group,
  worldMatrix,
  type PartType,
} from "@clik/scene";
import { useEditor } from "../src/lib/clik/store";

describe("collisions des pièces", () => {
  it.each(Object.keys(CATALOG) as PartType[])(
    "%s occupe son volume avec et sans aimantation",
    (type) => {
      const target = makePart(type, "#4079e8");
      const scene = { ...emptyScene(), nodes: [target] };
      const moving = makePart("brick-2x2", "#ef4444", [
        CATALOG[type].shape === "arch" ? -(CATALOG[type].w - 1) / 2 : 0,
        0.1,
        0,
      ]);
      for (const enabled of [false, true]) {
        const preview = snapCandidate(scene, moving, enabled);
        expect(preview.part.position[1]).toBeCloseTo(CATALOG[type].h);
        expect(
          hasOverlappingParts({ ...scene, nodes: [target, preview.part] }),
        ).toBe(false);
      }
      expect(target.position).toEqual([0, 0, 0]);
    },
  );

  it("corrige un chevauchement créé uniquement par l’arrondi sur la grille", () => {
    const target = makePart("brick-1x1", "#4079e8", [1.4, 0, 0.5]);
    const moving = makePart("brick-1x1", "#ef4444", [0.4, 0, 0.5]);
    const scene = { ...emptyScene(), nodes: [target] };
    expect(snapCandidate(scene, moving, false).part).toBe(moving);
    const preview = snapCandidate(scene, moving, true);
    expect(preview.part.position[1]).toBeCloseTo(1.2);
    expect(
      hasOverlappingParts({ ...scene, nodes: [target, preview.part] }),
    ).toBe(false);
  });

  it("les pièces cachées et verrouillées occupent toujours de l’espace", () => {
    const target = {
      ...makePart("brick-2x2", "#4079e8"),
      hidden: true,
      locked: true,
    };
    const preview = snapCandidate(
      { ...emptyScene(), nodes: [target] },
      makePart("brick-1x1", "#ef4444"),
      false,
    );
    expect(preview.part.position[1]).toBeCloseTo(1.2);
  });

  it("conserve un contact normal sans confondre les boîtes englobantes tournées", () => {
    const a = makePart("brick-1x4", "#4079e8");
    a.rotation[1] = Math.PI / 4;
    const b = makePart("brick-1x4", "#ef4444", [
      Math.SQRT1_2 * 1.1,
      0,
      Math.SQRT1_2 * 1.1,
    ]);
    b.rotation = [...a.rotation];
    const scene = { ...emptyScene(), nodes: [a] };
    expect(snapCandidate(scene, b, false).part).toBe(b);
    expect(hasOverlappingParts({ ...scene, nodes: [a, b] })).toBe(false);
    const stacked = {
      ...a,
      id: "upper",
      position: [0, 1.2, 0] as [number, number, number],
    };
    expect(snapCandidate(scene, stacked, true).kind).toBe("attachment");
    expect(hasOverlappingParts({ ...scene, nodes: [a, stacked] })).toBe(false);
  });

  it("sort un groupe entier d’une pile sans déformer ses enfants", () => {
    const targets = [0, 1.2, 2.4].map((y) =>
      makePart("brick-2x2", "#4079e8", [0, y, 0]),
    );
    const a = makePart("brick-2x2", "#ef4444", [4, 0, 0]);
    const b = makePart("brick-2x2", "#ef4444");
    const scene = group(
      { ...emptyScene(), nodes: [...targets, a, b] },
      [a.id, b.id],
      "assembly",
    );
    for (const enabled of [false, true]) {
      const preview = previewSelection(scene, ["assembly"], enabled, a.id);
      expect(hasOverlappingParts(preview.scene)).toBe(false);
      const first = new Vector3().setFromMatrixPosition(
        worldMatrix(preview.scene, a.id),
      );
      const second = new Vector3().setFromMatrixPosition(
        worldMatrix(preview.scene, b.id),
      );
      expect(first.y).toBeCloseTo(3.6);
      expect(first.clone().sub(second).toArray()).toEqual([4, 0, 0]);
      if (enabled) expect(preview.points).toHaveLength(4);
    }
  });

  it("corrige les positions numériques et conserve un seul historique", () => {
    const target = makePart("brick-2x2", "#4079e8");
    const moving = makePart("brick-2x2", "#ef4444", [3, 0, 0]);
    const scene = { ...emptyScene(), nodes: [target, moving] };
    const s = useEditor.getState();
    s.load(scene, "Collision");
    s.patch(moving.id, { position: [0, 0, 0] });
    expect(useEditor.getState().scene.nodes[1].position).toEqual([0, 1.2, 0]);
    expect(useEditor.getState().past).toHaveLength(1);
    s.patch(moving.id, { position: [0, 0, 0] });
    expect(useEditor.getState().past).toHaveLength(1);
    s.undo();
    expect(useEditor.getState().scene).toEqual(scene);
    s.redo();
    expect(hasOverlappingParts(useEditor.getState().scene)).toBe(false);
  });

  it("la rotation et le déplacement déposent exactement l’aperçu corrigé", () => {
    const target = makePart("brick-2x2", "#4079e8");
    const moving = makePart("brick-1x4", "#ef4444", [0, 0, 2]);
    const scene = { ...emptyScene(), nodes: [target, moving] };
    const s = useEditor.getState();
    s.load(scene, "Rotation");
    useEditor.setState({ selection: [moving.id], snap: true });
    s.begin(moving.id);
    s.preview(
      new Matrix4()
        .makeRotationY(Math.PI / 2)
        .multiply(new Matrix4().makeTranslation(0, 0, -2)),
    );
    const preview = useEditor.getState().snapPreview!.scene;
    expect(preview.nodes[1].position[1]).toBeGreaterThanOrEqual(1.2);
    expect(hasOverlappingParts(useEditor.getState().scene)).toBe(false);
    expect(hasOverlappingParts(preview)).toBe(false);
    s.end();
    expect(useEditor.getState().scene).toEqual(preview);
    expect(useEditor.getState().past).toHaveLength(1);
    s.undo();
    expect(useEditor.getState().scene).toEqual(scene);
  });
});

describe("Collisions des formes concaves et rondes", () => {
  it.each(["arch-1x4x3", "arch-1x6x3"] as const)(
    "%s laisse passer une pièce sous la voûte, même tournée",
    (type) => {
      for (const rotation of [
        [0, 0, 0],
        [0, Math.PI / 2, 0],
        [0.2, 0.7, -0.15],
      ] as [number, number, number][]) {
        const arch = { ...makePart(type, "#4079e8", [2, 4, -3]), rotation };
        const scene = { ...emptyScene(), nodes: [arch] };
        const tm = worldMatrix(scene, arch.id);
        const free = makePart(
          "brick-1x1",
          "#ef4444",
          new Vector3(0, 0.2, 0).applyMatrix4(tm).toArray(),
        );
        free.rotation = [...rotation];
        expect(hasOverlappingParts({ ...scene, nodes: [arch, free] })).toBe(
          false,
        );
        expect(snapCandidate(scene, free, false).part.position).toEqual(
          free.position,
        );
        for (const [x, y] of [
          [0, 2.1],
          [(CATALOG[type].w - 1) / 2, 0.2],
        ]) {
          const blocked = {
            ...free,
            position: new Vector3(x, y, 0).applyMatrix4(tm).toArray() as [
              number,
              number,
              number,
            ],
          };
          expect(
            hasOverlappingParts({ ...scene, nodes: [arch, blocked] }),
          ).toBe(true);
          const corrected = snapCandidate(scene, blocked, false).part;
          expect(
            hasOverlappingParts({ ...scene, nodes: [arch, corrected] }),
          ).toBe(false);
        }
      }
    },
  );
  it("la pièce d’angle accueille une brique dans son coin, sans laisser traverser ses bras", () => {
    for (const turn of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const corner = makePart("corner-brick-2x2", "#4079e8");
      corner.rotation[1] = turn;
      const scene = { ...emptyScene(), nodes: [corner] };
      const tm = worldMatrix(scene, corner.id);
      for (const [x, z, overlap] of [
        [0.5, 0.5, false],
        [-0.5, 0.5, true],
        [0.5, -0.5, true],
        [-0.5, -0.5, true],
      ] as const) {
        const brick = makePart(
          "brick-1x1",
          "#ef4444",
          new Vector3(x, 0, z).applyMatrix4(tm).toArray(),
        );
        brick.rotation[1] = turn;
        expect(hasOverlappingParts({ ...scene, nodes: [corner, brick] })).toBe(
          overlap,
        );
        const result = snapCandidate(scene, brick, false).part;
        expect(result.position[1]).toBeCloseTo(overlap ? 1.2 : 0);
      }
    }
  });
  it("deux pièces rondes peuvent rapprocher leurs boîtes sans se traverser", () => {
    const first = makePart("round-brick-1x1", "#4079e8");
    const second = makePart("round-brick-1x1", "#ef4444", [0.75, 0, 0.75]);
    expect(
      hasOverlappingParts({ ...emptyScene(), nodes: [first, second] }),
    ).toBe(false);
    second.position = [0.6, 0, 0.6];
    expect(
      hasOverlappingParts({ ...emptyScene(), nodes: [first, second] }),
    ).toBe(true);
  });
});

it.each([2, 3, 4, 6, 8])(
  "diamètre %i : collisions sur le disque, pas dans les coins de sa boîte",
  (size) => {
    for (const family of ["plate", "tile"]) {
      const disk = makePart(
        `round-${family}-${size}x${size}` as PartType,
        "#4079e8",
      );
      const scene = { ...emptyScene(), nodes: [disk] };
      const neighbor = makePart("round-brick-1x1", "#ef4444", [
        size / 2 + 0.25,
        0,
        size / 2 + 0.25,
      ]);
      expect(hasOverlappingParts({ ...scene, nodes: [disk, neighbor] })).toBe(
        false,
      );
      expect(snapCandidate(scene, neighbor, false).part).toBe(neighbor);
      neighbor.position = [size / 2 - 0.2, 0, 0];
      expect(hasOverlappingParts({ ...scene, nodes: [disk, neighbor] })).toBe(
        true,
      );
      expect(
        snapCandidate(scene, neighbor, false).part.position[1],
      ).toBeCloseTo(0.4);
    }
  },
);
