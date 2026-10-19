import { usePublicPagination } from "@/lib/clik/use-public-pagination";
import type { PublicData } from "@/lib/seo/public-data";
import { useId, useState } from "react";
import { useHydrated } from "@tanstack/react-router";
import { ArrowRight, ChevronDown, LoaderCircle, Plus } from "lucide-react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SignInTo } from "@/components/challenges/shared";
import PublicCreationCard from "./public-creation-card";

const gridClass =
  "creation-grid grid grid-cols-2 gap-x-3 gap-y-5 max-3xs:grid-cols-1";

export default function CreationRemixes({
  publicationId,
  initial,
  isAuthenticated,
  creatingVersion,
  onCreateVersion,
}: {
  publicationId: Id<"publications">;
  initial?: PublicData["creation"]["remixes"];
  isAuthenticated: boolean;
  creatingVersion: boolean;
  onCreateVersion: () => Promise<void>;
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
      className="creation-remixes min-w-0 border-l border-[#e8edf3] pl-7 max-lg-narrow:border-t max-lg-narrow:border-l-0 max-lg-narrow:pt-7 max-lg-narrow:pl-0 lg-start:max-xl-narrow:pl-5"
      aria-labelledby={`${id}-title`}
    >
      <h2 id={`${id}-title`}>
        <button
          className="creation-remixes-toggle group/creation-remixes-toggle flex min-h-8 w-full cursor-pointer items-center gap-2 rounded-sm text-left text-[#25354e] transition-colors hover:text-[#356ae6] focus-visible:outline-2 focus-visible:outline-[#356ae6] focus-visible:outline-offset-4 disabled:cursor-not-allowed"
          type="button"
          disabled={!hydrated}
          aria-expanded={expanded}
          aria-controls={`${id}-content`}
          title={
            expanded
              ? "Replier les créations inspirées"
              : "Déplier les créations inspirées"
          }
          onClick={() => setExpanded((value) => !value)}
        >
          <span className="creation-remixes-title min-w-0 text-[17px] leading-snug font-bold tracking-[-0.3px]">
            Créations inspirées
          </span>
          {status !== "LoadingFirstPage" && (
            <span
              className="shrink-0 text-[11px] font-medium text-[#8190a5] tabular-nums"
              aria-hidden="true"
              title="Versions affichées"
            >
              {results.length}
              {status === "CanLoadMore" || status === "LoadingMore" ? "+" : ""}
            </span>
          )}
          <span
            className="creation-remixes-action ml-auto inline-flex size-7 shrink-0 items-center justify-center rounded-md text-[#8190a5] group-hover/creation-remixes-toggle:bg-[#f0f4fa] group-hover/creation-remixes-toggle:text-[#356ae6]"
            aria-hidden="true"
          >
            <ChevronDown
              className="transition-transform group-aria-expanded/creation-remixes-toggle:rotate-180 motion-reduce:transition-none"
              size={16}
            />
          </span>
        </button>
      </h2>
      <div id={`${id}-content`} hidden={!expanded}>
        <p className="creation-remixes-intro mt-1 mb-5 text-[11px] leading-relaxed text-[#8190a5]">
          Reprises et assemblages de la communauté.
        </p>
        {status === "LoadingFirstPage" ? (
          <div
            role="status"
            aria-label="Chargement des reprises et assemblages"
          >
            <span className="sr-only">
              Chargement des reprises et assemblages…
            </span>
            <div className={gridClass} aria-hidden="true">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="min-w-0">
                  <Skeleton className="aspect-4/3 w-full rounded-lg bg-[#eef2f8]" />
                  <Skeleton className="mt-3 h-3 w-4/5 rounded bg-[#eef2f8]" />
                  <Skeleton className="mt-2 h-3 w-1/2 rounded bg-[#eef2f8]" />
                </div>
              ))}
            </div>
          </div>
        ) : results.length ? (
          <div className={gridClass}>
            {results.map((creation) => (
              <PublicCreationCard
                compact
                key={creation._id}
                creation={creation}
              />
            ))}
          </div>
        ) : (
          <div className="creation-remixes-empty border-t border-[#edf0f5] pt-5">
            <div>
              <p className="text-[13px] font-medium text-[#526783]">
                Aucune reprise pour le moment.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[#8190a5]">
                Proposez la première version de cette construction.
              </p>
            </div>
            {isAuthenticated ? (
              <Button
                variant="ghost"
                className="creation-remixes-create mt-3 h-auto min-h-9 max-w-full justify-start gap-2 rounded-md px-0 text-xs font-semibold whitespace-normal text-[#356ae6] hover:bg-transparent hover:text-[#2458ce] hover:underline hover:underline-offset-4"
                disabled={!hydrated || creatingVersion}
                aria-busy={creatingVersion}
                onClick={onCreateVersion}
              >
                {creatingVersion ? (
                  <LoaderCircle
                    className="animate-spin motion-reduce:animate-none"
                    size={14}
                    aria-hidden="true"
                  />
                ) : (
                  <ArrowRight size={14} aria-hidden="true" />
                )}
                {creatingVersion
                  ? "Création de votre version…"
                  : "Créer votre version"}
              </Button>
            ) : (
              <SignInTo
                className="creation-remixes-create mt-3 min-h-9 justify-start gap-2 rounded-md text-xs hover:text-[#2458ce] hover:underline hover:underline-offset-4"
                title="Connectez-vous pour créer votre version"
              >
                Créer votre version <ArrowRight size={14} aria-hidden="true" />
              </SignInTo>
            )}
          </div>
        )}
        {(status === "CanLoadMore" || status === "LoadingMore") && (
          <Button
            className="creation-remixes-more mt-5 flex h-auto min-h-9 w-full gap-2 rounded-md px-2 text-xs text-[#63758f] hover:bg-[#f1f4f9] hover:text-[#356ae6]"
            variant="ghost"
            disabled={!hydrated || status === "LoadingMore"}
            aria-busy={status === "LoadingMore"}
            onClick={() => loadMore(6)}
          >
            {status === "LoadingMore" ? (
              <LoaderCircle
                className="animate-spin motion-reduce:animate-none"
                size={15}
                aria-hidden="true"
              />
            ) : (
              <Plus size={15} aria-hidden="true" />
            )}
            {status === "LoadingMore" ? "Chargement…" : "Voir plus de versions"}
          </Button>
        )}
      </div>
    </section>
  );
}
