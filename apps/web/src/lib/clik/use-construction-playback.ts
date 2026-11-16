import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SceneDocument } from "@clik/scene";
import {
  constructionStep,
  constructionTimeline,
  sceneAtConstructionStep,
} from "./construction-timeline";

export function useConstructionPlayback(
  scene: SceneDocument | null,
  editing = false,
) {
  const timeline = useMemo(
    () => (scene ? constructionTimeline(scene) : null),
    [scene],
  );
  const [position, setPosition] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const stop = useCallback(() => {
    setPlaying(false);
    setPosition(null);
  }, []);
  const cursor = useRef(0);
  const source = useRef(scene);
  const current = source.current === scene;
  // A placement always wins over playback, including an already-held pointer.
  // Restore the complete scene in this render, before a gesture can preview edits.
  const active = current && position !== null && !editing;
  const running = current && playing && !editing;
  const duration = timeline?.duration ?? 0;
  const time = active ? position : duration;
  const step = timeline ? constructionStep(timeline, time) : 0;
  const preview = useMemo(
    () =>
      scene && timeline
        ? sceneAtConstructionStep(scene, timeline, step)
        : scene,
    [scene, timeline, step],
  );

  useEffect(() => {
    source.current = scene;
    cursor.current = 0;
    setPosition(null);
    setPlaying(false);
  }, [scene]);

  useLayoutEffect(() => {
    if (editing) stop();
  }, [editing, stop]);

  useEffect(() => {
    if (!running || !duration) return;
    let frame: number;
    let previous = performance.now();
    const tick = (now: number) => {
      cursor.current = Math.min(
        duration,
        cursor.current + (now - previous) * speed,
      );
      previous = now;
      setPosition(cursor.current);
      if (cursor.current >= duration) setPlaying(false);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    // Returning from an inactive tab must not skip the entire construction.
    const visibility = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [running, duration, speed]);

  return {
    available: !!duration,
    active,
    playing: running,
    scene: preview,
    timeline,
    time,
    step,
    duration,
    speed,
    setSpeed,
    toggle: () => {
      if (!duration || editing) return;
      if (playing) setPlaying(false);
      else {
        cursor.current = !active || time >= duration ? 0 : time;
        setPosition(cursor.current);
        setPlaying(true);
      }
    },
    seek: (value: number) => {
      if (editing) return;
      cursor.current = Math.max(0, Math.min(duration, value));
      setPosition(cursor.current);
      setPlaying(false);
    },
    stop,
  };
}

export type ConstructionPlayback = ReturnType<typeof useConstructionPlayback>;
