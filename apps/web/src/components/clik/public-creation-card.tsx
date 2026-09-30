import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Box } from "lucide-react";
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
    thumbnailUrl: string | null;
    challenge?: { day: string } | null;
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
      <p className="public-card-author">
        par <AuthorLink id={creation.owner} name={creation.author} />
      </p>
    </article>
  );
}
