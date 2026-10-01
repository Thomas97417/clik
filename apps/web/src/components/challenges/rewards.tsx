import { usePaginatedQuery } from "convex/react";
import { Link } from "@tanstack/react-router";
import { Crown } from "lucide-react";
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
  const complete = challenge.rewardStatus === "complete";
  const { results, status, loadMore } = usePaginatedQuery(
    api.rewards.podium,
    complete ? { challengeId: challenge._id } : "skip",
    { initialNumItems: 12 },
  );
  if (!challenge.rewardAt) return null;
  const due = now >= challenge.rewardAt;
  return (
    <section className="challenge-rewards" aria-label="Récompenses du défi">
      <div className="challenge-rewards-heading">
        <span className="challenge-rewards-mark" aria-hidden="true">
          <Crown size={34} strokeWidth={1.5} />
        </span>
        <div>
          <h2>
            {complete
              ? "Le podium du défi"
              : due
                ? "Le podium se prépare"
                : "À chaque défi, ses couronnes."}
          </h2>
          <p>
            {complete ? (
              "Résultats définitifs. Les likes continuent, les couronnes restent acquises."
            ) : due ? (
              "Les récompenses sont en cours d’attribution. Les votes suivants ne changent plus le podium."
            ) : (
              <>
                Couronnes attribuées le{" "}
                <time dateTime={new Date(challenge.rewardAt).toISOString()}>
                  {new Date(challenge.rewardAt).toLocaleString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "UTC",
                  })}{" "}
                  UTC
                </time>
                , soit 24 h après la fin des constructions.
              </>
            )}
          </p>
        </div>
        <Link to="/settings" className="challenge-rewards-settings">
          Personnaliser mon avatar →
        </Link>
      </div>
      {!complete && (
        <p className="challenge-rewards-rules">
          Or, argent, bronze : les ex æquo partagent leur couronne. Au moins un
          vote est nécessaire. Publier un défi fait aussi progresser vos
          contours d’avatar.
        </p>
      )}
      {complete && (
        <>
          {status === "LoadingFirstPage" ? (
            <p role="status">Chargement du podium…</p>
          ) : !results.length ? (
            <p>
              Aucune création éligible : aucune couronne attribuée pour ce défi.
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
    </section>
  );
}
