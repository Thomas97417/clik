import { describe, expect, it } from "vitest";
import { PerspectiveCamera } from "three";
import {
  cameraNavigationDelta,
  cameraNavigationKey,
} from "../src/lib/clik/camera-navigation";

describe("Navigation de la caméra au clavier", () => {
  it.each([
    ["z", "forward"],
    ["Z", "forward"],
    ["q", "left"],
    ["s", "backward"],
    ["d", "right"],
  ] as const)("%s déplace toujours la caméra vers %s", (key, direction) => {
    for (const selected of [false, true])
      expect(cameraNavigationKey(key, selected)).toEqual({
        direction,
        arrow: false,
      });
  });
  it.each([
    ["ArrowUp", "forward"],
    ["ArrowDown", "backward"],
    ["ArrowLeft", "left"],
    ["ArrowRight", "right"],
  ] as const)(
    "%s est réservé aux pièces lorsqu’il y a une sélection",
    (key, direction) => {
      expect(cameraNavigationKey(key, false)).toEqual({
        direction,
        arrow: true,
      });
      expect(cameraNavigationKey(key, true)).toBeNull();
    },
  );
  it.each(["a", "g", "r", "Control", "Escape", "__proto__"])(
    "ignore %s pour la caméra",
    (key) => {
      expect(cameraNavigationKey(key, false)).toBeNull();
    },
  );
  it.each([
    { position: [0, 10, 20], forward: [0, 0, -1], right: [1, 0, 0] },
    { position: [20, 10, 0], forward: [-1, 0, 0], right: [0, 0, -1] },
    { position: [0, 10, -20], forward: [0, 0, 1], right: [-1, 0, 0] },
    { position: [-20, 10, 0], forward: [1, 0, 0], right: [0, 0, 1] },
    { position: [0, 20, 0], forward: [0, 0, -1], right: [1, 0, 0] },
  ])(
    "suit l’orientation depuis $position sans changer la hauteur",
    ({ position, forward, right }) => {
      const camera = new PerspectiveCamera();
      camera.position.set(position[0], position[1], position[2]);
      camera.lookAt(0, 0, 0);
      const originalPosition = camera.position.clone();
      const originalRotation = camera.quaternion.clone();
      for (const [direction, expected] of [
        ["forward", forward],
        ["right", right],
      ] as const) {
        const delta = cameraNavigationDelta(camera, [direction], 3);
        expected.forEach((value, i) =>
          expect(delta.getComponent(i)).toBeCloseTo(value * 3),
        );
      }
      expect(camera.position).toEqual(originalPosition);
      expect(camera.quaternion.equals(originalRotation)).toBe(true);
    },
  );
  it("normalise les diagonales, annule les directions opposées et ne double pas les alias", () => {
    const camera = new PerspectiveCamera();
    camera.position.set(15, 12, 20);
    camera.lookAt(2, 0, -4);
    const single = cameraNavigationDelta(camera, ["forward"], 5);
    const diagonal = cameraNavigationDelta(camera, ["forward", "right"], 5);
    expect(single.length()).toBeCloseTo(5);
    expect(diagonal.length()).toBeCloseTo(5);
    expect(diagonal.y).toBe(0);
    const opposed = cameraNavigationDelta(
      camera,
      ["forward", "backward", "left", "right"],
      5,
    );
    expect(opposed.length()).toBe(0);
    expect(cameraNavigationDelta(camera, ["forward", "forward"], 5)).toEqual(
      single,
    );
  });
});
