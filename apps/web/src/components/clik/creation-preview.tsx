import { useEffect, useRef, useState } from "react";
import { Box, ImageOff } from "lucide-react";
import { validateScene, type SceneDocument } from "@clik/scene";

export default function CreationPreview({
  scene,
  cacheKey,
  title,
}: {
  scene: SceneDocument | string;
  cacheKey: string;
  title: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
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
  return (
    <div ref={ref} className="creation-preview" aria-busy={!current}>
      {current?.url ? (
        <img src={current.url} alt={`Aperçu de ${title}`} draggable={false} />
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
