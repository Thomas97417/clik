import { usePublicPagination } from "@/lib/clik/use-public-pagination";
import type { PublicData } from "@/lib/seo/public-data";
import { useId, useState } from "react";
import { useHydrated } from "@tanstack/react-router";
import {
  ArrowRight,
  ChevronDown,
  GitBranch,
  LoaderCircle,
  Plus,
} from "lucide-react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SignInTo } from "@/components/challenges/shared";
import PublicCreationCard from "./public-creation-card";

const gridClass =
  "creation-grid grid grid-cols-3 gap-3 max-xl-narrow:grid-cols-2 max-md-narrow:grid-cols-1";

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
      className="creation-remixes mt-10 border-t border-[#e4eaf2] pt-6 peer-[&]/creation-challenge:mt-7"
      aria-labelledby={`${id}-title`}
    >
      <h2 id={`${id}-title`}>
        <button
          className="creation-remixes-toggle group/creation-remixes-toggle flex w-full cursor-pointer items-center gap-3 rounded-lg text-left text-[#25354e] transition-colors hover:text-[#356ae6] focus-visible:outline-2 focus-visible:outline-[#356ae6] focus-visible:outline-offset-5 disabled:cursor-not-allowed max-xs:gap-2.5"
          type="button"
          disabled={!hydrated}
          aria-expanded={expanded}
          aria-controls={`${id}-content`}
          onClick={() => setExpanded((value) => !value)}
        >
          <span
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf3ff] text-[#356ae6]"
            aria-hidden="true"
          >
            <GitBranch size={18} />
          </span>
          <span className="creation-remixes-title min-w-0 text-xl leading-snug font-bold tracking-[-0.4px] max-xs:text-lg">
            À partir de cette création
          </span>
          {!!results.length && (
            <span
              className="shrink-0 rounded-md bg-[#eef2f8] px-2 py-1 text-xs font-medium text-[#63758f] tabular-nums max-xs:hidden"
              aria-hidden="true"
              title="Versions affichées"
            >
              {results.length}
              {status === "CanLoadMore" || status === "LoadingMore" ? "+" : ""}
            </span>
          )}
          <span
            className="creation-remixes-action ml-auto inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-2 text-xs font-medium text-[#71839c] group-hover/creation-remixes-toggle:bg-[#edf3ff] group-hover/creation-remixes-toggle:text-[#356ae6]"
            aria-hidden="true"
          >
            <span className="max-sm:hidden">
              {expanded ? "Replier" : "Déplier"}
            </span>
            <ChevronDown
              className="transition-transform group-aria-expanded/creation-remixes-toggle:rotate-180 motion-reduce:transition-none"
              size={16}
            />
          </span>
        </button>
      </h2>
      <div id={`${id}-content`} hidden={!expanded}>
        <p className="creation-remixes-intro mt-2 mb-5 text-[13px] leading-relaxed text-[#71839c]">
          Les reprises et assemblages inspirés par cette idée.
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
                <div
                  key={index}
                  className="flex gap-3 rounded-xl border border-[#e4eaf2] bg-white p-3"
                >
                  <Skeleton className="size-20 shrink-0 rounded-lg bg-[#eef2f8] max-xs:size-18" />
                  <div className="flex-1 space-y-2 pt-1">
                    <Skeleton className="h-4 w-3/4 rounded bg-[#eef2f8]" />
                    <Skeleton className="h-3 w-1/2 rounded bg-[#eef2f8]" />
                    <Skeleton className="mt-4 h-3 w-1/3 rounded bg-[#eef2f8]" />
                  </div>
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
          <div className="creation-remixes-empty flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-xl border border-[#e4eaf2] bg-[#f8fafc] p-5 max-xs:p-4">
            <div>
              <p className="text-sm font-medium text-[#526885]">
                La prochaine version pourrait être la vôtre.
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-[#71839c]">
                Reprenez cette idée et apportez-y votre touche.
              </p>
            </div>
            {isAuthenticated ? (
              <Button
                variant="outline"
                className="creation-remixes-create min-h-10 gap-2 rounded-lg border-[#dce6f7] bg-white px-3 text-xs font-semibold text-[#356ae6] hover:border-[#b4c6e5] hover:bg-[#edf3ff]"
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
                className="creation-remixes-create min-h-10 gap-2 rounded-lg border border-[#dce6f7] bg-white px-3 hover:border-[#b4c6e5] hover:bg-[#edf3ff]"
                title="Connectez-vous pour créer votre version"
              >
                Créer votre version <ArrowRight size={14} aria-hidden="true" />
              </SignInTo>
            )}
          </div>
        )}
        {(status === "CanLoadMore" || status === "LoadingMore") && (
          <Button
            className="creation-remixes-more mx-auto mt-5 flex min-h-10 gap-2 rounded-lg border-[#dfe5ef] bg-white px-4 text-[#526885] hover:border-[#b4c6e5] hover:bg-[#edf3ff] hover:text-[#356ae6]"
            variant="outline"
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
