// Browser-only load fixture, imported through Vite by the performance tests.
import {
  emptyScene,
  makePart,
  matrix,
  validateScene,
  type SceneNode,
} from "@clik/scene";
import { useEditor } from "../src/lib/clik/store";

export function loadHierarchyBenchmark(depth = 100, partCount = 500) {
  const nodes: SceneNode[] = [
    ...Array.from({ length: depth }, (_, i): SceneNode => ({
      id: `g${i}`,
      kind: "group",
      name: `Groupe ${i}`,
      parentId: i ? `g${i - 1}` : null,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      hidden: false,
      locked: false,
    })),
    ...Array.from({ length: partCount }, (_, i) => ({
      ...makePart("brick-2x4", "#4079e8", [
        (i % 20) * 5,
        0,
        Math.floor(i / 20) * 3,
      ]),
      id: `p${i}`,
      parentId: `g${depth - 1}`,
    })),
  ];
  useEditor
    .getState()
    .load(validateScene({ ...emptyScene(), nodes }), "Charge hiérarchique");
  useEditor.setState({ selection: ["p250"] });
}

export async function measureHierarchyPreviews() {
  const canvas = document.querySelector<HTMLCanvasElement>(".viewport canvas")!;
  useEditor.getState().begin("p250");
  const frames = Number(canvas.dataset.frames),
    start = performance.now();
  const previews: number[] = [];
  for (let i = 0; i < 90; i++) {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    const start = performance.now();
    useEditor
      .getState()
      .preview(matrix({ position: [i * 0.003, 0, 0], rotation: [0, 0, 0] }));
    previews.push(performance.now() - start);
  }
  const durationMs = performance.now() - start;
  const count = Number(canvas.dataset.frames) - frames;
  useEditor.getState().cancel();
  return {
    frames: count,
    durationMs,
    fps: count / (durationMs / 1000),
    previewMedianMs: previews.sort((a, b) => a - b)[45],
  };
}
