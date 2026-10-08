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
}: {
  scene: SceneDocument | string;
  cacheKey: string;
  title: string;
  interactive?: boolean;
  initialZoom?: number;
  poster?: string;
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
        "creation-preview group/creation-preview inset-[0] absolute [&_img]:object-contain",
      )}
      aria-busy={!current}
    >
      {current?.url ? (
        <>
          <div
            ref={surface}
            className={cn(
              cn(
                "creation-preview-surface inset-[0] absolute [&[class~='group/is-interactive']]:cursor-[grab] [&[class~='group/is-interactive']]:select-none [&[class~='group/is-interactive']]:rounded-[14px] [&[data-dragging='true']]:cursor-[grabbing] [&:focus-visible]:[outline:2px_solid_#356ae6] [&:focus-visible]:[outline-offset:-4px] [&_canvas]:inset-[0] [&_canvas]:absolute [&_canvas]:w-[100%] [&_canvas]:h-[100%] [&_canvas]:object-contain [&_canvas]:pointer-events-none [&[data-live='true']_img]:opacity-[0]",
                interactiveReady ? "is-interactive group/is-interactive" : "",
              ),
            )}
            tabIndex={interactiveReady ? 0 : undefined}
            role={interactiveReady ? "group" : undefined}
            aria-label={interactiveReady ? `Manipuler ${title}` : undefined}
            aria-describedby={interactiveReady ? instructionsId : undefined}
          >
            <img
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
            {interactive && <canvas ref={canvas} hidden aria-hidden="true" />}
          </div>
          {interactiveReady && (
            <div
              className={cn(
                "creation-preview-controls group/creation-preview-controls gap-[3px] absolute bottom-[5px] right-[5px] flex items-center text-[color:#626b8d] [&_button]:grid [&_button]:[place-items:center] [&_button]:w-[30px] [&_button]:h-[30px] [&_button]:rounded-[8px] [&_button]:bg-[#ffffffcf] [&_button:hover]:bg-[white] [&_button:hover]:text-[color:#356ae6] [&_button:focus-visible]:[outline:2px_solid_#356ae6]",
              )}
            >
              <span id={instructionsId} className="sr-only">
                Glissez pour tourner. Cliquez sur l’aperçu puis utilisez la
                molette pour zoomer. Au clavier : flèches pour tourner, + et −
                pour zoomer, Début pour réinitialiser.
              </span>
              <span
                className={cn(
                  "creation-preview-hint [font-size:11px] mr-[6px] [@media(width<=360px)]:hidden",
                )}
                aria-hidden="true"
              >
                Glisser pour tourner
              </span>
              <button
                type="button"
                title="Dézoomer l’aperçu"
                aria-label="Dézoomer l’aperçu"
                onClick={() => controls.current?.zoom(-1)}
              >
                <Minus size={15} />
              </button>
              <button
                type="button"
                title="Zoomer l’aperçu"
                aria-label="Zoomer l’aperçu"
                onClick={() => controls.current?.zoom(1)}
              >
                <Plus size={15} />
              </button>
              <button
                type="button"
                title="Réinitialiser la vue"
                aria-label="Réinitialiser la vue"
                onClick={() => controls.current?.reset()}
              >
                <RotateCcw size={15} />
              </button>
            </div>
          )}
        </>
      ) : (
        <div
          className={cn(
            cn(
              "creation-preview-placeholder group/creation-preview-placeholder gap-[12px] flex h-[100%] items-center justify-center flex-col text-[color:#7184a0] [font-size:12px] [&[class~='group/is-loading']]:opacity-[0.65]",
              current ? "" : "is-loading group/is-loading",
            ),
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
