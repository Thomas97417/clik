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
    <article className="creation-card public-creation-card">
      <Link
        {...target}
        className="public-creation-open"
        aria-label={`Voir ${creation.title}`}
      >
        <div className="thumbnail">
          {creation.thumbnailUrl ? (
            <img
              src={creation.thumbnailUrl}
              alt={creation.title}
              loading="lazy"
            />
          ) : (
            <div className="public-thumbnail-placeholder" aria-hidden="true">
              <Box size={32} />
            </div>
          )}
          {(creation.relationship || creation.isAssembly) && (
            <span className="assembly-badge creation-kind-badge">
              {creation.isAssembly || creation.relationship === "assembly"
                ? "Assemblage"
                : "Reprise"}
            </span>
          )}
          <span className="card-arrow" aria-hidden="true">
            <ArrowUpRight size={19} />
          </span>
        </div>
        <div className="card-meta">
          {creation.challenge && (
            <span className="challenge-badge">
              Défi du {creation.challenge.day}
            </span>
          )}
          <h2>{creation.title}</h2>
        </div>
      </Link>
      <div className="public-card-footer">
        <p className="public-card-author">
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
          className="public-card-comments"
          aria-label={`${creation.commentCount ?? 0} commentaire${(creation.commentCount ?? 0) === 1 ? "" : "s"} sur ${creation.title}`}
        >
          <MessageCircle size={15} aria-hidden="true" />
          <span>{creation.commentCount ?? 0}</span>
        </Link>
      </div>
    </article>
  );
}
