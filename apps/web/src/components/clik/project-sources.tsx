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
      className="project-sources"
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
