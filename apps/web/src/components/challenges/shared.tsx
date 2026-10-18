import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ArrowUpRight } from "lucide-react";
import { ConvexError } from "convex/values";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import { toast } from "sonner";
import { formatChallengeDay } from "@/lib/clik/challenge-date";
import { optimisticVote } from "@/lib/clik/optimistic-vote";
export function useServerNow(serverNow?: number) {
  const [offset, setOffset] = useState(0),
    [now, setNow] = useState(serverNow ?? Date.now());
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
  returnHash,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  label?: string;
  returnHash?: string;
}) {
  return (
    <Link
      to="/sign-in"
      className={cn(
        "[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6]",
        "outline-offset-3",
        "challenge-sign-in gap-2 inline-flex items-center justify-center text-[#356ae6] text-xs leading-normal font-semibold",
        className,
      )}
      title={title}
      aria-label={label}
      onClick={() =>
        sessionStorage.setItem(
          "clik-return-to",
          window.location.pathname +
            window.location.search +
            (returnHash ? `#${returnHash}` : ""),
        )
      }
    >
      {children}
    </Link>
  );
}
function VoteBrick({
  used,
  outlined = false,
  className,
}: {
  used?: boolean;
  outlined?: boolean;
  className?: string;
}) {
  return (
    <svg
      className={cn("vote-brick shrink-0", className)}
      viewBox="0 0 20 18"
      aria-hidden="true"
      focusable="false"
      data-used={used}
    >
      <path
        d="M6 5V3a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 1 14 3v2h2.5A1.5 1.5 0 0 1 18 6.5V15a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 15V6.5A1.5 1.5 0 0 1 3.5 5H6Z"
        fill={outlined ? "none" : "currentColor"}
        stroke={outlined ? "currentColor" : "none"}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 6.5h13"
        stroke={outlined ? "currentColor" : "white"}
        strokeOpacity=".25"
        strokeWidth="1"
      />
    </svg>
  );
}

export function VoteBricks({
  used,
  className,
}: {
  used: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "challenge-vote-bricks inline-flex shrink-0 gap-1.25",
        className,
      )}
      aria-hidden="true"
    >
      {[0, 1, 2].map((index) => (
        <VoteBrick
          key={index}
          used={index < used}
          className="h-3.5 w-3.75 text-[#d8e1ee] transition-colors duration-150 data-[used=true]:text-[#6087df] motion-reduce:transition-none"
        />
      ))}
    </span>
  );
}

const voteButtonClassName =
  "challenge-vote group/challenge-vote inline-flex items-center justify-center gap-1.5 min-h-9.5 min-w-9.5 max-w-full border-0 rounded-[10px] px-2.25 py-1.5 bg-transparent text-[var(--vote-muted,#8792a5)] text-xs font-medium leading-normal tabular-nums cursor-pointer transition-colors duration-150 [&:hover:not(:disabled)]:bg-[var(--vote-hover-bg,#eef1f8)] [&:hover:not(:disabled)]:text-[var(--vote-accent,#536c90)] aria-pressed:text-[var(--vote-accent,#356ae6)] [&[aria-pressed='true']:hover:not(:disabled)]:text-[var(--vote-accent,#2458ce)] data-[unavailable]:opacity-50 data-[unavailable]:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[var(--vote-accent,#356ae6)] focus-visible:outline-offset-3 motion-reduce:transition-none";

export function VoteButton({
  publicationId,
  challengeId,
  owner,
  count,
  choices,
  className,
}: {
  publicationId: Id<"publications">;
  challengeId?: Id<"challenges">;
  owner: string;
  count: number;
  choices: { publicationId: Id<"publications"> }[];
  className?: string;
}) {
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.auth.getCurrentUser, isAuthenticated ? {} : "skip");
  const vote = useMutation(api.challenges.vote).withOptimisticUpdate(
    (store, args) => optimisticVote(store, args, challengeId),
  );
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const voted = choices.some((c) => c.publicationId === publicationId),
    own = owner === me?._id;
  const limitReached = !voted && choices.length >= 3;
  const ready = !!challengeId && !!me;
  const content = (
    <>
      <VoteBrick outlined={!voted} className="h-4 w-4.5" />
      <span className="challenge-vote-count">{count}</span>
    </>
  );
  if (!isAuthenticated)
    return (
      <SignInTo
        className={cn(voteButtonClassName, className)}
        title="Connectez-vous pour soutenir cette création"
        label={`Se connecter pour voter (${count})`}
      >
        {content}
      </SignInTo>
    );
  return (
    <button
      type="button"
      className={cn(voteButtonClassName, className)}
      aria-pressed={voted}
      aria-busy={busy}
      data-own={own || undefined}
      data-unavailable={own || limitReached || !ready || undefined}
      aria-label={`${voted ? "Retirer mon vote" : "Voter pour cette création"} (${count})`}
      disabled={busy || own || limitReached || !ready}
      title={
        own
          ? "C’est votre création"
          : !ready
            ? "Chargement de vos votes…"
            : limitReached
              ? "Retirez un vote pour changer de choix"
              : voted
                ? "Retirer votre soutien à cette création"
                : "Soutenir cette création"
      }
      onClick={async () => {
        if (pending.current || own || limitReached || !ready) return;
        pending.current = true;
        setBusy(true);
        try {
          await vote({ publicationId, voted: !voted });
        } catch (e) {
          toast.error(
            e instanceof ConvexError && typeof e.data === "string"
              ? e.data
              : "Votre vote n’a pas pu être enregistré. Réessayez.",
          );
        } finally {
          pending.current = false;
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
  const formattedDay = formatChallengeDay(day);
  return (
    <div className="creation-challenge px-4 py-2.5 mx-0 overflow-hidden border border-solid border-[#e4dbee] flex items-center justify-between gap-y-3 gap-x-6 mt-5 mb-0 rounded-[12px] bg-[#f6f2fb] max-sm:px-3.5 max-sm:py-3 max-sm:flex-wrap peer/creation-challenge">
      <Link
        className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 creation-challenge-heading px-0 py-0.5 gap-2.5 flex items-center rounded-[6px] text-[#644780] max-sm:w-full hover:bg-[#eee6f7] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#9672c0] focus-visible:[outline-offset:-3px]"
        to="/challenges"
        search={{ date: day }}
      >
        <svg
          className="creation-challenge-art shrink-0 size-8 last:ml-1 last:shrink-0 last:text-[#9982b2] max-sm:last:ml-auto"
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
        <span className="min-w-0">
          <span className="creation-challenge-label block text-[11px] text-[#9987aa] mb-0.5">
            Création du défi
          </span>
          <time
            className="block text-[13px] font-bold leading-[1.4]"
            dateTime={day}
          >
            {formattedDay}
          </time>
        </span>
        <ArrowUpRight
          className="last:ml-1 last:shrink-0 last:text-[#9982b2] max-sm:last:ml-auto"
          size={17}
          aria-hidden="true"
        />
      </Link>
      <div className="creation-challenge-voting gap-4.5 flex justify-between items-center flex-wrap max-sm:w-full max-sm:pt-2.5 max-sm:border-t max-sm:border-t-[#ded1ec]">
        <div
          className="challenge-vote-budget gap-1.25 flex flex-col text-[#9989a8] text-[10px] leading-normal"
          title="Vous pouvez soutenir trois créations par défi et retirer un vote pour changer de choix."
        >
          <VoteBricks used={isAuthenticated ? used : 0} />
          <span>
            {isAuthenticated
              ? data
                ? `${used} / 3 votes attribués`
                : "Chargement des votes…"
              : "3 votes par défi"}
          </span>
        </div>
        <VoteButton
          publicationId={publicationId}
          challengeId={data?.challenge?._id}
          owner={owner}
          count={count}
          choices={data?.choices ?? []}
        />
      </div>
    </div>
  );
}
