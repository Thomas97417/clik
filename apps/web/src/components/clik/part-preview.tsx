import { useEffect, useState } from "react";
import { Box } from "lucide-react";
import type { PartType } from "@clik/scene";
export default function PartPreview({
  type,
  color,
}: {
  type: PartType;
  color: string;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    import("@/lib/clik/thumbnail")
      .then(({ partThumbnail }) => {
        if (active) setUrl(partThumbnail(type, color));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [type, color]);
  return url ? (
    <img className="part-preview" src={url} alt="" draggable={false} />
  ) : (
    <Box size={36} color={color} />
  );
}
