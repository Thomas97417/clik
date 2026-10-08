import { cn } from "@/lib/utils";
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
      className={cn("challenge-rewards shrink-[0] ml-[auto]")}
      aria-label="Récompenses du défi"
    >
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger
          className={cn(
            "challenge-rewards-toggle py-[6px] gap-[9px] border-[length:1px] border-solid border-[color:#dee5f0] inline-flex items-center min-h-[44px] pr-[12px] pl-[7px] rounded-[11px] bg-[#fff] text-[color:#435773] [font-size:13px] font-[600] whitespace-nowrap [&:hover]:border-[color:#dcc99e] [&:hover]:bg-[#fffcf5] [&[data-popup-open]]:border-[color:#dcc99e] [&[data-popup-open]]:bg-[#fffcf5] [&:focus-visible]:[outline:2px_solid_#356ae6] [&:focus-visible]:[outline-offset:3px] [&[data-popup-open]_[class~='group/challenge-rewards-chevron']]:[transform:rotate(180deg)]",
          )}
        >
          <span
            className={cn(
              "challenge-rewards-mark grid [place-items:center] shrink-[0] w-[30px] h-[30px] rounded-[8px] bg-[#f5eedf] text-[color:#aa7b2d]",
            )}
            aria-hidden="true"
          >
            <Crown size={17} strokeWidth={1.6} />
          </span>
          {complete
            ? "Voir le podium"
            : due
              ? "Attribution en cours"
              : "Récompenses"}
          <ChevronDown
            className={cn(
              "challenge-rewards-chevron group/challenge-rewards-chevron shrink-[0] text-[color:#657b9b] [transition:transform_150ms] motion-reduce:[transition:none]",
            )}
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
            className={cn("challenge-rewards-positioner z-[60]")}
          >
            <Popover.Popup
              className={cn(
                "challenge-rewards-panel p-[18px] border-[length:1px] border-solid border-[color:#dce5f3] w-[360px] max-w-[calc(100vw_-_24px)] max-h-[min(480px,_var(--available-height))] overflow-y-auto [overscroll-behavior:contain] rounded-[14px] bg-[#fff] [box-shadow:0_16px_48px_#243b6324] [&_a:focus-visible]:[outline:2px_solid_#356ae6] [&_a:focus-visible]:[outline-offset:3px] [&_a:focus-visible]:rounded-[4px]",
              )}
            >
              <Popover.Title
                className={cn(
                  "challenge-rewards-title m-[0] text-[color:#263b58] [font-size:15px] font-[650] leading-[1.4]",
                )}
              >
                {complete
                  ? "Podium du défi"
                  : due
                    ? "Attribution en cours"
                    : "Or, argent, bronze"}
              </Popover.Title>
              <Popover.Description
                className={cn(
                  "challenge-rewards-description mx-[0] mt-[6px] mb-[0] [font-size:12px] leading-[1.65] text-[color:#65758e]",
                )}
              >
                {complete
                  ? "Les nouveaux votes ne changent plus le podium."
                  : due
                    ? "Le classement est figé. Les couronnes sont en cours d’attribution."
                    : "Une couronne pour les 3 premières places. Au moins un vote, ex æquo récompensés."}
              </Popover.Description>
              {!complete && !due && (
                <p
                  className={cn(
                    "challenge-rewards-date mx-[0] mt-[12px] mb-[0] pt-[12px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#edf0f6] text-[color:#65758e] [font-size:11px] leading-[1.7] [&_time]:text-[color:#435773] [&_time]:font-[600]",
                  )}
                >
                  Attribution le{" "}
                  <time dateTime={new Date(challenge.rewardAt).toISOString()}>
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
                      className={cn(
                        "challenge-rewards-status mx-[0] mt-[6px] mb-[0] [font-size:12px] leading-[1.65] text-[color:#65758e]",
                      )}
                      role="status"
                    >
                      Chargement du podium…
                    </p>
                  ) : !results.length ? (
                    <p
                      className={cn(
                        "challenge-rewards-status mx-[0] mt-[6px] mb-[0] [font-size:12px] leading-[1.65] text-[color:#65758e]",
                      )}
                    >
                      Aucune couronne attribuée pour ce défi.
                    </p>
                  ) : (
                    <div className={cn("challenge-podium grid mt-[12px]")}>
                      {results.map((winner) => {
                        const crown = CROWNS[winner.rank - 1];
                        return (
                          <article
                            className={cn(
                              "challenge-winner px-[0] py-[12px] gap-[10px] grid grid-cols-[86px_minmax(0,_1fr)_auto] items-center min-w-[0] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#edf0f6] [&:last-child]:pb-[0] [&:last-child]:[border-bottom-width:0] [&:last-child]:[border-bottom-style:none] [&:last-child]:[border-bottom-color:currentColor] [&_small]:text-[color:#7c8aa0] [&_small]:[font-size:10px] [&_small]:whitespace-nowrap",
                            )}
                            key={winner._id}
                          >
                            <span
                              className={cn(
                                "challenge-winner-rank px-[6px] py-[4px] gap-[4px] inline-flex items-center [justify-self:start] rounded-[5px] [font-size:10px] font-[600] whitespace-nowrap",
                              )}
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
                            <div
                              className={cn(
                                "challenge-winner-copy gap-[5px] flex flex-col min-w-[0] [&_>_strong]:text-[color:#243753] [&_>_strong]:[font-size:12px] [&_>_strong]:font-[600] [&_>_strong]:leading-[1.5] [&_>_strong]:[overflow-wrap:anywhere] [&_[class~='group/author-link']]:[font-size:11px] [&_[class~='group/author-link']]:font-[400]",
                              )}
                            >
                              {winner.publicationId ? (
                                <Link
                                  className={cn(
                                    "challenge-winner-title text-[color:#243753] [font-size:12px] font-[600] leading-[1.5] [overflow-wrap:anywhere] [&:hover]:text-[color:#356ae6]",
                                  )}
                                  to="/creations/$publicationId"
                                  params={{
                                    publicationId: winner.publicationId,
                                  }}
                                >
                                  {winner.title}
                                </Link>
                              ) : (
                                <strong>{winner.title}</strong>
                              )}
                              {winner.owner && winner.author && (
                                <AuthorLink
                                  id={winner.owner}
                                  name={winner.author}
                                  avatar={winner.avatar ?? undefined}
                                />
                              )}
                            </div>
                            <small>
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
                      className={cn(
                        "challenge-podium-more px-[0] py-[6px] mx-[0] border-[length:0] border-none border-[color:currentColor] block mt-[12px] mb-[0] bg-[transparent] text-[color:#356ae6] [font-size:11px] cursor-[pointer] [&:hover]:[text-decoration:underline] [&:focus-visible]:[outline:2px_solid_#356ae6] [&:focus-visible]:[outline-offset:3px] [&:focus-visible]:rounded-[4px]",
                      )}
                      onClick={() => loadMore(12)}
                    >
                      Voir les autres ex æquo
                    </button>
                  )}
                  {status === "LoadingMore" && (
                    <p
                      className={cn(
                        "challenge-rewards-status mx-[0] mt-[6px] mb-[0] [font-size:12px] leading-[1.65] text-[color:#65758e]",
                      )}
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
