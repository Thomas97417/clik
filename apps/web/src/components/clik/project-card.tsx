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
    <article
      className={cn(
        "creation-card project-card group/creation-card overflow-hidden border-[length:1px] border-solid border-[color:#e4eaf2] rounded-[14px] bg-[white] [a&:hover_[class~='group/card-arrow']]:bg-[#356ae6] [a&:hover_[class~='group/card-arrow']]:text-[color:white] [&_>_a:hover_[class~='group/card-arrow']]:bg-[#356ae6] [&_>_a:hover_[class~='group/card-arrow']]:text-[color:white] relative flex flex-col min-w-[0] [&:nth-child(3n_+_2)_[class~='group/project-thumbnail']]:[background:radial-gradient(ellipse_at_50%_65%,_#e4e6f1,_#f6f4fa_70%)] [&:nth-child(3n_+_3)_[class~='group/project-thumbnail']]:[background:radial-gradient(ellipse_at_50%_65%,_#dcebe7,_#f1f8f5_70%)] [&_[class~='group/card-meta']]:px-[18px] [&_[class~='group/card-meta']]:pt-[18px] [&_[class~='group/card-meta']]:pb-[20px] [&_[class~='group/card-meta']_h2]:overflow-hidden [&_[class~='group/card-meta']_h2]:whitespace-nowrap [&_[class~='group/card-meta']_h2]:text-ellipsis [&_[class~='group/card-meta']_p]:text-[color:#73829a] [&_[class~='group/card-meta']_[class~='group/project-description']]:overflow-hidden [&_[class~='group/card-meta']_[class~='group/project-description']]:[display:-webkit-box] [&_[class~='group/card-meta']_[class~='group/project-description']]:[-webkit-box-orient:vertical] [&_[class~='group/card-meta']_[class~='group/project-description']]:[-webkit-line-clamp:2] [&_[class~='group/card-meta']_[class~='group/project-description']]:[overflow-wrap:anywhere] [&_[class~='group/card-meta']_[class~='group/project-description']]:[white-space:pre-line] [&_[class~='group/card-meta']_[class~='group/project-description']]:mt-[8px] [&_[class~='group/card-meta']_[class~='group/project-description']]:mb-[10px] [&_[class~='group/card-meta']_[class~='group/project-description']]:text-[color:#536581] [&_[class~='group/card-meta']_[class~='group/project-description']]:leading-[1.6] [&_[class~='group/card-meta']_[class~='group/project-updated']]:[font-size:11px] [&_[class~='group/project-origin']]:overflow-hidden [&_[class~='group/project-origin']]:whitespace-nowrap [&_[class~='group/project-origin']]:text-ellipsis [&_[class~='group/project-origin']]:[font-size:11px] [&_[class~='group/creation-kind-badge']]:top-[14px] [&_[class~='group/creation-kind-badge']]:right-[14px] [&_[class~='group/creation-kind-badge']]:left-[auto]",
      )}
    >
      <Link
        {...target}
        className={cn(
          "project-card-open block [&:focus-visible]:[outline:2px_solid_#356ae6] [&:focus-visible]:[outline-offset:-2px] [&:focus-visible]:rounded-[13px]",
        )}
        aria-label={`Ouvrir ${creation.title}`}
      >
        <div
          className={cn(
            "thumbnail project-thumbnail group/thumbnail [aspect-ratio:4/3] bg-[#eef2f8] relative [&_img]:w-[100%] [&_img]:h-[100%] [&_img]:object-cover group/project-thumbnail [background:radial-gradient(ellipse_at_50%_65%,_#dfe9f7,_#f1f5fb_70%)] [&_[class~='group/project-challenge-badge']]:px-[9px] [&_[class~='group/project-challenge-badge']]:py-[6px] [&_[class~='group/project-challenge-badge']]:m-[0] [&_[class~='group/project-challenge-badge']]:absolute [&_[class~='group/project-challenge-badge']]:bottom-[16px] [&_[class~='group/project-challenge-badge']]:left-[14px] [&_[class~='group/project-challenge-badge']]:max-w-[calc(100%_-_76px)] [&_[class~='group/project-challenge-badge']]:rounded-[6px] [&_[class~='group/project-challenge-badge']]:bg-[#f5f0ffed] [&_[class~='group/project-challenge-badge']]:text-[color:#765aa8] [&_[class~='group/project-challenge-badge']]:font-[600]",
          )}
        >
          <CreationPreview
            scene={creation.scene}
            cacheKey={creation.cacheKey}
            title={creation.title}
          />
          {creation.challenge && (
            <span
              className={cn(
                "challenge-badge project-challenge-badge group/project-challenge-badge px-[7px] py-[4px] block w-[fit-content] mb-[8px] bg-[#eaf0ff] rounded-[5px] text-[color:#356ae6] [font-size:10px]",
              )}
            >
              Défi du {creation.challenge.day}
            </span>
          )}
          {!!creation.provenance?.imports.length && (
            <span
              className={cn(
                "assembly-badge creation-kind-badge group/assembly-badge px-[8px] py-[3px] border-[length:1px] border-solid border-[color:#c7dfdf] inline-flex w-[fit-content] items-center rounded-[6px] bg-[#edf7f5] text-[color:#37786b] [font-size:10px] font-[650] leading-[1.5] whitespace-nowrap group/creation-kind-badge absolute left-[12px] top-[12px] z-[2] pointer-events-none",
              )}
            >
              Assemblage
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
          <h2 title={creation.title}>{creation.title}</h2>
          {description && (
            <p
              className={cn("project-description group/project-description")}
              title={description}
            >
              {description}
            </p>
          )}
          <p className={cn("project-updated group/project-updated")}>
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
              className={cn("project-origin group/project-origin")}
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
            cn(
              "project-visibility-badge project-visibility-trigger px-[9px] py-[6px] gap-[6px] [font-size:10px] font-[650] leading-[15px] absolute top-[14px] left-[14px] inline-flex items-center rounded-[6px] text-[color:#596d8b] bg-[#ffffffed] [box-shadow:0_1px_4px_#33476b08] [&[class~='group/is-published']]:text-[color:#267453] [&[class~='group/is-published']]:bg-[#f0fcf6ed] cursor-[pointer] [&:hover]:bg-[#fff] [&:hover]:text-[color:#356ae6] [&[data-popup-open]]:bg-[#fff] [&[data-popup-open]]:text-[color:#356ae6] [&:focus-visible]:[outline:2px_solid_#356ae6] [&:focus-visible]:[outline-offset:3px] [&[class~='group/is-published']:hover]:text-[color:#267453] [&[class~='group/is-published']:hover]:bg-[#f0fcf6] [&[class~='group/is-published'][data-popup-open]]:text-[color:#267453] [&[class~='group/is-published'][data-popup-open]]:bg-[#f0fcf6] [&[data-popup-open]_>_svg:last-child]:[transform:rotate(180deg)] [&:disabled]:cursor-[wait]",
              published ? "is-published group/is-published" : "",
            ),
          )}
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
          className={cn(
            "project-visibility-menu [&_[role='menuitem']]:px-[9px] [&_[role='menuitem']]:py-[6px] [&_[role='menuitem']]:gap-[6px] [&_[role='menuitem']]:[font-size:10px] [&_[role='menuitem']]:font-[650] [&_[role='menuitem']]:leading-[15px] [&_[role='menuitem']]:min-h-[27px] [&_[role='menuitem']]:w-[100%] [&_[role='menuitem']]:rounded-[0] [&_[role='menuitem']]:whitespace-nowrap [&_[role='menuitem']]:cursor-[pointer] p-[0] border-[length:1px] border-solid border-[color:#dfe7f3] min-w-[var(--anchor-width)] w-[max-content] max-w-[calc(100vw_-_24px)] rounded-[6px] text-[color:#596d8b] bg-[#fff] [box-shadow:0_10px_28px_#20396220] [&_[role='menuitem']_>_svg]:w-[12px] [&_[role='menuitem']_>_svg]:h-[12px] [&_[role='menuitem']_>_svg]:text-[color:currentColor] [&_[data-slot='dropdown-menu-separator']]:m-[0] [&_[data-slot='dropdown-menu-separator']]:bg-[#edf0f5] [&_[role='menuitem'][data-highlighted]]:text-[color:#356ae6] [&_[role='menuitem'][data-highlighted]]:bg-[#f0f4ff] [&_[data-variant='destructive']]:text-[color:#b43b47] [&_[data-variant='destructive'][data-highlighted]]:text-[color:#9d2632] [&_[data-variant='destructive'][data-highlighted]]:bg-[#fff0f1] [&_[role='menuitem'][data-disabled]]:cursor-[default]",
          )}
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
      <div
        className={cn(
          "project-card-footer px-[18px] py-[12px] gap-[8px] flex items-center justify-between flex-wrap mt-[auto] [border-top-width:1px] [border-top-style:solid] [border-top-color:#edf0f5] min-h-[52px] [font-size:11px] text-[color:#71819a] [&_>_span]:gap-[6px] [&_>_span]:inline-flex [&_>_span]:items-center [&_[class~='group/project-private-note']]:[font-size:10px] [&_[class~='group/project-private-note']]:text-[color:#7b889b]",
        )}
      >
        <span>
          {online ? (
            <Cloud size={14} aria-hidden="true" />
          ) : (
            <HardDrive size={14} aria-hidden="true" />
          )}
          {online ? "En ligne" : "Enregistrement local"}
        </span>
        {published ? (
          <div
            className={cn(
              "project-publication-actions gap-[6px] inline-flex items-center [&_>_a]:gap-[6px] [&_>_a]:inline-flex [&_>_a]:items-center [&_>_a]:text-[color:#356ae6] [&_>_a]:font-[600] [&_>_a:hover]:[text-decoration:underline] [&_>_a:hover]:underline-offset-[3px]",
            )}
          >
            <Link
              to="/creations/$publicationId"
              params={{ publicationId: published }}
            >
              Voir la publication <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <span
            className={cn("project-private-note group/project-private-note")}
          >
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
          className={cn(
            "project-delete-dialog [&[data-slot='dialog-content']]:p-[24px] [&[data-slot='dialog-content']]:gap-[18px] [&[data-slot='dialog-content']]:max-w-[min(440px,_calc(100%_-_32px))] [&[data-slot='dialog-content']]:rounded-[18px] [&[data-slot='dialog-content']]:bg-[#fff] [&[data-slot='dialog-content']]:[box-shadow:0_20px_80px_#223a6026] [&_[data-slot='dialog-title']]:[font-size:19px] [&_[data-slot='dialog-title']]:font-[700] [&_[data-slot='dialog-title']]:tracking-[-0.5px] [&_[data-slot='dialog-description']]:[font-size:13px] [&_[data-slot='dialog-description']]:leading-[1.7] [&_[data-slot='dialog-description']]:[overflow-wrap:anywhere] [&_button]:min-h-[36px] [&_button]:rounded-[8px]",
          )}
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
            <p
              className={cn(
                "project-delete-error text-[color:#b43b47] [font-size:12px]",
              )}
              role="alert"
            >
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
