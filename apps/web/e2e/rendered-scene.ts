// Browser-only test helper, loaded through Vite. Never imported by the application.
import { _roots } from "@react-three/fiber";
import { Vector3 } from "three";
import { worldMatrix, type Vec3 } from "@clik/scene";
import { useEditor } from "../src/lib/clik/store";

export type PartPoint = { id: string; local: Vec3; offset?: Vec3 };

/** Read the actual camera, so pointer targets follow zoom, framing and canvas size. */
export function projectPartPoints(points: PartPoint[]) {
  const canvas = document.querySelector<HTMLCanvasElement>(".viewport canvas");
  if (!canvas) throw Error("Le canvas de l’éditeur n’est pas prêt.");
  const camera = _roots.get(canvas)?.store.getState().camera;
  if (!camera) throw Error("La caméra de l’éditeur n’est pas prête.");
  const scene = useEditor.getState().scene;
  const rect = canvas.getBoundingClientRect();
  camera.updateMatrixWorld();
  return points.map(({ id, local, offset = [0, 0, 0] }) => {
    if (!scene.nodes.some((node) => node.id === id && node.kind === "part"))
      throw Error(`Pièce introuvable : ${id}`);
    const point = new Vector3(...local)
      .applyMatrix4(worldMatrix(scene, id))
      .add(new Vector3(...offset))
      .project(camera);
    return {
      x: rect.x + ((point.x + 1) * rect.width) / 2,
      y: rect.y + ((1 - point.y) * rect.height) / 2,
    };
  });
}
