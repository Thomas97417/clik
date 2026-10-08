import { cn } from "@/lib/utils";
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
      className={cn(
        "project-sources relative min-w-[0] text-[color:#536888] [&_summary]:gap-[5px] [&_summary]:flex [&_summary]:items-center [&_summary]:cursor-[pointer] [&_summary]:list-none [&_summary]:rounded-[4px] [&_summary::-webkit-details-marker]:hidden [&_summary:hover]:text-[color:#356ae6] [&_summary:focus-visible]:[outline:2px_solid_#356ae6] [&_summary:focus-visible]:[outline-offset:3px] [&[open]_summary_>_svg:last-child]:[transform:rotate(180deg)] [&_ul]:p-[8px] [&_ul]:overflow-auto [&_ul]:border-[length:1px] [&_ul]:border-solid [&_ul]:border-[color:#e0e6ef] [&_ul]:absolute [&_ul]:top-[calc(100%_+_8px)] [&_ul]:left-[0] [&_ul]:z-[20] [&_ul]:w-[290px] [&_ul]:max-w-[70vw] [&_ul]:max-h-[240px] [&_ul]:[scrollbar-gutter:stable] [&_ul]:bg-[white] [&_ul]:rounded-[9px] [&_ul]:[box-shadow:0_10px_30px_#26344c12] [&_li]:px-[8px] [&_li]:py-[6px] [&_li]:[overflow-wrap:anywhere] [&_li_>_a]:block [&_li_>_a]:text-[color:#356ae6] [&_li_span_span]:text-[color:#8391a5] [&_li_a_span]:text-[color:#8391a5]",
      )}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <GitBranch size={12} aria-hidden="true" />
        Sources ({sources.length})<ChevronDown size={12} aria-hidden="true" />
      </summary>
      <ul>
        {sources.map((source) => (
          <li key={source.publicationId}>
            {availability?.some(
              (item) => item.id === source.publicationId && item.available,
            ) ? (
              <Link
                to="/creations/$publicationId"
                params={{ publicationId: source.publicationId }}
              >
                « {source.title} » <span>par {source.author}</span>
              </Link>
            ) : (
              <span>
                « {source.title} » <span>par {source.author}</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
