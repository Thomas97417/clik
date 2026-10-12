import { cn } from "@/lib/utils";
import { memo, useEffect, useId, useState } from "react";
import { Box } from "lucide-react";
import type { PartType } from "@clik/scene";
import { partPreviewColorMatrix } from "@/lib/clik/part-preview-color";

const PartPreview = memo(function PartPreview({
  className,
  type,
  color,
}: {
  className?: string;
  type: PartType;
  color: string;
}) {
  const [url, setUrl] = useState("");
  const filterId = useId();
  useEffect(() => {
    let active = true;
    import("@/lib/clik/thumbnail")
      .then(({ partThumbnail }) => {
        if (active) setUrl(partThumbnail(type));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [type]);
  return (
    <>
      <svg
        width="0"
        height="0"
        aria-hidden="true"
        className="pointer-events-none absolute"
      >
        <defs>
          <filter id={filterId} colorInterpolationFilters="linearRGB">
            <feColorMatrix
              type="matrix"
              values={partPreviewColorMatrix(color)}
            />
          </filter>
        </defs>
      </svg>
      {url ? (
        <img
          className={cn(
            "part-preview group/part-preview h-13.75 w-full object-contain pointer-events-none",
            className,
          )}
          src={url}
          style={{ filter: `url(#${filterId})` }}
          alt=""
          draggable={false}
        />
      ) : (
        <Box size={36} color={color} />
      )}
    </>
  );
});

export default PartPreview;
