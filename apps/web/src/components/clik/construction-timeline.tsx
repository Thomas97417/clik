import { History, Pause, Play, SkipBack } from "lucide-react";
import type { ConstructionPlayback } from "@/lib/clik/use-construction-playback";
import { playbackTime } from "@/lib/clik/construction-timeline";
import { cn } from "@/lib/utils";

const controlClass =
  "grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-[#64758d] transition-colors hover:bg-[#edf2fc] hover:text-[#356ae6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356ae6] disabled:cursor-not-allowed disabled:opacity-40";

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
  if (!playback.available || !playback.timeline) return null;
  const { timeline } = playback;
  const count =
    timeline.baseline +
    timeline.steps
      .slice(0, playback.step)
      .reduce((sum, step) => sum + step.ids.length, 0);
  return (
    <div
      className={cn(
        "construction-timeline shrink-0 bg-white px-4 py-3 text-[#64758d]",
        className,
      )}
      role="group"
      aria-label="Lecture de la construction"
      onKeyDown={(event) => {
        // Playback shortcuts must never reach the editor's mutation shortcuts.
        event.stopPropagation();
        if (event.key === "Escape" && editor) playback.stop();
      }}
    >
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px]">
        <span className="flex items-center gap-1.5 font-semibold text-[#354d70]">
          <History size={14} aria-hidden="true" />
          Évolution de la construction
        </span>
        <span className="construction-progress ml-auto tabular-nums">
          {count} / {timeline.total} pièces
        </span>
        {editor && playback.active && (
          <button
            type="button"
            className="cursor-pointer rounded text-[#356ae6] underline underline-offset-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356ae6]"
            onClick={playback.stop}
          >
            Revenir à l’édition
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={cn(
            controlClass,
            "bg-[#356ae6] text-white hover:bg-[#2458ce] hover:text-white",
          )}
          aria-label={
            playback.playing
              ? "Mettre en pause la construction"
              : "Lire la construction"
          }
          disabled={disabled}
          onClick={playback.toggle}
        >
          {playback.playing ? (
            <Pause size={16} aria-hidden="true" />
          ) : (
            <Play size={16} aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          className={controlClass}
          aria-label="Revenir au début de la construction"
          disabled={disabled}
          onClick={() => playback.seek(0)}
        >
          <SkipBack size={16} aria-hidden="true" />
        </button>
        <input
          type="range"
          className="min-w-10 flex-1 cursor-pointer accent-[#356ae6] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#356ae6] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Progression de la construction"
          aria-valuetext={`${count} pièces sur ${timeline.total}, ${playbackTime(playback.time)} sur ${playbackTime(playback.duration)}`}
          min={0}
          max={playback.duration}
          step={1}
          value={playback.time}
          disabled={disabled}
          onChange={(event) => playback.seek(Number(event.currentTarget.value))}
        />
        <span className="shrink-0 text-[10px] tabular-nums" aria-hidden="true">
          {playbackTime(playback.time)} / {playbackTime(playback.duration)}
        </span>
        <select
          className="h-8 cursor-pointer rounded-md border border-[#e1e7f0] bg-white px-1 text-[11px] focus-visible:outline-2 focus-visible:outline-[#356ae6] disabled:opacity-40"
          aria-label="Vitesse de lecture"
          value={playback.speed}
          disabled={disabled}
          onChange={(event) =>
            playback.setSpeed(Number(event.currentTarget.value))
          }
        >
          {[0.5, 1, 2, 4].map((speed) => (
            <option key={speed} value={speed}>
              {String(speed).replace(".", ",")}×
            </option>
          ))}
        </select>
      </div>
      <p
        className="mt-2 text-[10px] leading-relaxed text-[#8190a5]"
        title="Les pièces apparaissent dans leur ordre de pose, à leur position actuelle. Les longues pauses sont raccourcies."
      >
        Pièces à leur position actuelle · pauses raccourcies
        {timeline.baseline > 0 ? " · pièces antérieures déjà présentes" : ""}
      </p>
    </div>
  );
}
