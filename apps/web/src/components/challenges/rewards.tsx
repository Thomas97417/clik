import { useId, useState } from "react";
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
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const complete = challenge.rewardStatus === "complete";
  const { results, status, loadMore } = usePaginatedQuery(
    api.rewards.podium,
    complete && expanded ? { challengeId: challenge._id } : "skip",
    { initialNumItems: 12 },
  );
  if (!challenge.rewardAt) return null;
  const due = now >= challenge.rewardAt;
  return (
    <section className="challenge-rewards" aria-label="Récompenses du défi">
      <button
        type="button"
        className="challenge-rewards-toggle"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="challenge-rewards-mark" aria-hidden="true">
          <Crown size={18} strokeWidth={1.6} />
        </span>
        <span className="challenge-rewards-copy">
          <strong>
            {complete
              ? "Podium définitif"
              : due
                ? "Attribution en cours"
                : "Les couronnes du défi"}
          </strong>
          <span>
            {complete ? (
              "Les likes continuent, les récompenses sont acquises."
            ) : due ? (
              "Le classement des récompenses est figé."
            ) : (
              <>
                Attribution le{" "}
                <time dateTime={new Date(challenge.rewardAt).toISOString()}>
                  {new Date(challenge.rewardAt).toLocaleString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "UTC",
                  })}{" "}
                  UTC
                </time>
              </>
            )}
          </span>
        </span>
        <span className="challenge-rewards-action">
          {expanded ? "Réduire" : complete ? "Voir le podium" : "Les règles"}
          <ChevronDown size={15} aria-hidden="true" />
        </span>
      </button>
      <div id={panelId} className="challenge-rewards-panel" hidden={!expanded}>
        {!complete && (
          <p className="challenge-rewards-rules">
            Or, argent, bronze : les couronnes sont attribuées 24 h après la fin
            des constructions. Les ex æquo partagent leur couronne, avec au
            moins un vote. Chaque défi publié fait aussi progresser vos contours
            d’avatar.
          </p>
        )}
        {complete && expanded && (
          <>
            {status === "LoadingFirstPage" ? (
              <p role="status">Chargement du podium…</p>
            ) : !results.length ? (
              <p>
                Aucune création éligible : aucune couronne attribuée pour ce
                défi.
              </p>
            ) : (
              <div className="challenge-podium">
                {results.map((winner) => {
                  const crown = CROWNS[winner.rank - 1];
                  return (
                    <article className="challenge-winner" key={winner._id}>
                      <span
                        className="challenge-winner-rank"
                        style={{
                          color: crown.shade,
                          background: `${crown.color}33`,
                        }}
                      >
                        <Crown size={15} aria-hidden="true" />
                        {winner.rank === 1 ? "1er" : `${winner.rank}e`} ·{" "}
                        {crown.name}
                      </span>
                      <div className="challenge-winner-copy">
                        {winner.publicationId ? (
                          <Link
                            className="challenge-winner-title"
                            to="/creations/$publicationId"
                            params={{ publicationId: winner.publicationId }}
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
                        {winner.score} vote{winner.score > 1 ? "s" : ""} à
                        l’attribution
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
            {status === "LoadingMore" && <p role="status">Chargement…</p>}
          </>
        )}
        <Link to="/settings" className="challenge-rewards-settings">
          Personnaliser mon avatar <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </section>
  );
}
