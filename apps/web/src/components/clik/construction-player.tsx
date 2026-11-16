import { useEffect, useLayoutEffect, type ReactNode } from "react";
import type { SceneDocument } from "@clik/scene";
import {
  useConstructionPlayback,
  type ConstructionPlayback,
} from "@/lib/clik/use-construction-playback";

/** Keep animation frames out of the editor's library, tree and inspector. */
export default function ConstructionPlayer({
  scene,
  onActiveChange,
  children,
}: {
  scene: SceneDocument;
  onActiveChange?: (active: boolean) => void;
  children: (playback: ConstructionPlayback) => ReactNode;
}) {
  const playback = useConstructionPlayback(scene);
  useLayoutEffect(() => {
    onActiveChange?.(playback.active);
  }, [playback.active, onActiveChange]);
  useEffect(() => {
    if (!playback.active || !onActiveChange) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") playback.stop();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [playback.active, onActiveChange, playback.stop]);
  return children(playback);
}
