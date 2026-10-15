import {
  type BufferGeometry,
  type Camera,
  Matrix4,
  Vector3,
  Vector4,
} from "three";
import { inherited, worldMatrix, type SceneDocument } from "@clik/scene";
import { geometry } from "./geometry";

export type ScreenRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};
export type SelectionBounds = ScreenRect & { id: string };
export type BoxSelectionPreview = { rect: ScreenRect; ids: string[] };

const vertices = new WeakMap<BufferGeometry, Vector3[]>();
function selectionVertices(mesh: BufferGeometry) {
  const cached = vertices.get(mesh);
  if (cached) return cached;
  const position = mesh.getAttribute("position");
  const unique = new Map<string, Vector3>();
  for (let i = 0; i < position.count; i++) {
    const point = new Vector3().fromBufferAttribute(position, i);
    unique.set(`${point.x},${point.y},${point.z}`, point);
  }
  const points = [...unique.values()];
  vertices.set(mesh, points);
  return points;
}

/** Project once per gesture, without raycasting: occluded pieces stay selectable. */
export function projectSelectionBounds(
  scene: SceneDocument,
  camera: Camera,
  width: number,
  height: number,
): SelectionBounds[] {
  if (width <= 0 || height <= 0) return [];
  camera.updateWorldMatrix(true, false);
  const projection = new Matrix4().multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse,
  );
  const point = new Vector4();
  const result: SelectionBounds[] = [];
  for (const part of scene.nodes) {
    if (part.kind !== "part" || inherited(scene, part.id, "hidden")) continue;
    const matrix = projection.clone().multiply(worldMatrix(scene, part.id));
    let left = Infinity,
      top = Infinity,
      right = -Infinity,
      bottom = -Infinity;
    let clipped = false;
    for (const vertex of selectionVertices(geometry(part.type))) {
      point.set(vertex.x, vertex.y, vertex.z, 1).applyMatrix4(matrix);
      // A piece crossing a clipping plane cannot be entirely inside the frame.
      if (point.w <= 0 || point.z < -point.w || point.z > point.w) {
        clipped = true;
        break;
      }
      const x = ((point.x / point.w + 1) * width) / 2;
      const y = ((1 - point.y / point.w) * height) / 2;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
    if (!clipped && Number.isFinite(left))
      result.push({
        id: part.id,
        left,
        top,
        width: right - left,
        height: bottom - top,
      });
  }
  return result;
}

export function partsInsideBox(bounds: SelectionBounds[], rect: ScreenRect) {
  const tolerance = 1e-4;
  return bounds
    .filter(
      (part) =>
        part.left >= rect.left - tolerance &&
        part.top >= rect.top - tolerance &&
        part.left + part.width <= rect.left + rect.width + tolerance &&
        part.top + part.height <= rect.top + rect.height + tolerance,
    )
    .map((part) => part.id);
}
