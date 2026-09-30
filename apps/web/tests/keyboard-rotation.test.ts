import { beforeEach, expect, it } from "vitest";
import {
  emptyScene,
  group,
  hasOverlappingParts,
  makePart,
  worldMatrix,
} from "@clik/scene";
import { Vector3 } from "three";
import { useEditor } from "../src/lib/clik/store";

beforeEach(() => {
  useEditor.getState().load(emptyScene(), "Rotation");
  useEditor.setState({ snap: true });
});

it("tourne une pièce sélectionnée dans les deux sens avec une opération d’historique par pas", () => {
  const part = makePart("brick-2x4", "#4079e8", [4, 0, 2]);
  const s = useEditor.getState();
  s.load({ ...emptyScene(), nodes: [part] }, "Rotation");
  s.select(part.id);
  s.rotate(1);
  const rotated = useEditor.getState().scene;
  expect(rotated.nodes[0].rotation[1]).toBeCloseTo(Math.PI / 2);
  expect(rotated.nodes[0].position).toEqual(part.position);
  expect(useEditor.getState().past).toHaveLength(1);
  s.rotate(-1);
  expect(useEditor.getState().scene.nodes[0].rotation[1]).toBeCloseTo(0);
  s.undo();
  expect(useEditor.getState().scene).toBe(rotated);
  s.redo();
  expect(useEditor.getState().scene.nodes[0].rotation[1]).toBeCloseTo(0);
});

it("tourne groupes et sélections comme un ensemble rigide sans entraîner les branches verrouillées", () => {
  const a = makePart("brick-1x1", "#4079e8");
  const b = makePart("brick-1x1", "#4079e8", [4, 0, 0]);
  const c = makePart("brick-1x1", "#4079e8", [8, 0, 0]);
  const locked = makePart("brick-1x1", "#4079e8", [20, 0, 0]);
  locked.locked = true;
  const scene = group(
    { ...emptyScene(), nodes: [a, b, c, locked] },
    [a.id, b.id],
    "group",
  );
  const s = useEditor.getState();
  s.load(scene, "Rotation");
  useEditor.setState({
    selection: ["group", a.id, c.id, locked.id],
    snap: false,
  });
  s.rotate(1);
  const next = useEditor.getState().scene;
  const point = (id: string) =>
    new Vector3().setFromMatrixPosition(worldMatrix(next, id));
  expect(point(a.id).distanceTo(point(b.id))).toBeCloseTo(4);
  expect(point(a.id).distanceTo(point(c.id))).toBeCloseTo(8);
  expect(point(b.id).x).toBeCloseTo(0);
  expect(point(b.id).z).toBeCloseTo(-4);
  expect(worldMatrix(next, locked.id)).toEqual(worldMatrix(scene, locked.id));
  expect(useEditor.getState().past).toHaveLength(1);
});

it("respecte les collisions, le verrouillage, les gestes en cours et la clôture d’un défi", () => {
  const a = makePart("brick-1x4", "#4079e8");
  const b = makePart("brick-1x1", "#4079e8", [1.5, 0, 0]);
  const s = useEditor.getState();
  s.load({ ...emptyScene(), nodes: [a, b] }, "Rotation");
  s.select(a.id);
  s.rotate(1);
  expect(hasOverlappingParts(useEditor.getState().scene)).toBe(false);
  s.begin(a.id);
  const before = useEditor.getState().scene;
  s.rotate(-1);
  expect(useEditor.getState().scene).toBe(before);
  s.cancel();
  s.patch(a.id, { locked: true });
  const locked = useEditor.getState().scene;
  s.rotate(-1);
  expect(useEditor.getState().scene).toBe(locked);
  s.patch(a.id, { locked: false });
  useEditor.setState({
    challenge: { closesAt: 0, serverOffset: 0, stock: [] },
  });
  expect(() => s.rotate(-1)).toThrow("clos");
});
