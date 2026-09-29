import { describe, expect, it } from "vitest";
import { Matrix4, Vector3 } from "three";
import {
  CATALOG,
  emptyScene,
  group,
  makePart,
  previewSelection,
  snapCandidate,
  worldMatrix,
  type PartType,
} from "@clik/scene";
import { useEditor } from "../src/lib/clik/store";

const slopes = (Object.keys(CATALOG) as PartType[]).filter(
  (type) => CATALOG[type].shape === "slope",
);

describe("placement sur les rampes", () => {
  it.each(slopes)(
    "%s : protège toute l’empreinte, avec et sans aimantation",
    (type) => {
      const { d, h } = CATALOG[type];
      const target = makePart(type, "#4079e8");
      const scene = { ...emptyScene(), nodes: [target] };
      const z = -(d - 1) / 2;
      const heightAtPointer = 0.25 + ((h - 0.25) * 0.5) / (d - 1);
      const piece = makePart("brick-1x1", "#ef4444", [0, heightAtPointer, z]);
      for (const enabled of [false, true]) {
        const result = snapCandidate(scene, piece, enabled);
        // The uphill edge is higher than the center seen by the pointer.
        const highestZ = Math.min(d / 2 - 1, result.part.position[2] + 0.49);
        const roof = 0.25 + ((h - 0.25) * (highestZ + d / 2)) / (d - 1);
        expect(result.part.position[1]).toBeGreaterThanOrEqual(roof - 1e-8);
        expect(result.points).toEqual([]);
        if (enabled)
          expect(result.part.position[1] / 0.4).toBeCloseTo(
            Math.round(result.part.position[1] / 0.4),
          );
      }
      const free = snapCandidate(scene, piece, false).part;
      expect(free.position[1]).toBeCloseTo(
        0.25 + ((h - 0.25) * 0.99) / (d - 1),
        8,
      );
    },
  );

  it("ne laisse pas l’arrondi de grille abaisser une pièce dans la rampe", () => {
    const target = makePart("slope-3x2", "#4079e8");
    const piece = makePart("brick-1x1", "#ef4444", [0.5, 0.95, 0]);
    const result = snapCandidate(
      { ...emptyScene(), nodes: [target] },
      piece,
      true,
    );
    expect(result.part.position[1]).toBeCloseTo(1.2);
    expect(result.kind).toBe("grid");
  });

  it.each([Math.PI / 2, -Math.PI / 2, Math.PI / 4])(
    "rampe tournée de %s : tient compte de l’orientation",
    (angle) => {
      const target = makePart("slope-2x2", "#4079e8", [3, 2, -4]);
      target.rotation[1] = angle;
      const scene = { ...emptyScene(), nodes: [target] };
      const point = new Vector3(0, 0.725, -0.5).applyMatrix4(
        worldMatrix(scene, target.id),
      );
      const piece = makePart("brick-1x1", "#ef4444", point.toArray());
      piece.rotation[1] = angle;
      const result = snapCandidate(scene, piece, false).part;
      expect(result.position[1]).toBeCloseTo(3.1905, 8);
      expect(result.rotation).toEqual(piece.rotation);
    },
  );

  it("conserve l’emboîtement sur les plots arrière et les placements voisins", () => {
    const target = makePart("slope-2x2", "#4079e8");
    const scene = { ...emptyScene(), nodes: [target] };
    const attached = snapCandidate(
      scene,
      makePart("brick-1x1", "#ef4444", [0.5, 1.3, 0.5]),
      true,
    );
    expect(attached.kind).toBe("attachment");
    expect(attached.part.position[1]).toBeCloseTo(1.2);
    expect(attached.points).toHaveLength(1);
    const beside = makePart("brick-1x1", "#ef4444", [1.5, 0, -0.5]);
    expect(snapCandidate(scene, beside, false).part).toBe(beside);
    target.hidden = true;
    const inside = makePart("brick-1x1", "#ef4444", [0, 0.5, -0.5]);
    expect(snapCandidate(scene, inside, false).part).toBe(inside);
  });

  it("respecte l’inclinaison et la visibilité héritées du groupe de la pente", () => {
    const target = makePart("slope-2x2", "#4079e8");
    const scene = group(
      { ...emptyScene(), nodes: [target] },
      [target.id],
      "ramp",
    );
    const parent = scene.nodes.find((n) => n.id === "ramp")!;
    parent.rotation[0] = 0.3;
    const position = new Vector3(0, 0.725, -0.5).applyMatrix4(
      worldMatrix(scene, target.id),
    );
    const piece = makePart("brick-1x1", "#ef4444", position.toArray());
    piece.rotation[0] = 0.3;
    const result = snapCandidate(scene, piece, false).part;
    const lift = (1.1905 - 0.725) / (Math.cos(0.3) + 0.95 * Math.sin(0.3));
    expect(result.position[1]).toBeCloseTo(position.y + lift, 8);
    parent.hidden = true;
    expect(snapCandidate(scene, piece, false).part).toBe(piece);
  });

  it("soulève le groupe entier même si la pièce saisie n’est pas sur la pente", () => {
    const target = makePart("slope-2x2", "#4079e8");
    const a = makePart("brick-1x1", "#ef4444", [4, 0.725, -0.5]);
    const b = makePart("brick-1x1", "#ef4444", [0, 0.725, -0.5]);
    const scene = group(
      { ...emptyScene(), nodes: [target, a, b] },
      [a.id, b.id],
      "assembly",
    );
    for (const enabled of [false, true]) {
      const preview = previewSelection(scene, ["assembly"], enabled, a.id);
      const first = new Vector3().setFromMatrixPosition(
        worldMatrix(preview.scene, a.id),
      );
      const second = new Vector3().setFromMatrixPosition(
        worldMatrix(preview.scene, b.id),
      );
      expect(second.y).toBeGreaterThanOrEqual(1.1905 - 1e-8);
      expect(first.clone().sub(second).toArray()).toEqual([4, 0, 0]);
      expect(preview.points).toEqual([]);
    }
  });

  it("affiche et dépose la position protégée, avec une seule opération annulable", () => {
    const target = makePart("slope-2x2", "#4079e8");
    const moving = makePart("brick-1x1", "#ef4444", [3, 0.725, -0.5]);
    const scene = { ...emptyScene(), nodes: [target, moving] };
    const store = useEditor.getState();
    store.load(scene, "Pente");
    useEditor.setState({ selection: [moving.id], snap: false });
    store.begin(moving.id);
    store.preview(new Matrix4().makeTranslation(-3, 0, 0));
    const shown = useEditor.getState().scene;
    expect(shown.nodes[1].position[1]).toBeCloseTo(1.1905);
    store.end();
    expect(useEditor.getState().scene).toEqual(shown);
    expect(useEditor.getState().past).toHaveLength(1);
    store.undo();
    expect(useEditor.getState().scene).toEqual(scene);
  });
});
