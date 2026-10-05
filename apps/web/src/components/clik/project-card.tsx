import { useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Cloud,
  Globe2,
  HardDrive,
  LockKeyhole,
  ChevronDown,
  LogIn,
  Trash2,
} from "lucide-react";
import { useAction, useMutation, useConvexAuth } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import {
  validateScene,
  type SceneDocument,
  type ProjectProvenance,
} from "@clik/scene";
import { creationMetadata } from "@/lib/clik/project-metadata";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { removeLocalCreation } from "@/lib/clik/local";
import CreationPreview from "./creation-preview";
import PublishDialog from "./publish-dialog";

export type CreationItem = {
  id: string;
  title: string;
  scene: string | SceneDocument;
  cacheKey: string;
  updatedAt?: number;
  challenge?: { day: string; closesAt: number } | null;
  origin?: { title: string; author: string };
  provenance?: ProjectProvenance;
} & (
  | { location: "local"; draftId?: string; stamp: string }
  | {
      location: "online";
      projectId: Id<"projects">;
      publicationId: Id<"publications"> | null;
      revision: number;
      description?: string;
    }
);

export default function ProjectCard({
  creation,
  onLocalChange,
}: {
  creation: CreationItem;
  onLocalChange: () => void;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();
  const create = useMutation(api.projects.create);
  const remove = useMutation(api.projects.remove);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const cancelDelete = useRef<HTMLButtonElement>(null);
  const withdraw = useMutation(api.projects.withdraw);
  const publish = useMutation(api.projects.publish);
  const upload = useAction(api.projects.uploadThumbnail);
  const [busy, setBusy] = useState(false);
  const [publicationError, setPublicationError] = useState<string>();
  const [publication, setPublication] = useState<{
    creation: CreationItem;
    title: string;
    description: string;
  } | null>(null);
  const visibilityTrigger = useRef<HTMLButtonElement>(null);
  const closePublication = () => {
    setPublication(null);
    setPublicationError(undefined);
    requestAnimationFrame(() => visibilityTrigger.current?.focus());
  };
  const doPublish = async () => {
    if (!publication || busy) return;
    setBusy(true);
    setPublicationError(undefined);
    try {
      const { creation: snapshot, title, description } = publication;
      const { publicationThumbnail } = await import("@/lib/clik/thumbnail");
      const document = validateScene(
        typeof snapshot.scene === "string"
          ? JSON.parse(snapshot.scene)
          : snapshot.scene,
      );
      const bytes = await publicationThumbnail(document, snapshot.cacheKey);
      const projectId =
        snapshot.location === "online"
          ? snapshot.projectId
          : await create({
              title: snapshot.title,
              scene: JSON.stringify(document),
              localSourceId: snapshot.cacheKey,
              ...creationMetadata(snapshot.provenance),
            });
      const thumbnail = await upload({ projectId, bytes });
      await publish({
        id: projectId,
        title,
        description,
        thumbnail,
        revision: snapshot.location === "online" ? snapshot.revision : 0,
      });
      if (snapshot.location === "local") {
        try {
          await removeLocalCreation(snapshot.id, snapshot.stamp);
        } catch {
          toast.info(
            "La publication a réussi. La copie locale a été conservée car elle a changé ou n’a pas pu être retirée.",
          );
        }
        onLocalChange();
      }
      closePublication();
      toast.success("Votre création est publiée.");
    } catch (error) {
      setPublicationError(String(error));
    } finally {
      setBusy(false);
    }
  };
  const online = creation.location === "online";
  const published = online && creation.publicationId;
  const description = online ? creation.description?.trim() : undefined;
  const makePrivate = async () => {
    if (!published || busy) return;
    setBusy(true);
    try {
      await withdraw({ id: published });
      toast.success("Votre création est maintenant privée.");
    } catch (error) {
      toast.error(String(error));
    } finally {
      setBusy(false);
    }
  };
  const doDelete = async () => {
    if (busy) return;
    setBusy(true);
    setDeleteError(undefined);
    try {
      if (creation.location === "online")
        await remove({ id: creation.projectId });
      else {
        await removeLocalCreation(creation.id, creation.stamp);
        onLocalChange();
      }
      setDeleting(false);
      toast.success("Votre création a été supprimée.");
    } catch (error) {
      setDeleteError(String(error));
    } finally {
      setBusy(false);
    }
  };
  const visibility = published
    ? "Version publiée"
    : online
      ? "Privée"
      : "Sur cet appareil";
  const target = online
    ? {
        to: "/editor/$projectId" as const,
        params: { projectId: creation.projectId },
      }
    : { to: "/editor" as const, search: { draft: creation.draftId } };
  const VisibilityIcon = published ? Globe2 : online ? LockKeyhole : HardDrive;
  const publicationClosed =
    !published &&
    !!creation.challenge &&
    Date.now() >= creation.challenge.closesAt;
  const PublicationIcon =
    published || publicationClosed
      ? LockKeyhole
      : isAuthenticated
        ? Globe2
        : LogIn;
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
          {creation.challenge && (
            <span className="challenge-badge project-challenge-badge">
              Défi du {creation.challenge.day}
            </span>
          )}
          {!!creation.provenance?.imports.length && (
            <span className="assembly-badge creation-kind-badge">
              Assemblage
            </span>
          )}
          <span className="card-arrow" aria-hidden="true">
            <ArrowUpRight size={19} />
          </span>
        </div>
        <div className="card-meta">
          <h2 title={creation.title}>{creation.title}</h2>
          {description && (
            <p className="project-description" title={description}>
              {description}
            </p>
          )}
          <p className="project-updated">
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
      <DropdownMenu>
        <DropdownMenuTrigger
          ref={visibilityTrigger}
          className={`project-visibility-badge project-visibility-trigger ${published ? "is-published" : ""}`}
          aria-label={`Visibilité de ${creation.title} : ${visibility}`}
          disabled={busy}
          aria-busy={busy}
        >
          <VisibilityIcon size={12} aria-hidden="true" />
          {visibility}
          <ChevronDown size={12} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className="project-visibility-menu"
          finalFocus={publication || deleting ? false : undefined}
        >
          <DropdownMenuItem
            disabled={busy || isLoading || publicationClosed}
            onClick={() => {
              if (published) void makePrivate();
              else if (!isAuthenticated) {
                try {
                  sessionStorage.setItem("clik-return-to", "/projects");
                } catch {
                  /* Login still works without storage. */
                }
                void navigate({ to: "/sign-in" });
              } else
                setPublication({
                  creation,
                  title: creation.title,
                  description: online ? (creation.description ?? "") : "",
                });
            }}
          >
            <PublicationIcon size={12} aria-hidden="true" />
            {published
              ? "Passer en privé"
              : publicationClosed
                ? "Défi terminé"
                : !isAuthenticated
                  ? "Se connecter pour publier"
                  : "Publier"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={busy}
            onClick={() => {
              setDeleteError(undefined);
              setDeleting(true);
            }}
          >
            <Trash2 size={12} aria-hidden="true" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
          </div>
        ) : (
          <span className="project-private-note">
            {online
              ? "Visible uniquement par vous"
              : "Disponible dans ce navigateur"}
          </span>
        )}
      </div>
      <Dialog
        open={deleting}
        onOpenChange={(open) => {
          if (!busy) setDeleting(open);
        }}
      >
        <DialogContent
          className="project-delete-dialog"
          showCloseButton={false}
          initialFocus={cancelDelete}
          finalFocus={visibilityTrigger}
        >
          <DialogTitle>Supprimer cette création ?</DialogTitle>
          <DialogDescription>
            « {creation.title} » sera définitivement supprimée
            {published
              ? " et sa publication retirée de la galerie et des défis"
              : ""}
            .
            {published
              ? " Les créations que d’autres personnes en ont tirées seront conservées."
              : " Cette action est irréversible."}
          </DialogDescription>
          {deleteError && (
            <p className="project-delete-error" role="alert">
              {deleteError}
            </p>
          )}
          <DialogFooter>
            <Button
              ref={cancelDelete}
              variant="outline"
              onClick={() => setDeleting(false)}
              disabled={busy}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => void doDelete()}
              disabled={busy}
            >
              {busy ? "Suppression…" : "Supprimer la création"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {publication && (
        <PublishDialog
          title={publication.title}
          description={publication.description}
          onTitleChange={(title) => setPublication({ ...publication, title })}
          onDescriptionChange={(description) =>
            setPublication({ ...publication, description })
          }
          onClose={closePublication}
          onPublish={() => void doPublish()}
          busy={busy}
          error={publicationError}
          challenge={!!publication.creation.challenge}
          disabled={
            !!publication.creation.challenge &&
            Date.now() >= publication.creation.challenge.closesAt
          }
        />
      )}
    </article>
  );
}
