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
    <section className="challenge-rewards" aria-label="Récompenses du défi">
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger className="challenge-rewards-toggle">
          <span className="challenge-rewards-mark" aria-hidden="true">
            <Crown size={17} strokeWidth={1.6} />
          </span>
          {complete
            ? "Voir le podium"
            : due
              ? "Attribution en cours"
              : "Récompenses"}
          <ChevronDown
            className="challenge-rewards-chevron"
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
            className="challenge-rewards-positioner"
          >
            <Popover.Popup className="challenge-rewards-panel">
              <Popover.Title className="challenge-rewards-title">
                {complete
                  ? "Podium du défi"
                  : due
                    ? "Attribution en cours"
                    : "Or, argent, bronze"}
              </Popover.Title>
              <Popover.Description className="challenge-rewards-description">
                {complete
                  ? "Les nouveaux votes ne changent plus le podium."
                  : due
                    ? "Le classement est figé. Les couronnes sont en cours d’attribution."
                    : "Une couronne pour les 3 premières places. Au moins un vote, ex æquo récompensés."}
              </Popover.Description>
              {!complete && !due && (
                <p className="challenge-rewards-date">
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
                    <p className="challenge-rewards-status" role="status">
                      Chargement du podium…
                    </p>
                  ) : !results.length ? (
                    <p className="challenge-rewards-status">
                      Aucune couronne attribuée pour ce défi.
                    </p>
                  ) : (
                    <div className="challenge-podium">
                      {results.map((winner) => {
                        const crown = CROWNS[winner.rank - 1];
                        return (
                          <article
                            className="challenge-winner"
                            key={winner._id}
                          >
                            <span
                              className="challenge-winner-rank"
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
                            <div className="challenge-winner-copy">
                              {winner.publicationId ? (
                                <Link
                                  className="challenge-winner-title"
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
                      className="challenge-podium-more"
                      onClick={() => loadMore(12)}
                    >
                      Voir les autres ex æquo
                    </button>
                  )}
                  {status === "LoadingMore" && (
                    <p className="challenge-rewards-status" role="status">
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
