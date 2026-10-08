import { cn } from "@/lib/utils";
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
      className={cn(
        "creation-remixes group/creation-remixes px-[28px] mt-[44px] pt-[20px] pb-[28px] rounded-[24px] bg-[#f2eef8] [@media(width<=700px)]:p-[16px] [@media(width<=700px)]:rounded-[20px] [&_[class~='group/creation-grid']]:gap-[20px] [@media(width<=700px)]:[&_[class~='group/creation-grid']]:grid-cols-[1fr] [&_[class~='group/creation-card']]:border-[color:#e5deee] [&_[class~='group/creation-card']]:rounded-[16px]",
      )}
      aria-labelledby={`${id}-title`}
    >
      <h2 id={`${id}-title`}>
        <button
          className={cn(
            "creation-remixes-toggle gap-[18px] flex items-center w-[100%] text-left cursor-[pointer] rounded-[14px] [@media(width<=700px)]:gap-[10px] [@media(width<=700px)]:grid [@media(width<=700px)]:grid-cols-[54px_minmax(0,_1fr)_32px] [&[aria-expanded='true']_[class~='group/creation-remixes-action']_svg]:[transform:rotate(180deg)] [&:hover_[class~='group/creation-remixes-action']]:border-[color:#baa5d4] [&:hover_[class~='group/creation-remixes-action']]:bg-[#fff] [&:hover_[class~='group/creation-remixes-action']]:text-[color:#594170] [&:focus-visible]:[outline:2px_solid_#8c6ab2] [&:focus-visible]:[outline-offset:5px] [@media(width<=700px)]:[&_[class~='group/community-art']]:w-[54px] [@media(width<=700px)]:[&_[class~='group/community-art']]:h-[56px]",
          )}
          type="button"
          disabled={!hydrated}
          aria-expanded={expanded}
          aria-controls={`${id}-content`}
          onClick={() => setExpanded((value) => !value)}
        >
          <CommunityArt kind="remixes" />
          <span
            className={cn(
              "creation-remixes-title max-w-[450px] [font-size:clamp(21px,_2.3vw,_29px)] font-[750] tracking-[-0.8px] leading-[1.2] text-[color:#403657] [@media(width<=700px)]:[font-size:20px] [@media(width<=700px)]:flex-[1] [@media(width<=700px)]:min-w-[0]",
            )}
          >
            À partir de cette création
          </span>
          <span
            className={cn(
              "creation-remixes-action group/creation-remixes-action px-[12px] py-[9px] gap-[8px] border-[length:1px] border-solid border-[color:#ded5eb] inline-flex items-center shrink-[0] ml-[auto] rounded-[20px] bg-[#ffffff80] [font-size:12px] font-[500] text-[color:#766387] [@media(width<=700px)]:p-[0] [@media(width<=700px)]:gap-[0] [@media(width<=700px)]:[font-size:0] [@media(width<=700px)]:justify-center [@media(width<=700px)]:w-[32px] [@media(width<=700px)]:h-[32px]",
            )}
            aria-hidden="true"
          >
            {expanded ? "Replier" : "Déplier"}
            <ChevronDown size={16} />
          </span>
        </button>
      </h2>
      <div id={`${id}-content`} hidden={!expanded}>
        <p
          className={cn(
            "creation-remixes-intro mt-[-7px] mr-[110px] mb-[28px] ml-[130px] text-[color:#80718f] [font-size:13px] leading-[1.8] [@media(width<=700px)]:mx-[0] [@media(width<=700px)]:mt-[16px] [@media(width<=700px)]:mb-[22px] [@media(width<=700px)]:[font-size:12px]",
          )}
        >
          Tout commence avec une idée. Voici les chemins qu’elle a inspirés.
        </p>
        {status === "LoadingFirstPage" ? (
          <p
            className={cn(
              "creation-remixes-empty px-[24px] py-[26px] mt-[18px] [border-top-width:1px] [border-top-style:dashed] [border-top-color:#d8cce5] text-[color:#655279] [font-size:16px] leading-[1.6] [@media(width<=700px)]:px-[0] [@media(width<=700px)]:pt-[20px] [@media(width<=700px)]:pb-[8px] [&_span]:block [&_span]:max-w-[520px] [&_span]:mt-[8px] [&_span]:text-[color:#867792] [&_span]:[font-size:13px]",
            )}
            role="status"
          >
            Chargement des reprises et assemblages…
          </p>
        ) : results.length ? (
          <div
            className={cn(
              "creation-grid group/creation-grid gap-[26px] grid grid-cols-[repeat(3,_1fr)] [@media(width<=520px)]:gap-[15px] [@media(width<=520px)]:grid-cols-[1fr] [@media(520px<width<=850px)]:gap-[15px] [@media(520px<width<=850px)]:grid-cols-[repeat(2,_1fr)]",
            )}
          >
            {results.map((creation) => (
              <PublicCreationCard key={creation._id} creation={creation} />
            ))}
          </div>
        ) : (
          <div
            className={cn(
              "creation-remixes-empty px-[24px] py-[26px] mt-[18px] [border-top-width:1px] [border-top-style:dashed] [border-top-color:#d8cce5] text-[color:#655279] [font-size:16px] leading-[1.6] [@media(width<=700px)]:px-[0] [@media(width<=700px)]:pt-[20px] [@media(width<=700px)]:pb-[8px] [&_span]:block [&_span]:max-w-[520px] [&_span]:mt-[8px] [&_span]:text-[color:#867792] [&_span]:[font-size:13px]",
            )}
          >
            <p>La prochaine version pourrait être la vôtre.</p>
            <span>
              Pour l’instant, cette idée attend sa première nouvelle branche.
              Les reprises et assemblages publiés trouveront leur place ici.
            </span>
          </div>
        )}
        {(status === "CanLoadMore" || status === "LoadingMore") && (
          <Button
            className={cn(
              "creation-remixes-more px-[18px] py-[8px] mx-[auto] gap-[8px] border-[length:1px] border-solid border-[color:#d9cde6] flex mt-[24px] mb-[0] min-h-[40px] rounded-[20px] text-[color:#705488] bg-[#ffffffb3]",
            )}
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
