import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ThumbsUp } from "lucide-react";
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
export function SignInTo({ children }: { children: React.ReactNode }) {
  return (
    <Link
      to="/sign-in"
      className="challenge-sign-in"
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
  if (!isAuthenticated)
    return (
      <SignInTo>
        <ThumbsUp size={15} aria-hidden="true" />
        {count} · Voter
      </SignInTo>
    );
  return (
    <button
      className="challenge-vote"
      aria-pressed={voted}
      aria-label={`${voted ? "Retirer mon vote" : "Voter pour cette création"} (${count})`}
      disabled={busy || own || (!voted && choices.length >= 3)}
      title={
        own
          ? "C’est votre création"
          : !voted && choices.length >= 3
            ? "Retirez un vote pour changer de choix"
            : undefined
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
      <ThumbsUp size={15} aria-hidden="true" />
      {count}
      <span>{own ? "Votre création" : voted ? "Soutenue" : "J’aime"}</span>
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
  return (
    <div className="creation-challenge">
      <Link to="/challenges" search={{ date: day }}>
        Défi du {day} · UTC
      </Link>
      <VoteButton
        publicationId={publicationId}
        owner={owner}
        count={count}
        choices={data?.choices ?? []}
      />
      <small>
        {data?.choices.length ?? 0} / 3 votes attribués pour ce défi
      </small>
    </div>
  );
}
