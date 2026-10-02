import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ArrowUpRight, Heart, LoaderCircle } from "lucide-react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import { toast } from "sonner";
export function useServerNow(serverNow?: number) {
  const [offset, setOffset] = useState(0),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (serverNow !== undefined) {
      setOffset(serverNow - Date.now());
      setNow(Date.now());
    }
  }, [serverNow]);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now + offset;
}
export function SignInTo({
  children,
  className = "",
  title,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  label?: string;
}) {
  return (
    <Link
      to="/sign-in"
      className={`challenge-sign-in ${className}`}
      title={title}
      aria-label={label}
      onClick={() =>
        sessionStorage.setItem(
          "clik-return-to",
          window.location.pathname + window.location.search,
        )
      }
    >
      {children}
    </Link>
  );
}
export function VoteButton({
  publicationId,
  owner,
  count,
  choices,
}: {
  publicationId: Id<"publications">;
  owner: string;
  count: number;
  choices: { publicationId: Id<"publications"> }[];
}) {
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.auth.getCurrentUser, isAuthenticated ? {} : "skip");
  const vote = useMutation(api.challenges.vote),
    [busy, setBusy] = useState(false);
  const voted = choices.some((c) => c.publicationId === publicationId),
    own = owner === me?._id;
  const limitReached = !voted && choices.length >= 3;
  const content = (
    <>
      {busy ? (
        <LoaderCircle className="vote-pending" size={16} aria-hidden="true" />
      ) : (
        <Heart
          size={16}
          fill={voted ? "currentColor" : "none"}
          aria-hidden="true"
        />
      )}
      <span className="challenge-vote-label">
        {busy
          ? "En cours…"
          : own
            ? "Votre création"
            : voted
              ? "Soutenue"
              : "J’aime"}
      </span>
      <span className="challenge-vote-count">{count}</span>
    </>
  );
  if (!isAuthenticated)
    return (
      <SignInTo
        className="challenge-vote"
        title="Connectez-vous pour soutenir cette création"
        label={`Se connecter pour voter (${count})`}
      >
        {content}
      </SignInTo>
    );
  return (
    <button
      className="challenge-vote"
      aria-pressed={voted}
      aria-busy={busy}
      data-own={own || undefined}
      aria-label={`${voted ? "Retirer mon vote" : "Voter pour cette création"} (${count})`}
      disabled={busy || own || limitReached}
      title={
        own
          ? "C’est votre création"
          : limitReached
            ? "Retirez un vote pour changer de choix"
            : voted
              ? "Retirer votre soutien à cette création"
              : "Soutenir cette création"
      }
      onClick={async () => {
        setBusy(true);
        try {
          await vote({ publicationId, voted: !voted });
        } catch (e) {
          toast.error(String(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      {content}
    </button>
  );
}
export function CreationChallenge({
  day,
  publicationId,
  owner,
  count,
}: {
  day: string;
  publicationId: Id<"publications">;
  owner: string;
  count: number;
}) {
  const data = useQuery(api.challenges.day, { day });
  const { isAuthenticated } = useConvexAuth();
  const used = data?.choices.length ?? 0;
  const formattedDay = new Date(`${day}T00:00:00Z`).toLocaleDateString(
    "fr-FR",
    { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" },
  );
  return (
    <div className="creation-challenge">
      <Link
        className="creation-challenge-heading"
        to="/challenges"
        search={{ date: day }}
      >
        <svg
          className="creation-challenge-art"
          viewBox="0 0 56 56"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <path d="m5 22 25 12 21-10v20L30 54 5 42Z" fill="#b39ad7" />
          <path d="M30 34 51 24v20L30 54Z" fill="#9272bc" />
          <path d="M5 22 26 12 51 24 30 34Z" fill="#dfd0f2" />
          <path d="M18 13v6a10 5 0 0 0 20 0v-6" fill="#aa8bce" />
          <ellipse
            cx="28"
            cy="13"
            rx="10"
            ry="5"
            fill="#dfd0f2"
            stroke="#fff9"
          />
          <path
            d="m17 32 2 5 5 2-4 2 1 5-4-4-4 1 1-5-4-4 5 1Z"
            fill="#fff3cd"
          />
        </svg>
        <span>
          <span className="creation-challenge-label">Création du défi</span>
          <time dateTime={day}>{formattedDay}</time>
        </span>
        <ArrowUpRight size={17} aria-hidden="true" />
      </Link>
      <div className="creation-challenge-voting">
        <VoteButton
          publicationId={publicationId}
          owner={owner}
          count={count}
          choices={data?.choices ?? []}
        />
        <div className="challenge-vote-budget">
          <span className="challenge-vote-studs" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <i
                key={index}
                data-used={(isAuthenticated && index < used) || undefined}
              />
            ))}
          </span>
          <span>
            {isAuthenticated
              ? data
                ? `${used} / 3 votes attribués`
                : "Chargement des votes…"
              : "3 votes par défi"}
          </span>
        </div>
      </div>
      <p className="creation-challenge-note">
        {isAuthenticated && used >= 3
          ? "Un autre coup de cœur ? Retirez un vote pour changer de choix."
          : data?.choices.some(
                (choice) => choice.publicationId === publicationId,
              )
            ? "Votre soutien est enregistré. Vous pouvez le retirer à tout moment."
            : "Un coup de cœur ? Offrez-lui une place parmi vos trois choix."}
      </p>
    </div>
  );
}
