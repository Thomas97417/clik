import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Cloud,
  Globe2,
  HardDrive,
  LockKeyhole,
  MoreHorizontal,
  EyeOff,
} from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import type { SceneDocument } from "@clik/scene";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import CreationPreview from "./creation-preview";

export type CreationItem = {
  id: string;
  title: string;
  scene: string | SceneDocument;
  cacheKey: string;
  updatedAt?: number;
  challenge?: { day: string } | null;
  origin?: { title: string; author: string };
} & (
  | { location: "local"; draftId?: string }
  | {
      location: "online";
      projectId: Id<"projects">;
      publicationId: Id<"publications"> | null;
    }
);

export default function ProjectCard({ creation }: { creation: CreationItem }) {
  const withdraw = useMutation(api.projects.withdraw);
  const [busy, setBusy] = useState(false);
  const online = creation.location === "online";
  const published = online && creation.publicationId;
  const target = online
    ? {
        to: "/editor/$projectId" as const,
        params: { projectId: creation.projectId },
      }
    : { to: "/editor" as const, search: { draft: creation.draftId } };
  const VisibilityIcon = published ? Globe2 : online ? LockKeyhole : HardDrive;
  return (
    <article className="creation-card project-card">
      <Link
        {...target}
        className="project-card-open"
        aria-label={`Ouvrir ${creation.title}`}
      >
        <div className="thumbnail project-thumbnail">
          <CreationPreview
            scene={creation.scene}
            cacheKey={creation.cacheKey}
            title={creation.title}
          />
          <span
            className={`project-visibility-badge ${published ? "is-published" : ""}`}
          >
            <VisibilityIcon size={12} aria-hidden="true" />
            {published
              ? "Version publiée"
              : online
                ? "Privée"
                : "Sur cet appareil"}
          </span>
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
          <h2 title={creation.title}>{creation.title}</h2>
          <p>
            {creation.updatedAt ? (
              <>
                Modifiée le{" "}
                <time dateTime={new Date(creation.updatedAt).toISOString()}>
                  {new Date(creation.updatedAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </time>
              </>
            ) : (
              "Enregistrée sur cet appareil"
            )}
          </p>
          {creation.origin && (
            <p
              className="project-origin"
              title={`D’après « ${creation.origin.title} » de ${creation.origin.author}`}
            >
              D’après « {creation.origin.title} » de {creation.origin.author}
            </p>
          )}
        </div>
      </Link>
      <div className="project-card-footer">
        <span>
          {online ? (
            <Cloud size={14} aria-hidden="true" />
          ) : (
            <HardDrive size={14} aria-hidden="true" />
          )}
          {online ? "En ligne" : "Enregistrement local"}
        </span>
        {published ? (
          <div className="project-publication-actions">
            <Link
              to="/creations/$publicationId"
              params={{ publicationId: published }}
            >
              Voir la publication <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="project-menu-trigger"
                aria-label={`Actions pour ${creation.title}`}
                disabled={busy}
              >
                <MoreHorizontal size={18} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="project-card-menu">
                <DropdownMenuItem
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await withdraw({ id: published });
                      toast.success(
                        "Publication retirée. Votre création reste dans votre espace privé.",
                      );
                    } catch (error) {
                      toast.error(String(error));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <EyeOff size={15} /> Retirer de la galerie
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <span className="project-private-note">
            {online
              ? "Visible uniquement par vous"
              : "Disponible dans ce navigateur"}
          </span>
        )}
      </div>
    </article>
  );
}
