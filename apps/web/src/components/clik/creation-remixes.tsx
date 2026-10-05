import { usePublicPagination } from "@/lib/clik/use-public-pagination";
import type { PublicData } from "@/lib/seo/public-data";
import { useId, useState } from "react";
import { useHydrated } from "@tanstack/react-router";

import { ChevronDown, Plus } from "lucide-react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import PublicCreationCard from "./public-creation-card";
import CommunityArt from "./community-art";

export default function CreationRemixes({
  publicationId,
  initial,
}: {
  publicationId: Id<"publications">;
  initial?: PublicData["creation"]["remixes"];
}) {
  const [expanded, setExpanded] = useState(true);
  const hydrated = useHydrated();
  const id = useId();
  const { results, status, loadMore } = usePublicPagination(
    api.projects.remixes,
    { publicationId },
    initial,
    undefined,
    6,
  );
  return (
    <section className="creation-remixes" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>
        <button
          className="creation-remixes-toggle"
          type="button"
          disabled={!hydrated}
          aria-expanded={expanded}
          aria-controls={`${id}-content`}
          onClick={() => setExpanded((value) => !value)}
        >
          <CommunityArt kind="remixes" />
          <span className="creation-remixes-title">
            À partir de cette création
          </span>
          <span className="creation-remixes-action" aria-hidden="true">
            {expanded ? "Replier" : "Déplier"}
            <ChevronDown size={16} />
          </span>
        </button>
      </h2>
      <div id={`${id}-content`} hidden={!expanded}>
        <p className="creation-remixes-intro">
          Tout commence avec une idée. Voici les chemins qu’elle a inspirés.
        </p>
        {status === "LoadingFirstPage" ? (
          <p className="creation-remixes-empty" role="status">
            Chargement des reprises et assemblages…
          </p>
        ) : results.length ? (
          <div className="creation-grid">
            {results.map((creation) => (
              <PublicCreationCard key={creation._id} creation={creation} />
            ))}
          </div>
        ) : (
          <div className="creation-remixes-empty">
            <p>La prochaine version pourrait être la vôtre.</p>
            <span>
              Pour l’instant, cette idée attend sa première nouvelle branche.
              Les reprises et assemblages publiés trouveront leur place ici.
            </span>
          </div>
        )}
        {(status === "CanLoadMore" || status === "LoadingMore") && (
          <Button
            className="creation-remixes-more"
            variant="outline"
            disabled={!hydrated || status === "LoadingMore"}
            onClick={() => loadMore(6)}
          >
            <Plus size={15} aria-hidden="true" />
            {status === "LoadingMore" ? "Chargement…" : "Voir plus de versions"}
          </Button>
        )}
      </div>
    </section>
  );
}
