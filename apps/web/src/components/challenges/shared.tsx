import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ArrowUpRight, Heart, LoaderCircle } from "lucide-react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import { toast } from "sonner";
import { formatChallengeDay } from "@/lib/clik/challenge-date";
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
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  label?: string;
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
        <LoaderCircle
          className="vote-pending animate-spin motion-reduce:animate-none"
          size={16}
          aria-hidden="true"
        />
      ) : (
        <Heart
          size={16}
          fill={voted ? "currentColor" : "none"}
          aria-hidden="true"
        />
      )}
      <span className="challenge-vote-label min-w-0">
        {busy
          ? "En cours…"
          : own
            ? "Votre création"
            : voted
              ? "Soutenue"
              : "J’aime"}
      </span>
      <span className="challenge-vote-count group/challenge-vote-count px-1.5 py-0.5 inline-flex items-center justify-center min-w-6.5 min-h-6.25 ml-0.75 rounded-[6px] bg-[#f2edf9] text-[11px] tabular-nums group-aria-pressed/challenge-vote:bg-[#ffffff26] group-data-[own]/challenge-vote:bg-[#e9edf4]">
        {count}
      </span>
    </>
  );
  if (!isAuthenticated)
    return (
      <SignInTo
        className="challenge-vote py-1.5 gap-2 border border-solid border-[#e0d7ed] inline-flex items-center justify-center min-h-9.5 max-w-full pr-1.75 pl-2.75 rounded-[11px] text-[#795ba0] bg-white text-xs font-semibold leading-[1.4] cursor-pointer hover:enabled:border-[#baa2d5] hover:enabled:bg-[#f6f0fd] aria-pressed:border-[#7959a5] aria-pressed:bg-[#7959a5] aria-pressed:text-white [&[aria-pressed='true']:hover:not(:disabled)]:border-[#684a93] [&[aria-pressed='true']:hover:not(:disabled)]:bg-[#684a93] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#9672c0] focus-visible:outline-offset-3 disabled:cursor-not-allowed disabled:opacity-65 data-own:border-[#e1e6ed] data-own:text-[#778499] data-own:bg-[#f6f8fb] data-own:opacity-100 aria-[busy=true]:cursor-wait [transition:background_150ms,border-color_150ms,color_150ms] leading-[1.4]"
        title="Connectez-vous pour soutenir cette création"
        label={`Se connecter pour voter (${count})`}
      >
        {content}
      </SignInTo>
    );
  return (
    <button
      className="outline-offset-3 challenge-vote py-1.5 gap-2 border border-solid border-[#e0d7ed] inline-flex items-center justify-center min-h-9.5 max-w-full pr-1.75 pl-2.75 rounded-[11px] text-[#795ba0] bg-white text-xs font-semibold leading-[1.4] cursor-pointer hover:enabled:border-[#baa2d5] hover:enabled:bg-[#f6f0fd] aria-pressed:border-[#7959a5] aria-pressed:bg-[#7959a5] aria-pressed:text-white [&[aria-pressed='true']:hover:not(:disabled)]:border-[#684a93] [&[aria-pressed='true']:hover:not(:disabled)]:bg-[#684a93] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#9672c0] focus-visible:outline-offset-3 disabled:cursor-not-allowed disabled:opacity-65 data-own:border-[#e1e6ed] data-own:text-[#778499] data-own:bg-[#f6f8fb] data-own:opacity-100 aria-[busy=true]:cursor-wait [transition:background_150ms,border-color_150ms,color_150ms] leading-[1.4]"
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
          <span
            className="challenge-vote-studs gap-1.25 inline-flex"
            aria-hidden="true"
          >
            {[0, 1, 2].map((index) => (
              <i
                className="relative block w-3.75 h-2.75 mt-0.75 rounded-xs bg-[#e3d9ed] before:[content:''] before:absolute before:w-1.75 before:h-0.75 before:left-1 before:-top-0.75 before:rounded-[2px_2px_0_0] before:[background:inherit] data-used:bg-[#a385c4]"
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
        <VoteButton
          publicationId={publicationId}
          owner={owner}
          count={count}
          choices={data?.choices ?? []}
        />
      </div>
    </div>
  );
}
