import { cn } from "@/lib/utils";
import { useEffect, useId, useRef, useState } from "react";
import { Box, ImageOff, Minus, Plus, RotateCcw } from "lucide-react";
import { validateScene, type SceneDocument } from "@clik/scene";
import type { attachPreviewControls } from "@/lib/clik/preview-controls";

export default function CreationPreview({
  scene,
  cacheKey,
  title,
  interactive = false,
  initialZoom = 1,
  poster,
  imageClassName,
  canvasClassName,
  placeholderClassName,
  controlsClassName,
  controlsButtonClassName,
  className,
}: {
  scene: SceneDocument | string;
  cacheKey: string;
  title: string;
  interactive?: boolean;
  initialZoom?: number;
  poster?: string;
  imageClassName?: string;
  canvasClassName?: string;
  placeholderClassName?: string;
  controlsClassName?: string;
  controlsButtonClassName?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const controls = useRef<ReturnType<typeof attachPreviewControls>>(undefined);
  const instructionsId = useId();
  const [interactiveReady, setInteractiveReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [preview, setPreview] = useState<{
    key: string;
    url?: string | null;
    error?: boolean;
  }>();
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible || poster) return;
    let active = true;
    import("@/lib/clik/thumbnail")
      .then(async ({ creationThumbnail }) => {
        if (!active) return;
        const document = validateScene(
          typeof scene === "string" ? JSON.parse(scene) : scene,
        );
        const url = await creationThumbnail(document, cacheKey, () => active);
        if (active) setPreview({ key: cacheKey, url });
      })
      .catch(() => {
        if (active) setPreview({ key: cacheKey, error: true });
      });
    return () => {
      active = false;
    };
  }, [visible, scene, cacheKey, poster]);
  const current = poster
    ? { key: cacheKey, url: poster }
    : preview?.key === cacheKey
      ? preview
      : undefined;
  useEffect(() => {
    setInteractiveReady(false);
    if (!interactive || !visible || !current?.url) return;
    let active = true;
    import("@/lib/clik/preview-controls")
      .then(({ attachPreviewControls }) => {
        if (!active || !surface.current || !canvas.current) return;
        controls.current = attachPreviewControls(
          surface.current,
          canvas.current,
          validateScene(typeof scene === "string" ? JSON.parse(scene) : scene),
          initialZoom,
        );
        setInteractiveReady(!!controls.current);
      })
      .catch(() => {
        /* Keep the static preview if interactive rendering is unavailable. */
      });
    return () => {
      active = false;
      controls.current?.dispose();
      controls.current = undefined;
    };
  }, [interactive, visible, current?.url, scene, cacheKey, initialZoom]);
  return (
    <div
      ref={ref}
      className={cn(
        "creation-preview group/creation-preview inset-0 absolute",
        className,
      )}
      aria-busy={!current}
    >
      {current?.url ? (
        <>
          <div
            ref={surface}
            className={cn(
              "creation-preview-surface inset-0 absolute [&[class~='group/is-interactive']]:cursor-grab [&[class~='group/is-interactive']]:select-none [&[class~='group/is-interactive']]:rounded-[14px] data-[dragging=true]:cursor-grabbing focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:-outline-offset-4",
              interactiveReady ? "is-interactive group/is-interactive" : "",
              "group/creation-preview-surface",
            )}
            tabIndex={interactiveReady ? 0 : undefined}
            role={interactiveReady ? "group" : undefined}
            aria-label={interactiveReady ? `Manipuler ${title}` : undefined}
            aria-describedby={interactiveReady ? instructionsId : undefined}
          >
            <img
              className={cn(
                "object-contain group-data-[live=true]/creation-preview-surface:opacity-0",
                imageClassName,
              )}
              src={current.url}
              width={640}
              height={480}
              decoding="async"
              fetchPriority={poster ? "high" : undefined}
              alt={`Aperçu de ${title}`}
              draggable={false}
              style={
                initialZoom === 1
                  ? undefined
                  : { transform: `scale(${initialZoom})` }
              }
            />
            {interactive && (
              <canvas
                className={cn(
                  "inset-0 absolute object-contain pointer-events-none size-full",
                  canvasClassName,
                )}
                ref={canvas}
                hidden
                aria-hidden="true"
              />
            )}
          </div>
          {interactiveReady && (
            <div
              className={cn(
                "creation-preview-controls group/creation-preview-controls gap-0.75 absolute bottom-1.25 right-1.25 flex items-center text-[#626b8d]",
                controlsClassName,
              )}
            >
              <span id={instructionsId} className="sr-only">
                Glissez pour tourner. Cliquez sur l’aperçu puis utilisez la
                molette pour zoomer. Au clavier : flèches pour tourner, + et −
                pour zoomer, Début pour réinitialiser.
              </span>
              <span
                className="creation-preview-hint text-[11px] mr-1.5 [@media(width<=360px)]:hidden"
                aria-hidden="true"
              >
                Glisser pour tourner
              </span>
              <button
                className={cn(
                  "cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 grid place-items-center rounded-[8px] bg-[#ffffffcf] hover:bg-white hover:text-[#356ae6] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] size-7.5",
                  controlsButtonClassName,
                )}
                type="button"
                title="Dézoomer l’aperçu"
                aria-label="Dézoomer l’aperçu"
                onClick={() => controls.current?.zoom(-1)}
              >
                <Minus className="shrink-0" size={15} />
              </button>
              <button
                className={cn(
                  "cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 grid place-items-center rounded-[8px] bg-[#ffffffcf] hover:bg-white hover:text-[#356ae6] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] size-7.5",
                  controlsButtonClassName,
                )}
                type="button"
                title="Zoomer l’aperçu"
                aria-label="Zoomer l’aperçu"
                onClick={() => controls.current?.zoom(1)}
              >
                <Plus className="shrink-0" size={15} />
              </button>
              <button
                className={cn(
                  "cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 grid place-items-center rounded-[8px] bg-[#ffffffcf] hover:bg-white hover:text-[#356ae6] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] size-7.5",
                  controlsButtonClassName,
                )}
                type="button"
                title="Réinitialiser la vue"
                aria-label="Réinitialiser la vue"
                onClick={() => controls.current?.reset()}
              >
                <RotateCcw className="shrink-0" size={15} />
              </button>
            </div>
          )}
        </>
      ) : (
        <div
          className={cn(
            "creation-preview-placeholder group/creation-preview-placeholder gap-3 flex h-full items-center justify-center flex-col text-[#7184a0] text-xs leading-[inherit] [&[class~='group/is-loading']]:opacity-65",
            current ? "" : "is-loading group/is-loading",
            placeholderClassName,
          )}
        >
          {current?.error ? (
            <ImageOff size={30} aria-hidden="true" />
          ) : (
            <Box size={30} aria-hidden="true" />
          )}
          <span>
            {current?.error
              ? "Aperçu indisponible"
              : current
                ? "Aucune pièce visible"
                : "Préparation de l’aperçu"}
          </span>
        </div>
      )}
    </div>
  );
}
