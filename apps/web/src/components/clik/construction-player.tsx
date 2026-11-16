import { useLayoutEffect, type ReactNode, type RefObject } from "react";
import type { SceneDocument } from "@clik/scene";
import {
  useConstructionPlayback,
  type ConstructionPlayback,
} from "@/lib/clik/use-construction-playback";

/** Keep animation frames out of the editor's library, tree and inspector. */
export default function ConstructionPlayer({
  scene,
  stopRef,
  editing = false,
  children,
}: {
  scene: SceneDocument;
  stopRef?: RefObject<(() => void) | null>;
  editing?: boolean;
  children: (playback: ConstructionPlayback) => ReactNode;
}) {
  const playback = useConstructionPlayback(scene, editing);
  useLayoutEffect(() => {
    if (!stopRef) return;
    stopRef.current = playback.stop;
    return () => {
      if (stopRef.current === playback.stop) stopRef.current = null;
    };
  }, [stopRef, playback.stop]);
  return children(playback);
}
