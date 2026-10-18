import { memo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Crown, MessageCircle } from "lucide-react";
import { CROWNS } from "@clik/avatars";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import type { PublicData } from "@/lib/seo/public-data";
import { cn } from "@/lib/utils";
import AuthorLink from "@/components/clik/author-link";
import HoloCard from "@/components/react-bits/HoloCard";
import { VoteButton } from "./shared";

const metals = {
  1: {
    frame:
      "bg-[linear-gradient(#fff,#fff),linear-gradient(135deg,#e5c46c,#fff3cb_28%,#d9b35c_49%,#d8e8ee_72%,#ead09a)] shadow-[0_4px_20px_#b3872820]",
    thumbnail: "bg-[radial-gradient(ellipse_at_50%_35%,#fffaf0,#eee9db)]",
    badge: "border-[#e3cc93] bg-[#fffcf0]/95 text-[#8c671e]",
    author:
      "text-[#8c671e] hover:text-[#715113] focus-visible:outline-[#8c671e]",
    actions: "border-t-[#eee4cb] bg-[#fffdf7]",
    arrow:
      "bg-[#fffcf0]/95 text-[#8c671e] group-hover/card-link:bg-[#8c671e] group-focus-visible/card-link:bg-[#8c671e]",
    vote: "[--vote-accent:#8c671e] [--vote-border:#e3cc93] [--vote-bg:#fffcf0] [--vote-hover-bg:#fbf4df] [--vote-active-bg:#f7ebc4] [--vote-active-hover-bg:#f0dfac] [--vote-muted:#9b864f] [--vote-count-bg:#f3ead2] [--vote-count-active-bg:#ead496]",
    foil: "#f3d58d",
  },
  2: {
    frame:
      "bg-[linear-gradient(#fff,#fff),linear-gradient(135deg,#b7c8dc,#f5f9ff_28%,#a9bdcf_49%,#ded4f0_72%,#bfdde5)] shadow-[0_4px_20px_#657b9a1c]",
    thumbnail: "bg-[radial-gradient(ellipse_at_50%_35%,#f7faff,#e3e9f1)]",
    badge: "border-[#cbd6e6] bg-[#f8fbff]/95 text-[#576c89]",
    author:
      "text-[#576c89] hover:text-[#41546e] focus-visible:outline-[#576c89]",
    actions: "border-t-[#e1e8f1] bg-[#f9fbfe]",
    arrow:
      "bg-[#f8fbff]/95 text-[#576c89] group-hover/card-link:bg-[#576c89] group-focus-visible/card-link:bg-[#576c89]",
    vote: "[--vote-accent:#576c89] [--vote-border:#cbd6e6] [--vote-bg:#f8fbff] [--vote-hover-bg:#edf2f8] [--vote-active-bg:#e6edf5] [--vote-active-hover-bg:#dbe5f0] [--vote-muted:#8796ad] [--vote-count-bg:#eaf0f7] [--vote-count-active-bg:#cedaea]",
    foil: "#d6e3f6",
  },
  3: {
    frame:
      "bg-[linear-gradient(#fff,#fff),linear-gradient(135deg,#cb9675,#ffead6_28%,#c5916f_49%,#e3d4ea_72%,#dfb995)] shadow-[0_4px_20px_#a36f4520]",
    thumbnail: "bg-[radial-gradient(ellipse_at_50%_35%,#fff8f1,#eee2d8)]",
    badge: "border-[#e0bfa7] bg-[#fff8f1]/95 text-[#955d3a]",
    author:
      "text-[#955d3a] hover:text-[#79482a] focus-visible:outline-[#955d3a]",
    actions: "border-t-[#ecdfd4] bg-[#fffaf6]",
    arrow:
      "bg-[#fff8f1]/95 text-[#955d3a] group-hover/card-link:bg-[#955d3a] group-focus-visible/card-link:bg-[#955d3a]",
    vote: "[--vote-accent:#955d3a] [--vote-border:#e0bfa7] [--vote-bg:#fff8f1] [--vote-hover-bg:#faeddf] [--vote-active-bg:#f5e3d2] [--vote-active-hover-bg:#edd5be] [--vote-muted:#ac876c] [--vote-count-bg:#f2e5d9] [--vote-count-active-bg:#e8c9b0]",
    foil: "#e7b18c",
  },
} as const;

export default memo(function ChallengeEntryCard({
  entry,
  challengeId,
  choices,
}: {
  entry: PublicData["challenge"]["entries"]["page"][number];
  challengeId: Id<"challenges">;
  choices: { publicationId: Id<"publications"> }[];
}) {
  const rank = ([1, 2, 3] as const).find((rank) => rank === entry.podiumRank);
  const metal = rank ? metals[rank] : null;
  const card = (
    <article
      className={cn(
        "creation-card challenge-entry group/creation-card flex h-full flex-col overflow-hidden rounded-[14px] border border-solid border-[#e4eaf2] bg-white",
        metal &&
          "border-2 border-transparent [background-origin:border-box] [background-clip:padding-box,border-box]",
        metal?.frame,
      )}
      data-podium-rank={rank ?? undefined}
    >
      <Link
        className="outline-offset-3 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] group/card-link"
        to="/creations/$publicationId"
        params={{ publicationId: entry._id }}
      >
        <div
          className={cn(
            "thumbnail group/thumbnail relative aspect-4/3 bg-[#eef2f8]",
            metal?.thumbnail,
          )}
        >
          {entry.thumbnailUrl && (
            <img
              className="size-full object-contain"
              src={entry.thumbnailUrl}
              alt={entry.title}
              loading="lazy"
            />
          )}
          {rank && metal && (
            <span
              className={cn(
                "challenge-podium-badge absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-[6px] border px-2 py-1.25 text-[10px] leading-none font-bold shadow-[0_1px_4px_#2639560a] backdrop-blur-sm",
                metal.badge,
              )}
              title="Classement définitif du défi."
            >
              <Crown size={13} strokeWidth={1.75} aria-hidden="true" />
              {rank === 1 ? "1er" : `${rank}e`} · {CROWNS[rank - 1].name}
              <span className="sr-only">du podium</span>
            </span>
          )}
          <span
            className={cn(
              "card-arrow group/card-arrow absolute right-3.75 bottom-3.75 grid size-8 place-items-center rounded-full bg-[#ffffffde] text-[#356ae6] transition-colors duration-150 group-hover/card-link:bg-[#356ae6] group-hover/card-link:text-white group-focus-visible/card-link:bg-[#356ae6] group-focus-visible/card-link:text-white motion-reduce:transition-none",
              metal?.arrow,
            )}
            aria-hidden="true"
          >
            <ArrowUpRight size={19} />
          </span>
        </div>
        <div className="card-meta group/card-meta px-5 py-4.5">
          <h3 className="text-base leading-[inherit] font-bold">
            {entry.title}
          </h3>
        </div>
      </Link>
      <p className="public-card-author group/public-card-author min-w-0 px-5 pt-0 pb-4 text-xs leading-[inherit] text-[#73829a]">
        par{" "}
        <AuthorLink
          className={metal?.author}
          id={entry.owner}
          name={entry.author}
          avatar={entry.avatar}
        />
      </p>
      <div
        className={cn(
          "challenge-entry-actions mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-solid border-t-[#edf0f6] bg-[#fcfcfe] px-4 py-3",
          metal?.actions,
        )}
      >
        <VoteButton
          className={metal?.vote}
          publicationId={entry._id}
          challengeId={challengeId}
          owner={entry.owner}
          count={entry.voteCount}
          choices={choices}
        />
        <Link
          to="/creations/$publicationId"
          params={{ publicationId: entry._id }}
          hash="comments"
          className="challenge-entry-comments group/card-link ml-auto inline-flex min-h-9.5 min-w-9.5 items-center justify-center gap-1.5 rounded-[10px] px-2.25 py-1.5 text-xs leading-normal text-[#8792a5] tabular-nums outline-offset-3 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] hover:bg-[#eef1f8] hover:text-[#536c90] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-3"
          aria-label={`${entry.commentCount} commentaires sur ${entry.title}`}
        >
          <MessageCircle size={16} aria-hidden="true" />
          {entry.commentCount}
        </Link>
      </div>
    </article>
  );
  if (!rank || !metal) return card;
  return (
    <HoloCard
      className="challenge-podium-card min-w-0 hover:z-10 focus-within:z-10"
      preset={rank === 1 ? "gold" : rank === 2 ? "shards" : "glitter"}
      foilColor={metal.foil}
      intensity={0.75}
      edgeSparkle={0.6}
      frame={0.75}
      glare={0.25}
      tiltMax={6}
      hoverScale={1.008}
      idle={false}
      shadow={false}
      radius={14}
    >
      {card}
    </HoloCard>
  );
});
