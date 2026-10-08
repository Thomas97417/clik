import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { usePaginatedQuery } from "convex/react";
import { Link } from "@tanstack/react-router";
import { Crown, ChevronDown } from "lucide-react";
import { CROWNS } from "@clik/avatars";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Doc } from "@my-better-t-app/backend/convex/_generated/dataModel";
import AuthorLink from "@/components/clik/author-link";

export default function ChallengeRewards({
  challenge,
  now,
}: {
  challenge: Doc<"challenges">;
  now: number;
}) {
  const [open, setOpen] = useState(false);
  const complete = challenge.rewardStatus === "complete";
  const { results, status, loadMore } = usePaginatedQuery(
    api.rewards.podium,
    complete && open ? { challengeId: challenge._id } : "skip",
    { initialNumItems: 12 },
  );
  if (!challenge.rewardAt) return null;
  const due = now >= challenge.rewardAt;
  return (
    <section
      className="challenge-rewards shrink-0 ml-auto"
      aria-label="Récompenses du défi"
    >
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 challenge-rewards-toggle py-1.5 gap-2.25 border border-solid border-[#dee5f0] inline-flex items-center min-h-11 pr-3 pl-1.75 rounded-[11px] bg-white text-[#435773] text-[13px] font-semibold whitespace-nowrap hover:border-[#dcc99e] hover:bg-[#fffcf5] data-popup-open:border-[#dcc99e] data-popup-open:bg-[#fffcf5] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-3 group/challenge-rewards-toggle">
          <span
            className="challenge-rewards-mark grid place-items-center shrink-0 rounded-[8px] bg-[#f5eedf] text-[#aa7b2d] size-7.5"
            aria-hidden="true"
          >
            <Crown className="shrink-0" size={17} strokeWidth={1.6} />
          </span>
          {complete
            ? "Voir le podium"
            : due
              ? "Attribution en cours"
              : "Récompenses"}
          <ChevronDown
            className="challenge-rewards-chevron group/challenge-rewards-chevron shrink-0 text-[#657b9b] [transition:transform_150ms] motion-reduce:transition-none group-data-[popup-open]/challenge-rewards-toggle:transform-[rotate(180deg)] motion-reduce:duration-0"
            size={15}
            aria-hidden="true"
          />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner
            align="end"
            sideOffset={10}
            collisionPadding={12}
            collisionAvoidance={{
              side: "flip",
              align: "shift",
              fallbackAxisSide: "none",
            }}
            className="challenge-rewards-positioner z-60"
          >
            <Popover.Popup className="challenge-rewards-panel p-4.5 border border-solid border-[#dce5f3] w-90 max-w-[calc(100vw-24px)] max-h-[min(480px,var(--available-height))] overflow-y-auto overscroll-contain rounded-[14px] bg-white [box-shadow:0_16px_48px_#243b6324]">
              <Popover.Title className="challenge-rewards-title m-0 text-[#263b58] text-[15px] font-[650] leading-[1.4]">
                {complete
                  ? "Podium du défi"
                  : due
                    ? "Attribution en cours"
                    : "Or, argent, bronze"}
              </Popover.Title>
              <Popover.Description className="challenge-rewards-description mx-0 mt-1.5 mb-0 text-xs leading-[1.65] text-[#65758e]">
                {complete
                  ? "Les nouveaux votes ne changent plus le podium."
                  : due
                    ? "Le classement est figé. Les couronnes sont en cours d’attribution."
                    : "Une couronne pour les 3 premières places. Au moins un vote, ex æquo récompensés."}
              </Popover.Description>
              {!complete && !due && (
                <p className="challenge-rewards-date mx-0 mt-3 mb-0 pt-3 border-t border-solid border-t-[#edf0f6] text-[#65758e] text-[11px] leading-[1.7]">
                  Attribution le{" "}
                  <time
                    className="text-[#435773] font-semibold"
                    dateTime={new Date(challenge.rewardAt).toISOString()}
                  >
                    {new Date(challenge.rewardAt).toLocaleString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "UTC",
                    })}{" "}
                    UTC
                  </time>
                </p>
              )}
              {complete && open && (
                <>
                  {status === "LoadingFirstPage" ? (
                    <p
                      className="challenge-rewards-status mx-0 mt-1.5 mb-0 text-xs leading-[1.65] text-[#65758e]"
                      role="status"
                    >
                      Chargement du podium…
                    </p>
                  ) : !results.length ? (
                    <p className="challenge-rewards-status mx-0 mt-1.5 mb-0 text-xs leading-[1.65] text-[#65758e]">
                      Aucune couronne attribuée pour ce défi.
                    </p>
                  ) : (
                    <div className="challenge-podium grid mt-3">
                      {results.map((winner) => {
                        const crown = CROWNS[winner.rank - 1];
                        return (
                          <article
                            className="challenge-winner px-0 py-3 gap-2.5 grid grid-cols-[86px_minmax(0,1fr)_auto] items-center min-w-0 border-b border-solid border-b-[#edf0f6] last:pb-0 last:[border-bottom-width:0] last:border-b-[currentColor]"
                            key={winner._id}
                          >
                            <span
                              className="challenge-winner-rank px-1.5 py-1 gap-1 inline-flex items-center justify-self-start rounded-[5px] text-[10px] font-semibold whitespace-nowrap"
                              style={{
                                color: crown.shade,
                                background: `${crown.color}33`,
                              }}
                            >
                              <Crown size={14} aria-hidden="true" />
                              {winner.rank === 1
                                ? "1er"
                                : `${winner.rank}e`} · {crown.name}
                            </span>
                            <div className="challenge-winner-copy gap-1.25 flex flex-col min-w-0">
                              {winner.publicationId ? (
                                <Link
                                  className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 challenge-winner-title text-[#243753] text-xs font-semibold leading-normal wrap-anywhere hover:text-[#356ae6] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-3 focus-visible:rounded-[4px]"
                                  to="/creations/$publicationId"
                                  params={{
                                    publicationId: winner.publicationId,
                                  }}
                                >
                                  {winner.title}
                                </Link>
                              ) : (
                                <strong className="text-[#243753] text-xs font-semibold leading-normal wrap-anywhere">
                                  {winner.title}
                                </strong>
                              )}
                              {winner.owner && winner.author && (
                                <AuthorLink
                                  className="text-[11px] font-normal"
                                  id={winner.owner}
                                  name={winner.author}
                                  avatar={winner.avatar ?? undefined}
                                />
                              )}
                            </div>
                            <small className="text-[#7c8aa0] text-[10px] whitespace-nowrap">
                              {winner.score} vote{winner.score > 1 ? "s" : ""}
                            </small>
                          </article>
                        );
                      })}
                    </div>
                  )}
                  {status === "CanLoadMore" && (
                    <button
                      type="button"
                      className="disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 challenge-podium-more px-0 py-1.5 mx-0 border-0 border-none border-current block mt-3 mb-0 bg-transparent text-[#356ae6] text-[11px] cursor-pointer hover:underline focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-3 focus-visible:rounded-[4px]"
                      onClick={() => loadMore(12)}
                    >
                      Voir les autres ex æquo
                    </button>
                  )}
                  {status === "LoadingMore" && (
                    <p
                      className="challenge-rewards-status mx-0 mt-1.5 mb-0 text-xs leading-[1.65] text-[#65758e]"
                      role="status"
                    >
                      Chargement…
                    </p>
                  )}
                </>
              )}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </section>
  );
}
