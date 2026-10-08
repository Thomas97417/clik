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
    <section
      className="creation-remixes group/creation-remixes px-7 mt-11 pt-5 pb-7 rounded-3xl bg-[#f2eef8] [@media(width<=700px)]:p-4 [@media(width<=700px)]:rounded-[20px] peer-[&]/creation-challenge:mt-6"
      aria-labelledby={`${id}-title`}
    >
      <h2 id={`${id}-title`}>
        <button
          className="disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 creation-remixes-toggle gap-4.5 flex items-center w-full text-left cursor-pointer rounded-[14px] [@media(width<=700px)]:gap-2.5 [@media(width<=700px)]:grid [@media(width<=700px)]:grid-cols-[54px_minmax(0,1fr)_32px] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#8c6ab2] focus-visible:outline-offset-5 group/creation-remixes-toggle"
          type="button"
          disabled={!hydrated}
          aria-expanded={expanded}
          aria-controls={`${id}-content`}
          onClick={() => setExpanded((value) => !value)}
        >
          <CommunityArt
            className="[@media(width<=700px)]:w-13.5 [@media(width<=700px)]:h-14"
            kind="remixes"
          />
          <span className="creation-remixes-title max-w-112.5 text-[clamp(21px,_2.3vw,_29px)] font-[750] tracking-[-0.8px] leading-[1.2] text-[#403657] [@media(width<=700px)]:text-xl [@media(width<=700px)]:flex-1 [@media(width<=700px)]:min-w-0">
            À partir de cette création
          </span>
          <span
            className="creation-remixes-action group/creation-remixes-action px-3 py-2.25 gap-2 border border-solid border-[#ded5eb] inline-flex items-center shrink-0 ml-auto rounded-[20px] bg-[#ffffff80] text-xs leading-[inherit] font-medium text-[#766387] [@media(width<=700px)]:p-0 [@media(width<=700px)]:gap-0 [@media(width<=700px)]:text-[0px] [@media(width<=700px)]:justify-center [@media(width<=700px)]:size-8 group-hover/creation-remixes-toggle:border-[#baa5d4] group-hover/creation-remixes-toggle:bg-white group-hover/creation-remixes-toggle:text-[#594170]"
            aria-hidden="true"
          >
            {expanded ? "Replier" : "Déplier"}
            <ChevronDown
              className="shrink-0 group-aria-expanded/creation-remixes-toggle:transform-[rotate(180deg)]"
              size={16}
            />
          </span>
        </button>
      </h2>
      <div id={`${id}-content`} hidden={!expanded}>
        <p className="creation-remixes-intro -mt-1.75 mr-27.5 mb-7 ml-32.5 text-[#80718f] text-[13px] leading-[1.8] [@media(width<=700px)]:mx-0 [@media(width<=700px)]:mt-4 [@media(width<=700px)]:mb-5.5 [@media(width<=700px)]:text-xs">
          Tout commence avec une idée. Voici les chemins qu’elle a inspirés.
        </p>
        {status === "LoadingFirstPage" ? (
          <p
            className="creation-remixes-empty px-6 py-6.5 mt-4.5 border-t border-t-[#d8cce5] text-[#655279] text-base leading-[1.6] [@media(width<=700px)]:px-0 [@media(width<=700px)]:pt-5 [@media(width<=700px)]:pb-2 border-dashed"
            role="status"
          >
            Chargement des reprises et assemblages…
          </p>
        ) : results.length ? (
          <div className="creation-grid group/creation-grid grid grid-cols-3 [@media(width<=520px)]:gap-3.75 [@media(width<=520px)]:grid-cols-1 [@media(520px<width<=850px)]:gap-3.75 [@media(520px<width<=850px)]:grid-cols-2 gap-5 [@media(width<=700px)]:grid-cols-1">
            {results.map((creation) => (
              <PublicCreationCard
                className="border-[#e5deee] rounded-2xl"
                key={creation._id}
                creation={creation}
              />
            ))}
          </div>
        ) : (
          <div className="creation-remixes-empty px-6 py-6.5 mt-4.5 border-t border-t-[#d8cce5] text-[#655279] text-base leading-[1.6] [@media(width<=700px)]:px-0 [@media(width<=700px)]:pt-5 [@media(width<=700px)]:pb-2 border-dashed">
            <p>La prochaine version pourrait être la vôtre.</p>
            <span className="block max-w-130 mt-2 text-[#867792] text-[13px]">
              Pour l’instant, cette idée attend sa première nouvelle branche.
              Les reprises et assemblages publiés trouveront leur place ici.
            </span>
          </div>
        )}
        {(status === "CanLoadMore" || status === "LoadingMore") && (
          <Button
            className="creation-remixes-more px-4.5 py-2 mx-auto gap-2 border border-solid border-[#d9cde6] flex mt-6 mb-0 min-h-10 rounded-[20px] text-[#705488] bg-[#ffffffb3]"
            variant="outline"
            disabled={!hydrated || status === "LoadingMore"}
            onClick={() => loadMore(6)}
          >
            <Plus
              className="size-4 pointer-events-none shrink-0"
              size={15}
              aria-hidden="true"
            />
            {status === "LoadingMore" ? "Chargement…" : "Voir plus de versions"}
          </Button>
        )}
      </div>
    </section>
  );
}
