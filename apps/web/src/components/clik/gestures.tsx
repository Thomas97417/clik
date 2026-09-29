import { useEffect, type RefObject, type ComponentRef } from "react";
import { useThree } from "@react-three/fiber";
import type { OrbitControls, TransformControls } from "@react-three/drei";
import {
  Box3,
  InstancedMesh,
  Matrix4,
  MOUSE,
  Plane,
  Raycaster,
  Vector2,
  Vector3,
} from "three";
import {
  descendants,
  inherited,
  makePart,
  movableRoots,
  snapCandidate,
  worldMatrix,
  type Part,
  type SelectionPreview,
} from "@clik/scene";
import { useEditor } from "@/lib/clik/store";
import { geometry } from "@/lib/clik/geometry";
import { toast } from "sonner";

// Keep the orientation widget above the bottom display controls.
export const CAMERA_GIZMO_MARGIN: [number, number] = [65, 135];

type Controls = RefObject<ComponentRef<typeof OrbitControls> | null>;
type Rotation = RefObject<ComponentRef<typeof TransformControls> | null>;
type Drag = {
  pointer: number;
  x: number;
  y: number;
  reference: string;
  point: Vector3;
  bottom: number;
  pivot: Vector3;
  offset: Vector3;
  turns: number;
  moving: Set<string>;
  started: boolean;
};

export function Gestures({
  controls,
  rotation,
  onLibraryPreview,
}: {
  controls: Controls;
  rotation: Rotation;
  onLibraryPreview: (
    preview: SelectionPreview | null,
    free: Part | null,
  ) => void;
}) {
  const { camera, gl, scene } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute(
      "aria-label",
      "Scène 3D — glisser une pièce pour la déplacer",
    );
    let drag: Drag | null = null;
    let blockedPointer: number | null = null;
    let moveFrame = 0;
    let lastMove: { clientX: number; clientY: number } | null = null;
    let space = false,
      inside = false;
    let cameraGesture: {
      pointer: number;
      position: Vector3;
      quaternion: typeof camera.quaternion;
      target: Vector3;
    } | null = null;
    const startCamera = (e: PointerEvent) => {
      cameraGesture = {
        pointer: e.pointerId,
        position: camera.position.clone(),
        quaternion: camera.quaternion.clone(),
        target: controls.current!.target.clone(),
      };
    };
    // three-stdlib defines these reactive properties at runtime, but marks them
    // private in its declarations (Drei exposes the same properties as props).
    const setRotation = (
      key: "enabled" | "dragging" | "axis",
      value: boolean | null,
    ) => {
      if (rotation.current) Reflect.set(rotation.current, key, value);
    };
    const finishCamera = () => {
      cameraGesture = null;
      setRotation("enabled", true);
    };
    let library: { free: Part; preview: SelectionPreview | null } | null = null;
    const ray = new Raycaster();
    const setRay = (e: { clientX: number; clientY: number }) => {
      const rect = canvas.getBoundingClientRect();
      ray.setFromCamera(
        new Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          (-(e.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
    };
    const hits = (excluded = new Set<string>()) => {
      // Preview and gizmo meshes never participate in picking.
      const meshes: InstancedMesh[] = [];
      scene.traverse((o) => {
        if (o instanceof InstancedMesh && o.userData.parts) meshes.push(o);
      });
      return ray.intersectObjects(meshes, false).filter((h) => {
        const part = h.object.userData.parts[h.instanceId ?? 0] as Part;
        return !excluded.has(part.id);
      });
    };
    // GizmoHelper renders in a separate HUD scene. Reserve its screen area so
    // native picking cannot select a brick behind the camera orientation control.
    const overCameraWidget = (e: { clientX: number; clientY: number }) => {
      const rect = canvas.getBoundingClientRect();
      return (
        Math.abs(e.clientX - (rect.right - CAMERA_GIZMO_MARGIN[0])) <= 52 &&
        Math.abs(e.clientY - (rect.bottom - CAMERA_GIZMO_MARGIN[1])) <= 52
      );
    };
    const ground = () =>
      ray.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), 0), new Vector3());
    const stop = (e: Event) => {
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    const release = () => {
      cancelAnimationFrame(moveFrame);
      moveFrame = 0;
      lastMove = null;
      const pointer = drag?.pointer ?? blockedPointer;
      drag = null;
      blockedPointer = null;
      if (pointer != null && canvas.hasPointerCapture(pointer))
        canvas.releasePointerCapture(pointer);
      canvas.style.cursor = space ? "grab" : "auto";
      delete canvas.dataset.dragging;
    };
    const cancel = () => {
      space = false;
      if (cameraGesture) {
        const before = cameraGesture;
        canvas.dispatchEvent(
          new PointerEvent("pointerup", {
            pointerId: before.pointer,
            bubbles: true,
          }),
        );
        // Flush residual damping before restoring the saved camera transform.
        if (controls.current) {
          const damping = controls.current.enableDamping;
          controls.current.enableDamping = false;
          controls.current.update();
          controls.current.enableDamping = damping;
        }
        camera.position.copy(before.position);
        camera.quaternion.copy(before.quaternion);
        controls.current?.target.copy(before.target);
        controls.current?.update();
        finishCamera();
      }
      if (useEditor.getState().gesture || useEditor.getState().pending)
        useEditor.getState().cancel();
      setRotation("dragging", false);
      setRotation("axis", null);
      if (controls.current) controls.current.enabled = true;
      release();
      library = null;
      onLibraryPreview(null, null);
    };
    const down = (e: PointerEvent) => {
      if (drag || blockedPointer !== null || cameraGesture) {
        stop(e);
        return;
      }
      const state = useEditor.getState();
      if (state.pending) return;
      canvas.focus({ preventScroll: true });
      if (e.button === 2 || (e.button === 0 && space)) {
        controls.current!.mouseButtons.LEFT = MOUSE.PAN;
        // TransformControls listens to the same canvas; disable it for this camera gesture.
        setRotation("enabled", false);
        startCamera(e);
        return;
      }
      controls.current!.mouseButtons.LEFT = MOUSE.ROTATE;
      if (e.button !== 0 || overCameraWidget(e)) return;
      if (
        state.tool === "rotate" &&
        rotation.current &&
        Reflect.get(rotation.current, "axis")
      )
        return;
      setRay(e);
      const hit = hits()[0];
      if (!hit) {
        useEditor.setState({ selection: [] });
        startCamera(e);
        return;
      }
      stop(e);
      const part = hit.object.userData.parts[hit.instanceId ?? 0] as Part;
      const selected = descendants(state.scene, state.selection).includes(
        part.id,
      );
      if (e.shiftKey) {
        if (selected)
          useEditor.setState({
            selection: state.selection.filter(
              (id) => !descendants(state.scene, [id]).includes(part.id),
            ),
          });
        else state.select(part.id, true);
      } else if (!selected) state.select(part.id);
      blockedPointer = e.pointerId;
      canvas.setPointerCapture(e.pointerId);
      if (
        e.shiftKey ||
        state.tool !== "translate" ||
        inherited(state.scene, part.id, "locked")
      )
        return;
      const ids = movableRoots(state.scene, useEditor.getState().selection);
      const moving = new Set(descendants(state.scene, ids));
      if (!moving.has(part.id)) return;
      const bounds = new Box3();
      for (const n of state.scene.nodes) {
        if (
          n.kind !== "part" ||
          !moving.has(n.id) ||
          inherited(state.scene, n.id, "hidden")
        )
          continue;
        const geom = geometry(n.type);
        if (!geom.boundingBox) geom.computeBoundingBox();
        bounds.union(
          geom
            .boundingBox!.clone()
            .applyMatrix4(worldMatrix(state.scene, n.id)),
        );
      }
      // Catalog origins sit on the floor; ignore the tiny bevel clearance.
      const bottom = Math.abs(bounds.min.y) < 0.03 ? 0 : bounds.min.y;
      drag = {
        pointer: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        reference: part.id,
        point: hit.point.clone(),
        bottom,
        pivot: new Vector3().setFromMatrixPosition(
          worldMatrix(state.scene, part.id),
        ),
        offset: new Vector3(),
        turns: 0,
        moving,
        started: false,
      };
      canvas.style.cursor = "grab";
    };
    const startDrag = () => {
      if (!drag || drag.started) return;
      drag.started = true;
      useEditor.getState().begin(drag.reference);
      canvas.style.cursor = "grabbing";
      canvas.dataset.dragging = "true";
    };
    const previewDrag = () => {
      if (!drag) return;
      const { pivot, offset, turns } = drag;
      // Rotate the rigid selection around the grabbed brick's vertical axis,
      // then apply the free translation. Wheel input never repositions the camera.
      const delta = new Matrix4().makeTranslation(...offset.toArray());
      if (turns)
        delta
          .multiply(new Matrix4().makeTranslation(...pivot.toArray()))
          .multiply(new Matrix4().makeRotationY((turns * Math.PI) / 2))
          .multiply(
            new Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z),
          );
      useEditor.getState().preview(delta);
    };
    const move = (e: PointerEvent) => {
      if (!drag) {
        if (blockedPointer !== null) {
          stop(e);
          return;
        }
        if (!cameraGesture && !useEditor.getState().gesture) {
          if (!space && overCameraWidget(e)) {
            canvas.style.cursor = "pointer";
            return;
          }
          setRay(e);
          canvas.style.cursor = space ? "grab" : hits()[0] ? "grab" : "auto";
        }
        return;
      }
      if (e.pointerId !== drag.pointer) return;
      stop(e);
      if (!drag.started) {
        if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) <= 4) return;
        startDrag();
      }
      lastMove = { clientX: e.clientX, clientY: e.clientY };
      if (!moveFrame) moveFrame = requestAnimationFrame(updateDrag);
    };
    // Coalesce high-frequency pointer events: raycasting and preview updates run
    // once per rendered frame, and release keeps the last displayed candidate.
    const updateDrag = () => {
      moveFrame = 0;
      if (!drag || !lastMove) return;
      setRay(lastMove);
      const surface = hits(drag.moving)[0]?.point ?? ground();
      if (!surface) return;
      // Project on the grabbed point's height above the supporting surface. This
      // keeps the original horizontal grab offset, including on tall assemblies.
      const point = ray.ray.intersectPlane(
        new Plane(
          new Vector3(0, 1, 0),
          -(surface.y + drag.point.y - drag.bottom),
        ),
        new Vector3(),
      );
      if (!point) return;
      drag.offset.set(
        point.x - drag.point.x,
        surface.y - drag.bottom,
        point.z - drag.point.z,
      );
      previewDrag();
    };
    const wheel = (e: WheelEvent) => {
      if (!drag || e.deltaY === 0) return;
      stop(e);
      startDrag();
      if (moveFrame) {
        cancelAnimationFrame(moveFrame);
        updateDrag();
      }
      // One wheel event is one quarter turn; upward scroll is +90°, downward -90°.
      drag.turns = (drag.turns - Math.sign(e.deltaY)) % 4;
      previewDrag();
    };
    const up = (e: PointerEvent) => {
      if (cameraGesture) finishCamera();
      if (e.pointerId !== (drag?.pointer ?? blockedPointer)) return;
      stop(e);
      if (drag?.started) {
        try {
          useEditor.getState().end();
        } catch (error) {
          useEditor.getState().cancel();
          toast.error(String(error));
        }
      }
      release();
    };
    const keydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancel();
        return;
      }
      if (
        e.code !== "Space" ||
        (!inside && document.activeElement !== canvas) ||
        document.querySelector(
          'dialog[open],[role="dialog"],[role="alertdialog"]',
        ) ||
        (e.target instanceof HTMLElement &&
          e.target !== canvas &&
          e.target.closest(
            'input,textarea,select,button,a,[contenteditable],[role="button"],[role="menu"]',
          ))
      )
        return;
      e.preventDefault();
      space = true;
      if (!drag) canvas.style.cursor = "grab";
    };
    const keyup = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        space = false;
        if (!drag) canvas.style.cursor = "auto";
      }
    };
    const enter = () => {
      inside = true;
    };
    const leave = () => {
      inside = false;
    };
    const locate = (e: DragEvent) => {
      const state = useEditor.getState();
      if (!state.pending) return;
      setRay(e);
      const point = hits()[0]?.point ?? ground();
      if (!point) return;
      const proposed =
        library?.free.type === state.pending
          ? { ...library.free, position: point.toArray() }
          : makePart(state.pending, state.color, point.toArray());
      const free = snapCandidate(state.scene, proposed, false).part;
      const { part, ...metadata } = snapCandidate(
        state.scene,
        free,
        state.snap,
      );
      const preview = state.snap
        ? {
            ...metadata,
            scene: { ...state.scene, nodes: [...state.scene.nodes, part] },
            ids: [part.id],
          }
        : null;
      library = { free, preview };
      onLibraryPreview(preview, free);
    };
    const over = (e: DragEvent) => {
      if (useEditor.getState().pending) {
        e.preventDefault();
        locate(e);
      }
    };
    const drop = (e: DragEvent) => {
      e.preventDefault();
      const state = useEditor.getState();
      if (!state.pending) return;
      // Some integrations send a drop without dragover. Otherwise use the last
      // displayed candidate, never recompute a different placement on release.
      if (!library) locate(e);
      if (library) {
        try {
          const { free, preview } = library;
          state.commit(
            state.snap && preview
              ? preview.scene
              : { ...state.scene, nodes: [...state.scene.nodes, free] },
          );
          useEditor.setState({ selection: [free.id], pending: null });
        } catch (error) {
          toast.error(String(error));
        }
      }
      library = null;
      onLibraryPreview(null, null);
    };
    const dragleave = () => {
      library = null;
      onLibraryPreview(null, null);
    };
    const unsubscribe = useEditor.subscribe((s, before) => {
      if (!s.pending && before.pending) dragleave();
      if (!s.snap && before.snap) {
        library = library && { ...library, preview: null };
        onLibraryPreview(null, library?.free ?? null);
      }
      if (!s.gesture && before.gesture && drag?.started) release();
    });
    canvas.addEventListener("pointerdown", down, true);
    canvas.addEventListener("pointermove", move, true);
    canvas.addEventListener("pointerup", up, true);
    canvas.addEventListener("pointercancel", cancel);
    canvas.addEventListener("lostpointercapture", cancelLost);
    function cancelLost() {
      if (drag || blockedPointer !== null) cancel();
    }
    canvas.addEventListener("pointerenter", enter);
    canvas.addEventListener("pointerleave", leave);
    canvas.addEventListener("dragover", over);
    canvas.addEventListener("drop", drop);
    canvas.addEventListener("dragleave", dragleave);
    window.addEventListener("wheel", wheel, { capture: true, passive: false });
    window.addEventListener("pointerup", finishCamera, true);
    window.addEventListener("keydown", keydown, true);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", cancel);
    return () => {
      unsubscribe();
      cancelAnimationFrame(moveFrame);
      canvas.removeEventListener("pointerdown", down, true);
      canvas.removeEventListener("pointermove", move, true);
      canvas.removeEventListener("pointerup", up, true);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("lostpointercapture", cancelLost);
      canvas.removeEventListener("pointerenter", enter);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("dragover", over);
      canvas.removeEventListener("drop", drop);
      canvas.removeEventListener("dragleave", dragleave);
      window.removeEventListener("wheel", wheel, true);
      window.removeEventListener("pointerup", finishCamera, true);
      window.removeEventListener("keydown", keydown, true);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", cancel);
    };
  }, [camera, gl, scene, controls, rotation, onLibraryPreview]);
  return null;
}
