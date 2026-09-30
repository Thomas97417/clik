import { MOUSE, Spherical, TOUCH, Vector3 } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { SceneDocument } from "@clik/scene";
import { createCreationModel, drawCreationModel } from "./thumbnail";

export function attachPreviewControls(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  document: SceneDocument,
) {
  const model = createCreationModel(document);
  if (!model) return;
  const focus = () => host.focus({ preventScroll: true });
  host.addEventListener("pointerdown", focus);
  const controls = new OrbitControls(model.camera, host);
  controls.target.copy(model.center);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.minZoom = model.camera.zoom * 0.5;
  controls.maxZoom = model.camera.zoom * 3;
  controls.minPolarAngle = 0.05;
  controls.maxPolarAngle = Math.PI - 0.05;
  controls.mouseButtons = { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY };
  controls.touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_ROTATE };
  controls.update();
  controls.saveState();
  let frame = 0;
  const render = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      drawCreationModel(model, canvas);
      host.dataset.live = "true";
      canvas.hidden = false;
    });
  };
  const focused = () => {
    controls.enableZoom = true;
  };
  const blurred = () => {
    controls.enableZoom = false;
  };
  const started = () => {
    host.dataset.dragging = "true";
  };
  const ended = () => {
    delete host.dataset.dragging;
  };
  const reset = () => {
    controls.reset();
    render();
    focus();
  };
  const zoom = (direction: number) => {
    model.camera.zoom = Math.max(
      controls.minZoom,
      Math.min(controls.maxZoom, model.camera.zoom * 1.2 ** direction),
    );
    model.camera.updateProjectionMatrix();
    controls.update();
    render();
    focus();
  };
  const key = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing)
      return;
    if (
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    ) {
      event.preventDefault();
      const angles = new Spherical().setFromVector3(
        model.camera.position.clone().sub(controls.target),
      );
      const step = Math.PI / 12;
      if (event.key === "ArrowLeft") angles.theta -= step;
      if (event.key === "ArrowRight") angles.theta += step;
      if (event.key === "ArrowUp") angles.phi -= step;
      if (event.key === "ArrowDown") angles.phi += step;
      angles.phi = Math.max(
        controls.minPolarAngle,
        Math.min(controls.maxPolarAngle, angles.phi),
      );
      model.camera.position
        .copy(controls.target)
        .add(new Vector3().setFromSpherical(angles));
      controls.update();
    } else if (["+", "=", "-", "Home"].includes(event.key)) {
      event.preventDefault();
      if (event.key === "Home") reset();
      else zoom(event.key === "-" ? -1 : 1);
    }
  };
  controls.addEventListener("change", render);
  controls.addEventListener("start", started);
  controls.addEventListener("end", ended);
  host.addEventListener("focus", focused);
  host.addEventListener("blur", blurred);
  host.addEventListener("keydown", key);
  return {
    reset,
    zoom,
    dispose: () => {
      cancelAnimationFrame(frame);
      controls.dispose();
      model.dispose();
      host.removeEventListener("pointerdown", focus);
      host.removeEventListener("focus", focused);
      host.removeEventListener("blur", blurred);
      host.removeEventListener("keydown", key);
      delete host.dataset.live;
      delete host.dataset.dragging;
      canvas.hidden = true;
    },
  };
}
