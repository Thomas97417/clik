import { useEffect, useRef, type ComponentRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls } from "@react-three/drei";
import {
  cameraNavigationDelta,
  cameraNavigationKey,
} from "@/lib/clik/camera-navigation";
import { editorShortcutTarget } from "@/lib/clik/editor-keyboard";
import { useEditor } from "@/lib/clik/store";

export function KeyboardCamera({
  controls,
  enabled,
}: {
  controls: RefObject<ComponentRef<typeof OrbitControls> | null>;
  enabled: boolean;
}) {
  const { camera } = useThree();
  const pressed = useRef(
    new Map<string, NonNullable<ReturnType<typeof cameraNavigationKey>>>(),
  );
  const clear = () => pressed.current.clear();
  const blocked = () => {
    const state = useEditor.getState();
    return (
      !enabled ||
      document.hidden ||
      !controls.current ||
      !!state.gesture ||
      !!state.pending ||
      !!state.libraryPointer ||
      state.boxSelecting ||
      !editorShortcutTarget(document.activeElement)
    );
  };
  const move = (seconds: number) => {
    const orbit = controls.current;
    if (!orbit) return;
    const distance = camera.position.distanceTo(orbit.target);
    const delta = cameraNavigationDelta(
      camera,
      [...pressed.current.values()].map((input) => input.direction),
      Math.max(2, distance * 0.6) * Math.min(seconds, 0.05),
    );
    camera.position.add(delta);
    orbit.target.add(delta);
    orbit.update();
  };
  useFrame((_, seconds) => {
    if (!pressed.current.size) return;
    if (blocked()) return clear();
    move(seconds);
  });
  useEffect(() => {
    if (!enabled) return clear();
    const down = (event: KeyboardEvent) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.key === "Escape"
      ) {
        clear();
        return;
      }
      const input = cameraNavigationKey(
        event.key,
        !!useEditor.getState().selection.length,
      );
      if (!input) return;
      if (
        event.defaultPrevented ||
        event.isComposing ||
        (input.arrow && event.shiftKey) ||
        !editorShortcutTarget(event.target) ||
        blocked()
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const key = event.code || event.key.toLowerCase();
      if (event.repeat || pressed.current.has(key)) return;
      if (!pressed.current.size) {
        // Remove residual mouse damping before starting a straight translation.
        const orbit = controls.current!;
        const damping = orbit.enableDamping;
        orbit.enableDamping = false;
        orbit.update();
        orbit.enableDamping = damping;
      }
      pressed.current.set(key, input);
      // A quick tap must move the camera even if released before the next frame.
      move(1 / 60);
    };
    const up = (event: KeyboardEvent) =>
      pressed.current.delete(event.code || event.key.toLowerCase());
    const unsubscribe = useEditor.subscribe((state, before) => {
      if (
        state.gesture ||
        state.pending ||
        state.libraryPointer ||
        state.boxSelecting ||
        state.frame !== before.frame ||
        state.view !== before.view
      )
        clear();
      else if (state.selection.length) {
        for (const [key, input] of pressed.current)
          if (input.arrow) pressed.current.delete(key);
      }
    });
    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    window.addEventListener("focusin", clear);
    document.addEventListener("visibilitychange", clear);
    return () => {
      clear();
      unsubscribe();
      window.removeEventListener("keydown", down, true);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      window.removeEventListener("focusin", clear);
      document.removeEventListener("visibilitychange", clear);
    };
  }, [camera, controls, enabled]);
  return null;
}
