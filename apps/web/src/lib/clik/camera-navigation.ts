import { type Camera, Vector3 } from "three";

export type CameraDirection = "forward" | "backward" | "left" | "right";
const cameraKeys = new Map<string, CameraDirection>([
  ["z", "forward"],
  ["q", "left"],
  ["s", "backward"],
  ["d", "right"],
  ["arrowup", "forward"],
  ["arrowleft", "left"],
  ["arrowdown", "backward"],
  ["arrowright", "right"],
]);

export function cameraNavigationKey(key: string, hasSelection: boolean) {
  const arrow = key.startsWith("Arrow");
  const direction = cameraKeys.get(key.toLowerCase());
  return direction && (!arrow || !hasSelection) ? { direction, arrow } : null;
}

/** Translate on the construction plane, relative to the view, without changing altitude. */
export function cameraNavigationDelta(
  camera: Camera,
  directions: Iterable<CameraDirection>,
  distance: number,
) {
  camera.updateWorldMatrix(true, false);
  const basis = camera.matrixWorld.elements;
  const forward = new Vector3(-basis[8], 0, -basis[10]);
  // A top view has no horizontal viewing direction: use its screen-up axis.
  if (forward.lengthSq() < 1e-6) forward.set(basis[4], 0, basis[6]);
  forward.normalize();
  const right = new Vector3(-forward.z, 0, forward.x);
  const active = new Set(directions);
  return forward
    .multiplyScalar(
      Number(active.has("forward")) - Number(active.has("backward")),
    )
    .addScaledVector(
      right,
      Number(active.has("right")) - Number(active.has("left")),
    )
    .normalize()
    .multiplyScalar(distance);
}
