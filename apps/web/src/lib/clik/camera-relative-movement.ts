import type { Camera } from "three";
import type { Vec3 } from "@clik/scene";

/** Follow the view while keeping every move on a single axis of the stud grid. */
export function cameraRelativeStep(key: string, camera: Camera | null): Vec3 {
  const horizontal = key === "ArrowLeft" || key === "ArrowRight";
  if (!horizontal && key !== "ArrowUp" && key !== "ArrowDown") return [0, 0, 0];

  camera?.updateWorldMatrix(true, false);
  const basis = camera?.matrixWorld.elements;
  const x = basis?.[0] ?? 1;
  const z = basis?.[2] ?? 0;
  // Prefer X at a diagonal, including the default perspective. The tolerance
  // prevents floating-point noise from swapping axes at that exact angle.
  const right: Vec3 =
    Math.abs(x) + 1e-6 >= Math.abs(z)
      ? [x < 0 ? -1 : 1, 0, 0]
      : [0, 0, z < 0 ? -1 : 1];
  const up: Vec3 = [right[2], 0, -right[0]];
  let direction = key === "ArrowRight" || key === "ArrowUp" ? 1 : -1;
  // Looking from below reverses the ground plane's vertical screen direction.
  if (!horizontal && basis && up[0] * basis[4]! + up[2] * basis[6]! < -1e-6)
    direction *= -1;
  return (horizontal ? right : up).map(
    (value) => value * direction || 0,
  ) as Vec3;
}
