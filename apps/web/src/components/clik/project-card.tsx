import { cn } from "@/lib/utils";
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
    : { to: "/editor" as const, search: { draft: creation.draftId ?? "" } };
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
    <article className="creation-card project-card group/creation-card overflow-hidden border border-solid border-[#e4eaf2] rounded-[14px] bg-white relative flex flex-col min-w-0 group/creation-card">
      <Link
        {...target}
        className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 project-card-open block focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:-outline-offset-2 focus-visible:rounded-[13px] group/card-link"
        aria-label={`Ouvrir ${creation.title}`}
      >
        <div className="thumbnail project-thumbnail group/thumbnail aspect-4/3 bg-[#eef2f8] relative group/project-thumbnail [background:radial-gradient(ellipse_at_50%_65%,#dfe9f7,#f1f5fb_70%)] group-nth-[3n+2]/creation-card:[background:radial-gradient(ellipse_at_50%_65%,#e4e6f1,#f6f4fa_70%)] group-nth-[3n+3]/creation-card:[background:radial-gradient(ellipse_at_50%_65%,#dcebe7,#f1f8f5_70%)]">
          <CreationPreview
            imageClassName="object-cover size-full"
            scene={creation.scene}
            cacheKey={creation.cacheKey}
            title={creation.title}
          />
          {creation.challenge && (
            <span className="challenge-badge project-challenge-badge group/project-challenge-badge block w-fit text-[10px] px-2.25 py-1.5 m-0 absolute bottom-4 left-3.5 max-w-[calc(100%-76px)] rounded-[6px] bg-[#f5f0ffed] text-[#765aa8] font-semibold">
              Défi du {creation.challenge.day}
            </span>
          )}
          {!!creation.provenance?.imports.length && (
            <span className="assembly-badge creation-kind-badge group/assembly-badge px-2 py-0.75 border border-solid border-[#c7dfdf] inline-flex w-fit items-center rounded-[6px] bg-[#edf7f5] text-[#37786b] text-[10px] font-[650] leading-normal whitespace-nowrap group/creation-kind-badge absolute z-2 pointer-events-none top-3.5 right-3.5 left-auto">
              Assemblage
            </span>
          )}
          <span
            className="card-arrow group/card-arrow absolute bottom-3.75 right-3.75 bg-[#ffffffde] rounded-full grid place-items-center text-[#356ae6] [transition:background_150ms] size-8 group-hover/card-link:bg-[#356ae6] group-hover/card-link:text-white"
            aria-hidden="true"
          >
            <ArrowUpRight size={19} />
          </span>
        </div>
        <div className="card-meta group/card-meta py-4.5 px-4.5 pt-4.5 pb-5">
          <h2
            className="overflow-hidden whitespace-nowrap text-ellipsis text-base leading-[inherit] font-bold"
            title={creation.title}
          >
            {creation.title}
          </h2>
          {description && (
            <p
              className="project-description group/project-description overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] wrap-anywhere whitespace-pre-line mb-2.5 text-xs text-[#8a97aa] mt-1.5"
              title={description}
            >
              {description}
            </p>
          )}
          <p className="project-updated group/project-updated text-xs leading-[inherit] text-[#8a97aa] mt-1.5">
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
              className="project-origin group/project-origin overflow-hidden whitespace-nowrap text-ellipsis text-xs leading-[inherit] text-[#8a97aa] mt-1.5"
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
          className={cn(
            "project-visibility-badge project-visibility-trigger px-2.25 py-1.5 gap-1.5 text-[10px] font-[650] leading-3.75 absolute top-3.5 left-3.5 inline-flex items-center rounded-[6px] text-[#596d8b] bg-[#ffffffed] [box-shadow:0_1px_4px_#33476b08] [&[class~='group/is-published']]:text-[#267453] [&[class~='group/is-published']]:bg-[#f0fcf6ed] cursor-pointer hover:bg-white hover:text-[#356ae6] data-popup-open:bg-white data-popup-open:text-[#356ae6] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-3 [&[class~='group/is-published']:hover]:text-[#267453] [&[class~='group/is-published']:hover]:bg-[#f0fcf6] [&[class~='group/is-published'][data-popup-open]]:text-[#267453] [&[class~='group/is-published'][data-popup-open]]:bg-[#f0fcf6] disabled:cursor-wait",
            published ? "is-published group/is-published" : "",
            "group/project-visibility-badge",
          )}
          aria-label={`Visibilité de ${creation.title} : ${visibility}`}
          disabled={busy}
          aria-busy={busy}
        >
          <VisibilityIcon size={12} aria-hidden="true" />
          {visibility}
          <ChevronDown
            className="shrink-0 group-data-[popup-open]/project-visibility-badge:last:transform-[rotate(180deg)]"
            size={12}
            aria-hidden="true"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className="project-visibility-menu p-0 border border-solid border-[#dfe7f3] min-w-(--anchor-width) w-max max-w-[calc(100vw-24px)] rounded-[6px] text-[#596d8b] bg-white [box-shadow:0_10px_28px_#20396220]"
          finalFocus={publication || deleting ? false : undefined}
        >
          <DropdownMenuItem
            className="data-[variant=destructive]:text-[#b43b47] [&[data-variant='destructive'][data-highlighted]]:text-[#9d2632] [&[data-variant='destructive'][data-highlighted]]:bg-[#fff0f1] px-2.25 py-1.5 gap-1.5 text-[10px] font-[650] leading-3.75 min-h-6.75 w-full rounded-none whitespace-nowrap cursor-pointer data-highlighted:text-[#356ae6] data-highlighted:bg-[#f0f4ff] data-disabled:cursor-default"
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
            <PublicationIcon
              className="data-[variant=destructive]:text-[#b43b47] [&[data-variant='destructive'][data-highlighted]]:text-[#9d2632] [&[data-variant='destructive'][data-highlighted]]:bg-[#fff0f1]"
              size={12}
              aria-hidden="true"
            />
            {published
              ? "Passer en privé"
              : publicationClosed
                ? "Défi terminé"
                : !isAuthenticated
                  ? "Se connecter pour publier"
                  : "Publier"}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="m-0 bg-[#edf0f5] data-[variant=destructive]:text-[#b43b47] [&[data-variant='destructive'][data-highlighted]]:text-[#9d2632] [&[data-variant='destructive'][data-highlighted]]:bg-[#fff0f1]" />
          <DropdownMenuItem
            className="data-[variant=destructive]:text-[#b43b47] [&[data-variant='destructive'][data-highlighted]]:text-[#9d2632] [&[data-variant='destructive'][data-highlighted]]:bg-[#fff0f1] px-2.25 py-1.5 gap-1.5 text-[10px] font-[650] leading-3.75 min-h-6.75 w-full rounded-none whitespace-nowrap cursor-pointer data-highlighted:text-[#356ae6] data-highlighted:bg-[#f0f4ff] data-disabled:cursor-default"
            variant="destructive"
            disabled={busy}
            onClick={() => {
              setDeleteError(undefined);
              setDeleting(true);
            }}
          >
            <Trash2
              className="pointer-events-none shrink-0 data-[variant=destructive]:text-[#b43b47] [&[data-variant='destructive'][data-highlighted]]:text-[#9d2632] [&[data-variant='destructive'][data-highlighted]]:bg-[#fff0f1] text-current size-3"
              size={12}
              aria-hidden="true"
            />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="project-card-footer px-4.5 py-3 gap-2 flex items-center justify-between flex-wrap mt-auto border-t border-solid border-t-[#edf0f5] min-h-13 text-[11px] text-[#71819a]">
        <span className="gap-1.5 inline-flex items-center">
          {online ? (
            <Cloud size={14} aria-hidden="true" />
          ) : (
            <HardDrive size={14} aria-hidden="true" />
          )}
          {online ? "En ligne" : "Enregistrement local"}
        </span>
        {published ? (
          <div className="project-publication-actions gap-1.5 inline-flex items-center">
            <Link
              className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 gap-1.5 inline-flex items-center text-[#356ae6] font-semibold hover:underline hover:underline-offset-3 group/card-link"
              to="/creations/$publicationId"
              params={{ publicationId: published }}
            >
              Voir la publication <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <span className="project-private-note group/project-private-note gap-1.5 inline-flex items-center text-[10px] text-[#7b889b]">
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
          className="project-delete-dialog data-[slot=dialog-content]:p-6 data-[slot=dialog-content]:gap-4.5 data-[slot=dialog-content]:max-w-[min(440px,calc(100%-32px))] data-[slot=dialog-content]:rounded-[18px] data-[slot=dialog-content]:bg-white data-[slot=dialog-content]:[box-shadow:0_20px_80px_#223a6026]"
          showCloseButton={false}
          initialFocus={cancelDelete}
          finalFocus={visibilityTrigger}
        >
          <DialogTitle className="text-[19px] font-bold tracking-[-0.5px]">
            Supprimer cette création ?
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-[1.7] wrap-anywhere">
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
            <p
              className="project-delete-error text-[#b43b47] text-xs leading-[inherit]"
              role="alert"
            >
              {deleteError}
            </p>
          )}
          <DialogFooter>
            <Button
              className="min-h-9 rounded-[8px]"
              ref={cancelDelete}
              variant="outline"
              onClick={() => setDeleting(false)}
              disabled={busy}
            >
              Annuler
            </Button>
            <Button
              className="min-h-9 rounded-[8px]"
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
