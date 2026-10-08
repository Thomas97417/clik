import { cn } from "@/lib/utils";
import type { AvatarDescriptor } from "@clik/avatars";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Box, MessageCircle } from "lucide-react";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import AuthorLink from "./author-link";

export default function PublicCreationCard({
  creation,
}: {
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
        "creation-card public-creation-card group/creation-card overflow-hidden border-[length:1px] border-solid border-[color:#e4eaf2] rounded-[14px] bg-[white] [a&:hover_[class~='group/card-arrow']]:bg-[#356ae6] [a&:hover_[class~='group/card-arrow']]:text-[color:white] [&_>_a:hover_[class~='group/card-arrow']]:bg-[#356ae6] [&_>_a:hover_[class~='group/card-arrow']]:text-[color:white] flex flex-col [&_[class~='group/card-meta']]:pb-[6px] [&_[class~='group/thumbnail']]:relative",
      )}
    >
      <Link
        {...target}
        className={cn("public-creation-open block flex-[1]")}
        aria-label={`Voir ${creation.title}`}
      >
        <div
          className={cn(
            "thumbnail group/thumbnail [aspect-ratio:4/3] bg-[#eef2f8] relative [&_img]:w-[100%] [&_img]:h-[100%] [&_img]:object-cover",
          )}
        >
          {creation.thumbnailUrl ? (
            <img
              src={creation.thumbnailUrl}
              alt={creation.title}
              loading="lazy"
              decoding="async"
              width={640}
              height={480}
            />
          ) : (
            <div
              className={cn(
                "public-thumbnail-placeholder grid [place-items:center] h-[100%] text-[color:#91a3be]",
              )}
              aria-hidden="true"
            >
              <Box size={32} />
            </div>
          )}
          {(creation.relationship || creation.isAssembly) && (
            <span
              className={cn(
                "assembly-badge creation-kind-badge group/assembly-badge px-[8px] py-[3px] border-[length:1px] border-solid border-[color:#c7dfdf] inline-flex w-[fit-content] items-center rounded-[6px] bg-[#edf7f5] text-[color:#37786b] [font-size:10px] font-[650] leading-[1.5] whitespace-nowrap group/creation-kind-badge absolute left-[12px] top-[12px] z-[2] pointer-events-none",
              )}
            >
              {creation.isAssembly || creation.relationship === "assembly"
                ? "Assemblage"
                : "Reprise"}
            </span>
          )}
          <span
            className={cn(
              "card-arrow group/card-arrow absolute bottom-[15px] right-[15px] bg-[#ffffffde] rounded-[50%] h-[32px] w-[32px] grid [place-items:center] text-[color:#356ae6] [transition:background_150ms]",
            )}
            aria-hidden="true"
          >
            <ArrowUpRight size={19} />
          </span>
        </div>
        <div
          className={cn(
            "card-meta group/card-meta px-[20px] py-[18px] [&_h2]:[font-size:16px] [&_h2]:font-[700] [&_p]:[font-size:12px] [&_p]:text-[color:#8a97aa] [&_p]:mt-[6px]",
          )}
        >
          {creation.challenge && (
            <span
              className={cn(
                "challenge-badge px-[7px] py-[4px] block w-[fit-content] mb-[8px] bg-[#eaf0ff] rounded-[5px] text-[color:#356ae6] [font-size:10px]",
              )}
            >
              Défi du {creation.challenge.day}
            </span>
          )}
          <h2>{creation.title}</h2>
        </div>
      </Link>
      <div
        className={cn(
          "public-card-footer gap-[12px] flex items-center justify-between pt-[4px] pr-[16px] pb-[14px] pl-[20px]",
        )}
      >
        <p
          className={cn(
            "public-card-author group/public-card-author min-w-[0] text-[color:#73829a] [font-size:12px]",
          )}
        >
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
          className={cn(
            "public-card-comments px-[8px] py-[6px] gap-[6px] inline-flex items-center justify-center shrink-[0] min-w-[42px] min-h-[36px] rounded-[8px] text-[color:#71839c] [font-size:12px] tabular-nums [&:hover]:bg-[#edf3ff] [&:hover]:text-[color:#2458ce] [&:focus-visible]:[outline:2px_solid_#356ae6] [&:focus-visible]:[outline-offset:2px]",
          )}
          aria-label={`${creation.commentCount ?? 0} commentaire${(creation.commentCount ?? 0) === 1 ? "" : "s"} sur ${creation.title}`}
        >
          <MessageCircle size={15} aria-hidden="true" />
          <span>{creation.commentCount ?? 0}</span>
        </Link>
      </div>
    </article>
  );
}
