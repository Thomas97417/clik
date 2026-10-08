import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import { GitBranch, ChevronDown } from "lucide-react";
import type { Attribution } from "@clik/scene";

export default function ProjectSources({
  sources,
}: {
  sources: Attribution[];
}) {
  const [open, setOpen] = useState(false);
  const availability = useQuery(
    api.projects.sourcesAvailable,
    sources.length && open
      ? {
          ids: sources.map(
            (source) => source.publicationId as Id<"publications">,
          ),
        }
      : "skip",
  );
  if (!sources.length) return null;
  return (
    <details
      className="project-sources relative min-w-0 text-[#536888] group/project-sources"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="gap-1.25 flex items-center cursor-pointer list-none rounded-[4px] [&::-webkit-details-marker]:hidden hover:text-[#356ae6] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-3">
        <GitBranch
          className="group-open/project-sources:last:transform-[rotate(180deg)]"
          size={12}
          aria-hidden="true"
        />
        Sources ({sources.length})
        <ChevronDown
          className="group-open/project-sources:last:transform-[rotate(180deg)]"
          size={12}
          aria-hidden="true"
        />
      </summary>
      <ul className="p-2 overflow-auto border border-solid border-[#e0e6ef] absolute top-[calc(100%+8px)] left-0 z-20 w-72.5 max-w-[70vw] max-h-60 [scrollbar-gutter:stable] bg-white rounded-[9px] [box-shadow:0_10px_30px_#26344c12]">
        {sources.map((source) => (
          <li className="px-2 py-1.5 wrap-anywhere" key={source.publicationId}>
            {availability?.some(
              (item) => item.id === source.publicationId && item.available,
            ) ? (
              <Link
                className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 block text-[#356ae6]"
                to="/creations/$publicationId"
                params={{ publicationId: source.publicationId }}
              >
                « {source.title} »{" "}
                <span className="text-[#8391a5]">par {source.author}</span>
              </Link>
            ) : (
              <span>
                « {source.title} »{" "}
                <span className="text-[#8391a5]">par {source.author}</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
