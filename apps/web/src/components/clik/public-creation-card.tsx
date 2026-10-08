import { cn } from "@/lib/utils";
import type { AvatarDescriptor } from "@clik/avatars";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Box, MessageCircle } from "lucide-react";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import AuthorLink from "./author-link";

export default function PublicCreationCard({
  className,
  creation,
}: {
  className?: string;
  creation: {
    _id: Id<"publications">;
    owner: string;
    title: string;
    author: string;
    avatar?: AvatarDescriptor;
    thumbnailUrl: string | null;
    commentCount?: number;
    challenge?: { day: string } | null;
    isAssembly?: boolean;
    relationship?: "remix" | "assembly";
  };
}) {
  const target = {
    to: "/creations/$publicationId" as const,
    params: { publicationId: creation._id },
  };
  return (
    <article
      className={cn(
        "creation-card public-creation-card group/creation-card overflow-hidden border border-solid border-[#e4eaf2] rounded-[14px] bg-white flex flex-col",
        className,
      )}
    >
      <Link
        {...target}
        className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 public-creation-open block flex-1 group/card-link"
        aria-label={`Voir ${creation.title}`}
      >
        <div className="thumbnail group/thumbnail aspect-4/3 bg-[#eef2f8] relative">
          {creation.thumbnailUrl ? (
            <img
              className="object-cover size-full"
              src={creation.thumbnailUrl}
              alt={creation.title}
              loading="lazy"
              decoding="async"
              width={640}
              height={480}
            />
          ) : (
            <div
              className="public-thumbnail-placeholder grid place-items-center h-full text-[#91a3be]"
              aria-hidden="true"
            >
              <Box size={32} />
            </div>
          )}
          {(creation.relationship || creation.isAssembly) && (
            <span className="assembly-badge creation-kind-badge group/assembly-badge px-2 py-0.75 border border-solid border-[#c7dfdf] inline-flex w-fit items-center rounded-[6px] bg-[#edf7f5] text-[#37786b] text-[10px] font-[650] leading-normal whitespace-nowrap group/creation-kind-badge absolute left-3 top-3 z-2 pointer-events-none">
              {creation.isAssembly || creation.relationship === "assembly"
                ? "Assemblage"
                : "Reprise"}
            </span>
          )}
          <span
            className="card-arrow group/card-arrow absolute bottom-3.75 right-3.75 bg-[#ffffffde] rounded-full grid place-items-center text-[#356ae6] [transition:background_150ms] size-8 group-hover/card-link:bg-[#356ae6] group-hover/card-link:text-white"
            aria-hidden="true"
          >
            <ArrowUpRight size={19} />
          </span>
        </div>
        <div className="card-meta group/card-meta px-5 py-4.5 pb-1.5">
          {creation.challenge && (
            <span className="challenge-badge px-1.75 py-1 block w-fit mb-2 bg-[#eaf0ff] rounded-[5px] text-[#356ae6] text-[10px]">
              Défi du {creation.challenge.day}
            </span>
          )}
          <h2 className="text-base leading-[inherit] font-bold">
            {creation.title}
          </h2>
        </div>
      </Link>
      <div className="public-card-footer gap-3 flex items-center justify-between pt-1 pr-4 pb-3.5 pl-5">
        <p className="public-card-author group/public-card-author min-w-0 text-[#73829a] text-xs leading-[inherit]">
          par{" "}
          <AuthorLink
            id={creation.owner}
            name={creation.author}
            avatar={creation.avatar}
          />
        </p>
        <Link
          {...target}
          hash="comments"
          className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 public-card-comments px-2 py-1.5 gap-1.5 inline-flex items-center justify-center shrink-0 min-w-10.5 min-h-9 rounded-[8px] text-[#71839c] text-xs tabular-nums hover:bg-[#edf3ff] hover:text-[#2458ce] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-2 group/card-link leading-normal"
          aria-label={`${creation.commentCount ?? 0} commentaire${(creation.commentCount ?? 0) === 1 ? "" : "s"} sur ${creation.title}`}
        >
          <MessageCircle size={15} aria-hidden="true" />
          <span>{creation.commentCount ?? 0}</span>
        </Link>
      </div>
    </article>
  );
}
