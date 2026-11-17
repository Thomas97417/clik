import { useId, type CSSProperties } from "react";
import { Pause, Play, SkipBack } from "lucide-react";
import type { ConstructionPlayback } from "@/lib/clik/use-construction-playback";
import { playbackTime } from "@/lib/clik/construction-timeline";
import { cn } from "@/lib/utils";
import "./construction-timeline.css";

const controlClass =
  "grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-[#7b8ba3] transition-colors duration-150 hover:bg-[#edf2fc] hover:text-[#356ae6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356ae6] disabled:cursor-not-allowed disabled:opacity-30 motion-reduce:transition-none";
const speeds = [0.5, 1, 2, 4];
const speedLabel = (speed: number) => `${String(speed).replace(".", ",")}×`;

export default function ConstructionTimeline({
  playback,
  editor = false,
  disabled = false,
  className,
}: {
  playback: ConstructionPlayback;
  editor?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const descriptionId = useId();
  if (!playback.available || !playback.timeline) return null;
  const { timeline } = playback;
  const count =
    timeline.baseline +
    timeline.steps
      .slice(0, playback.step)
      .reduce((sum, step) => sum + step.ids.length, 0);
  const nextSpeed =
    speeds[(speeds.indexOf(playback.speed) + 1) % speeds.length];
  return (
    <div
      className={cn(
        "construction-timeline flex h-10 min-w-0 shrink-0 items-center gap-1 bg-white/75 px-2.5 text-[#7b8ba3]",
        className,
      )}
      role="group"
      aria-label="Lecture de la construction"
      aria-describedby={descriptionId}
      data-active={playback.active}
      onKeyDown={(event) => {
        // Playback shortcuts must never reach the editor's mutation shortcuts.
        event.stopPropagation();
        if (event.key === "Escape" && editor) playback.stop();
      }}
    >
      <button
        type="button"
        className={cn(
          controlClass,
          "relative rounded-full text-[#526f9d] data-[playing=true]:bg-[#eaf0fc] data-[playing=true]:text-[#356ae6]",
        )}
        aria-label={
          playback.playing
            ? "Mettre en pause la construction"
            : "Lire la construction"
        }
        title={playback.playing ? "Pause" : "Revoir la construction"}
        data-playing={playback.playing}
        disabled={disabled}
        onClick={playback.toggle}
      >
        <Play
          size={14}
          aria-hidden="true"
          className={cn(
            "absolute transition-[opacity,transform] duration-150 motion-reduce:transition-none",
            playback.playing ? "scale-75 opacity-0" : "scale-100 opacity-100",
          )}
        />
        <Pause
          size={14}
          aria-hidden="true"
          className={cn(
            "absolute transition-[opacity,transform] duration-150 motion-reduce:transition-none",
            playback.playing ? "scale-100 opacity-100" : "scale-75 opacity-0",
          )}
        />
      </button>
      <button
        type="button"
        className={controlClass}
        aria-label="Revenir au début de la construction"
        title="Revenir au début"
        disabled={disabled}
        onClick={() => playback.seek(0)}
      >
        <SkipBack size={13} aria-hidden="true" />
      </button>
      <input
        type="range"
        className="construction-range mx-1 h-6 min-w-8 flex-1 cursor-pointer appearance-none bg-transparent focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356ae6] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Progression de la construction"
        aria-valuetext={`${count} pièces sur ${timeline.total}, ${playbackTime(playback.time)} sur ${playbackTime(playback.duration)}`}
        title={`${count} / ${timeline.total} pièces`}
        min={0}
        max={playback.duration}
        step={1}
        value={playback.time}
        style={
          {
            "--construction-progress": `${(playback.time / playback.duration) * 100}%`,
          } as CSSProperties
        }
        disabled={disabled}
        onChange={(event) => playback.seek(Number(event.currentTarget.value))}
      />
      <span
        className="shrink-0 whitespace-nowrap px-1 text-right text-[10px] tabular-nums"
        style={{
          minWidth: `${playbackTime(playback.duration).length * 2 + 3}ch`,
        }}
        aria-hidden="true"
      >
        {playbackTime(playback.time)} / {playbackTime(playback.duration)}
      </span>
      <button
        type="button"
        className={cn(controlClass, "w-9 text-[11px] font-medium tabular-nums")}
        aria-label={`Vitesse de lecture : ${speedLabel(playback.speed)}`}
        title={`Vitesse ${speedLabel(playback.speed)} · passer à ${speedLabel(nextSpeed)}`}
        disabled={disabled}
        onClick={() => playback.setSpeed(nextSpeed)}
      >
        {speedLabel(playback.speed)}
      </button>
      <span className="construction-progress sr-only">
        {count} / {timeline.total} pièces
      </span>
      <p id={descriptionId} className="sr-only">
        Les pièces apparaissent dans leur ordre de pose, à leur position
        actuelle. Les longues pauses sont raccourcies.
        {timeline.baseline > 0 ? " · pièces antérieures déjà présentes" : ""}
        {editor && " Appuyez sur Échap pour revenir à l’édition."}
      </p>
    </div>
  );
}
