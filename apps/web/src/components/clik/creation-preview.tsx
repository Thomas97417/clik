import { useEffect, useId, useRef, useState } from "react";
import { Box, ImageOff, Minus, Plus, RotateCcw } from "lucide-react";
import { validateScene, type SceneDocument } from "@clik/scene";
import type { attachPreviewControls } from "@/lib/clik/preview-controls";

export default function CreationPreview({
  scene,
  cacheKey,
  title,
  interactive = false,
}: {
  scene: SceneDocument | string;
  cacheKey: string;
  title: string;
  interactive?: boolean;
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
    if (!visible) return;
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
  }, [visible, scene, cacheKey]);
  const current = preview?.key === cacheKey ? preview : undefined;
  useEffect(() => {
    setInteractiveReady(false);
    if (!interactive || !current?.url) return;
    let active = true;
    import("@/lib/clik/preview-controls")
      .then(({ attachPreviewControls }) => {
        if (!active || !surface.current || !canvas.current) return;
        controls.current = attachPreviewControls(
          surface.current,
          canvas.current,
          validateScene(typeof scene === "string" ? JSON.parse(scene) : scene),
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
  }, [interactive, current?.url, scene, cacheKey]);
  return (
    <div ref={ref} className="creation-preview" aria-busy={!current}>
      {current?.url ? (
        <>
          <div
            ref={surface}
            className={`creation-preview-surface ${interactiveReady ? "is-interactive" : ""}`}
            tabIndex={interactiveReady ? 0 : undefined}
            role={interactiveReady ? "group" : undefined}
            aria-label={interactiveReady ? `Manipuler ${title}` : undefined}
            aria-describedby={interactiveReady ? instructionsId : undefined}
          >
            <img
              src={current.url}
              alt={`Aperçu de ${title}`}
              draggable={false}
            />
            {interactive && <canvas ref={canvas} hidden aria-hidden="true" />}
          </div>
          {interactiveReady && (
            <div className="creation-preview-controls">
              <span id={instructionsId} className="sr-only">
                Glissez pour tourner. Cliquez sur l’aperçu puis utilisez la
                molette pour zoomer. Au clavier : flèches pour tourner, + et −
                pour zoomer, Début pour réinitialiser.
              </span>
              <span className="creation-preview-hint" aria-hidden="true">
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
          className={`creation-preview-placeholder ${current ? "" : "is-loading"}`}
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
