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
        cn(
          "challenge-sign-in gap-[8px] inline-flex items-center justify-center text-[color:#356ae6] [font-size:12px] font-[600]",
          className,
        ),
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
          className={cn(
            "vote-pending [animation:spin_1s_linear_infinite] motion-reduce:[animation:none]",
          )}
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
      <span className={cn("challenge-vote-label min-w-[0]")}>
        {busy
          ? "En cours…"
          : own
            ? "Votre création"
            : voted
              ? "Soutenue"
              : "J’aime"}
      </span>
      <span
        className={cn(
          "challenge-vote-count group/challenge-vote-count px-[6px] py-[2px] inline-flex items-center justify-center min-w-[26px] min-h-[25px] ml-[3px] rounded-[6px] bg-[#f2edf9] [font-size:11px] tabular-nums",
        )}
      >
        {count}
      </span>
    </>
  );
  if (!isAuthenticated)
    return (
      <SignInTo
        className={cn(
          "challenge-vote py-[6px] gap-[8px] border-[length:1px] border-solid border-[color:#e0d7ed] inline-flex items-center justify-center min-h-[38px] max-w-[100%] pr-[7px] pl-[11px] rounded-[11px] text-[color:#795ba0] bg-[#fff] [font-size:12px] font-[600] leading-[1.4] cursor-[pointer] [transition:background_150ms,_border-color_150ms,_color_150ms] [&_>_svg]:shrink-[0] [&:hover:not(:disabled)]:border-[color:#baa2d5] [&:hover:not(:disabled)]:bg-[#f6f0fd] [&[aria-pressed='true']]:border-[color:#7959a5] [&[aria-pressed='true']]:bg-[#7959a5] [&[aria-pressed='true']]:text-[color:#fff] [&[aria-pressed='true']_[class~='group/challenge-vote-count']]:bg-[#ffffff26] [&[aria-pressed='true']:hover:not(:disabled)]:border-[color:#684a93] [&[aria-pressed='true']:hover:not(:disabled)]:bg-[#684a93] [&:focus-visible]:[outline:2px_solid_#9672c0] [&:focus-visible]:[outline-offset:3px] [&:disabled]:cursor-[not-allowed] [&:disabled]:opacity-[0.65] [&[data-own]]:border-[color:#e1e6ed] [&[data-own]]:text-[color:#778499] [&[data-own]]:bg-[#f6f8fb] [&[data-own]]:opacity-[1] [&[data-own]_[class~='group/challenge-vote-count']]:bg-[#e9edf4] [&[aria-busy='true']]:cursor-[wait]",
        )}
        title="Connectez-vous pour soutenir cette création"
        label={`Se connecter pour voter (${count})`}
      >
        {content}
      </SignInTo>
    );
  return (
    <button
      className={cn(
        "challenge-vote py-[6px] gap-[8px] border-[length:1px] border-solid border-[color:#e0d7ed] inline-flex items-center justify-center min-h-[38px] max-w-[100%] pr-[7px] pl-[11px] rounded-[11px] text-[color:#795ba0] bg-[#fff] [font-size:12px] font-[600] leading-[1.4] cursor-[pointer] [transition:background_150ms,_border-color_150ms,_color_150ms] [&_>_svg]:shrink-[0] [&:hover:not(:disabled)]:border-[color:#baa2d5] [&:hover:not(:disabled)]:bg-[#f6f0fd] [&[aria-pressed='true']]:border-[color:#7959a5] [&[aria-pressed='true']]:bg-[#7959a5] [&[aria-pressed='true']]:text-[color:#fff] [&[aria-pressed='true']_[class~='group/challenge-vote-count']]:bg-[#ffffff26] [&[aria-pressed='true']:hover:not(:disabled)]:border-[color:#684a93] [&[aria-pressed='true']:hover:not(:disabled)]:bg-[#684a93] [&:focus-visible]:[outline:2px_solid_#9672c0] [&:focus-visible]:[outline-offset:3px] [&:disabled]:cursor-[not-allowed] [&:disabled]:opacity-[0.65] [&[data-own]]:border-[color:#e1e6ed] [&[data-own]]:text-[color:#778499] [&[data-own]]:bg-[#f6f8fb] [&[data-own]]:opacity-[1] [&[data-own]_[class~='group/challenge-vote-count']]:bg-[#e9edf4] [&[aria-busy='true']]:cursor-[wait]",
      )}
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
    <div
      className={cn(
        "creation-challenge px-[16px] py-[10px] mx-[0] overflow-hidden border-[length:1px] border-solid border-[color:#e4dbee] flex items-center justify-between gap-y-[12px] gap-x-[24px] mt-[20px] mb-[0] rounded-[12px] bg-[#f6f2fb] [@media(width<=640px)]:px-[14px] [@media(width<=640px)]:py-[12px] [@media(width<=640px)]:flex-wrap [&_+_[class~='group/creation-remixes']]:mt-[24px]",
      )}
    >
      <Link
        className={cn(
          "creation-challenge-heading px-[0] py-[2px] gap-[10px] flex items-center rounded-[6px] text-[color:#644780] [@media(width<=640px)]:w-[100%] [&:hover]:bg-[#eee6f7] [&:focus-visible]:[outline:2px_solid_#9672c0] [&:focus-visible]:[outline-offset:-3px] [&_>_span]:min-w-[0] [&_time]:block [&_time]:[font-size:13px] [&_time]:font-[700] [&_time]:leading-[1.4] [&_>_svg:last-child]:ml-[4px] [&_>_svg:last-child]:shrink-[0] [&_>_svg:last-child]:text-[color:#9982b2] [@media(width<=640px)]:[&_>_svg:last-child]:ml-[auto]",
        )}
        to="/challenges"
        search={{ date: day }}
      >
        <svg
          className={cn("creation-challenge-art w-[32px] h-[32px] shrink-[0]")}
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
          <span
            className={cn(
              "creation-challenge-label block [font-size:11px] text-[color:#9987aa] mb-[2px]",
            )}
          >
            Création du défi
          </span>
          <time dateTime={day}>{formattedDay}</time>
        </span>
        <ArrowUpRight size={17} aria-hidden="true" />
      </Link>
      <div
        className={cn(
          "creation-challenge-voting gap-[18px] flex justify-between items-center flex-wrap [@media(width<=640px)]:w-[100%] [@media(width<=640px)]:pt-[10px] [@media(width<=640px)]:[border-top-width:1px] [@media(width<=640px)]:[border-top-style:dashed] [@media(width<=640px)]:[border-top-color:#ded1ec]",
        )}
      >
        <div
          className={cn(
            "challenge-vote-budget gap-[5px] flex flex-col text-[color:#9989a8] [font-size:10px] leading-[1.5]",
          )}
          title="Vous pouvez soutenir trois créations par défi et retirer un vote pour changer de choix."
        >
          <span
            className={cn(
              "challenge-vote-studs gap-[5px] inline-flex [&_i]:relative [&_i]:block [&_i]:w-[15px] [&_i]:h-[11px] [&_i]:mt-[3px] [&_i]:rounded-[2px] [&_i]:bg-[#e3d9ed] [&_i::before]:[content:''] [&_i::before]:absolute [&_i::before]:w-[7px] [&_i::before]:h-[3px] [&_i::before]:left-[4px] [&_i::before]:top-[-3px] [&_i::before]:rounded-[2px_2px_0_0] [&_i::before]:[background:inherit] [&_i[data-used]]:bg-[#a385c4]",
            )}
            aria-hidden="true"
          >
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
