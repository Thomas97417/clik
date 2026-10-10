import { usePublicPagination } from "@/lib/clik/use-public-pagination";
import type { PublicData } from "@/lib/seo/public-data";
import { defaultAvatar, type AvatarDescriptor } from "@clik/avatars";
import BrickAvatar from "@/components/ui/brick-avatar";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type {
  Doc,
  Id,
} from "@my-better-t-app/backend/convex/_generated/dataModel";
import {
  ArrowRight,
  LoaderCircle,
  MessageCircle,
  Pencil,
  Send,
  Trash2,
} from "lucide-react";
import { SignInTo } from "./shared";
import AuthorLink from "@/components/clik/author-link";
import { formatDate, formatDateTime } from "@/lib/format-date";

const inputClass =
  "w-full min-h-26 max-h-90 resize-y rounded-lg border-[#dfe5ef] bg-[#fafbfd] p-3 text-sm leading-[1.7] text-[#2e405b] placeholder:text-[#8392a8] focus-visible:border-[#356ae6] focus-visible:ring-[#356ae6]/20 md:text-sm md:leading-[1.7]";
const controlClass =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#356ae6] focus-visible:outline-offset-3 disabled:cursor-not-allowed disabled:opacity-40";
const primaryClass = `${controlClass} min-h-10 bg-[#356ae6] text-white hover:bg-[#2458ce]`;
const actionClass = `${controlClass} min-h-9 text-[#63758f] hover:bg-[#eef2f8] hover:text-[#25354e]`;
const errorClass =
  "mt-3 rounded-lg border border-[#efd5db] bg-[#fff4f6] px-3 py-2.5 text-[13px] leading-relaxed text-[#9d3d50] wrap-anywhere";

function submitOnShortcut(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (
    event.key === "Enter" &&
    (event.ctrlKey || event.metaKey) &&
    !event.nativeEvent.isComposing
  ) {
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }
}

function commentError(error: unknown, fallback: string) {
  return error instanceof ConvexError && typeof error.data === "string"
    ? error.data
    : fallback;
}

export default function Comments({
  publicationId,
  initial,
  count,
}: {
  publicationId: Id<"publications">;
  initial?: PublicData["creation"]["comments"];
  count: number;
}) {
  useEffect(() => {
    if (window.location.hash === "#comments")
      document.getElementById("comments")?.scrollIntoView();
  }, [publicationId]);
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.auth.getCurrentUser, isAuthenticated ? {} : "skip");
  const { results, status, loadMore } = usePublicPagination(
    api.comments.list,
    { publicationId },
    initial,
    undefined,
    20,
  );
  const add = useMutation(api.comments.add);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const composer = useRef<HTMLTextAreaElement>(null);
  const restoreComposerFocus = useRef(false);
  useEffect(() => {
    if (!busy && restoreComposerFocus.current) {
      composer.current?.focus();
      restoreComposerFocus.current = false;
    }
  }, [busy]);

  return (
    <section
      id="comments"
      className="creation-comments mt-10 grid scroll-mt-25 grid-cols-[220px_minmax(0,1fr)] items-start gap-8 border-t border-[#e4eaf2] pt-6 pb-5 max-lg-narrow:grid-cols-1 max-lg-narrow:gap-5"
      aria-labelledby="comments-title"
    >
      <header className="comments-heading">
        <div className="flex items-center gap-3">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf3ff] text-[#356ae6]"
            aria-hidden="true"
          >
            <MessageCircle size={18} />
          </span>
          <h2
            className="text-xl leading-snug font-bold tracking-[-0.4px] text-[#25354e] max-xs:text-lg"
            id="comments-title"
          >
            Commentaires
            <span
              className="ml-2 inline-flex min-w-6 items-center justify-center rounded-md bg-[#eef2f8] px-1.5 py-1 align-middle text-xs font-medium text-[#63758f] tabular-nums"
              aria-hidden="true"
            >
              {count}
            </span>
          </h2>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-[#71839c] max-lg-narrow:mt-2">
          Un détail qui vous plaît, une idée pour la suite ? Partagez votre
          regard.
        </p>
      </header>
      <div className="comments-thread min-w-0">
        {isLoading ? (
          <div
            className="mb-5 rounded-xl border border-[#e4eaf2] bg-white p-4"
            role="status"
          >
            <span className="sr-only">
              Chargement du formulaire de commentaire…
            </span>
            <div aria-hidden="true">
              <Skeleton className="mb-3 h-4 w-36 rounded bg-[#eef2f8]" />
              <Skeleton className="h-26 rounded-lg bg-[#eef2f8]" />
              <Skeleton className="mt-3 ml-auto h-10 w-44 rounded-lg bg-[#eef2f8]" />
            </div>
          </div>
        ) : isAuthenticated ? (
          <form
            className="comment-form mb-5 rounded-xl border border-[#e4eaf2] bg-white p-4.5 max-xs:p-3.5"
            aria-busy={busy}
            onSubmit={async (event) => {
              event.preventDefault();
              if (busy || !body.trim()) return;
              setBusy(true);
              setError("");
              setAnnouncement("");
              try {
                await add({ publicationId, body });
                setBody("");
                setAnnouncement("Commentaire publié.");
              } catch (error) {
                setError(
                  commentError(
                    error,
                    "Votre commentaire n’a pas pu être publié. Réessayez.",
                  ),
                );
              } finally {
                restoreComposerFocus.current = true;
                setBusy(false);
              }
            }}
          >
            <div className="comment-composer-heading mb-3 flex items-center gap-2.5">
              {me && (
                <BrickAvatar
                  avatar={me.avatar ?? defaultAvatar(me._id)}
                  size={26}
                />
              )}
              <label
                className="text-[13px] font-semibold text-[#536580]"
                htmlFor="new-comment"
              >
                Votre commentaire
              </label>
            </div>
            <Textarea
              ref={composer}
              className={inputClass}
              id="new-comment"
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                setError("");
              }}
              onKeyDown={submitOnShortcut}
              maxLength={1000}
              aria-describedby={
                error ? "comment-length comment-error" : "comment-length"
              }
              rows={3}
              placeholder="Un détail que vous aimez, une idée pour la suite…"
              disabled={busy}
              required
            />
            <div className="comment-composer-footer mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-[11px] text-[#71839c]">
                <span className="tabular-nums" id="comment-length">
                  {body.length} / 1 000
                </span>
                <span className="max-sm:hidden">
                  Ctrl / ⌘ + Entrée pour publier
                </span>
              </div>
              <button
                className={`${primaryClass} ml-auto max-xs:w-full`}
                disabled={busy || !body.trim()}
              >
                {busy ? (
                  <LoaderCircle
                    className="animate-spin motion-reduce:animate-none"
                    size={14}
                    aria-hidden="true"
                  />
                ) : (
                  <Send size={14} aria-hidden="true" />
                )}
                {busy ? "Envoi…" : "Publier le commentaire"}
              </button>
            </div>
            {error && (
              <p id="comment-error" className={errorClass} role="alert">
                {error}
              </p>
            )}
          </form>
        ) : (
          <div className="comments-signin mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-[#e4eaf2] bg-white p-4.5 max-xs:p-4">
            <p className="text-[13px] leading-relaxed text-[#63758f]">
              Connectez-vous pour partager vos idées avec l’auteur.
            </p>
            <SignInTo
              returnHash="comments"
              className="min-h-10 gap-2 rounded-lg border border-[#dce6f7] px-3 hover:border-[#b4c6e5] hover:bg-[#edf3ff]"
            >
              Se connecter pour commenter{" "}
              <ArrowRight size={14} aria-hidden="true" />
            </SignInTo>
          </div>
        )}
        <span className="sr-only" role="status" aria-live="polite">
          {announcement}
        </span>
        {status === "LoadingFirstPage" ? (
          <div
            className="rounded-xl border border-[#e4eaf2] bg-white"
            role="status"
          >
            <span className="sr-only">Chargement des commentaires…</span>
            <div aria-hidden="true" className="divide-y divide-[#e4eaf2]">
              {[0, 1].map((index) => (
                <div key={index} className="flex gap-3 p-4.5">
                  <Skeleton className="size-8 shrink-0 rounded-lg bg-[#eef2f8]" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-28 rounded bg-[#eef2f8]" />
                    <Skeleton className="mt-4 h-3 w-4/5 rounded bg-[#eef2f8]" />
                    <Skeleton className="h-3 w-1/2 rounded bg-[#eef2f8]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : results.length ? (
          <div className="comments-list divide-y divide-[#e4eaf2] rounded-xl border border-[#e4eaf2] bg-white">
            {results.map((comment) => (
              <Comment
                key={comment._id}
                comment={comment}
                mine={comment.owner === me?._id}
                onDeleted={() => {
                  setAnnouncement("Commentaire supprimé.");
                  composer.current?.focus();
                }}
              />
            ))}
          </div>
        ) : (
          <p className="comments-empty rounded-xl border border-dashed border-[#dfe5ef] px-5 py-7 text-center text-[13px] leading-relaxed text-[#71839c]">
            Tout est encore à dire. Et si vous laissiez le premier mot ?
          </p>
        )}
        {(status === "CanLoadMore" || status === "LoadingMore") && (
          <button
            className={`${actionClass} mx-auto mt-5 flex min-h-10 gap-2 border border-[#dfe5ef] bg-white`}
            disabled={status === "LoadingMore"}
            aria-busy={status === "LoadingMore"}
            onClick={() => loadMore(20)}
          >
            {status === "LoadingMore" && (
              <LoaderCircle
                className="animate-spin motion-reduce:animate-none"
                size={14}
                aria-hidden="true"
              />
            )}
            {status === "LoadingMore"
              ? "Chargement…"
              : "Voir les commentaires précédents"}
          </button>
        )}
      </div>
    </section>
  );
}

function Comment({
  comment,
  mine,
  onDeleted,
}: {
  comment: Doc<"comments"> & { avatar?: AvatarDescriptor };
  mine: boolean;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [body, setBody] = useState(comment.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const editButton = useRef<HTMLButtonElement>(null);
  const removeButton = useRef<HTMLButtonElement>(null);
  const editingField = useRef<HTMLTextAreaElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const focusRequest = useRef<"edit" | "remove" | "draft" | "confirm" | null>(
    null,
  );
  useEffect(() => {
    if (busy || !focusRequest.current) return;
    const target = {
      edit: editButton,
      remove: removeButton,
      draft: editingField,
      confirm: confirmButton,
    }[focusRequest.current];
    if (target.current) {
      target.current.focus();
      focusRequest.current = null;
    }
  }, [editing, confirm, busy]);
  const edit = useMutation(api.comments.edit);
  const remove = useMutation(api.comments.remove);
  const perform = async (
    action: () => Promise<unknown>,
    fallback: string,
    onSuccess: () => void,
  ) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setAnnouncement("");
    try {
      await action();
      setEditing(false);
      setConfirm(false);
      onSuccess();
    } catch (error) {
      setError(commentError(error, fallback));
      focusRequest.current = editing ? "draft" : "confirm";
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      className="comment flex gap-3 p-4.5 max-xs:gap-2.5 max-xs:p-3.5"
      data-mine={mine || undefined}
    >
      <div className="comment-avatar mt-0.5 shrink-0" aria-hidden="true">
        <BrickAvatar
          avatar={comment.avatar ?? defaultAvatar(comment.owner)}
          size={32}
        />
      </div>
      <div className="comment-content min-w-0 flex-1">
        <header className="mb-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <strong className="text-[13px] text-[#334a6d] wrap-anywhere">
            <AuthorLink
              id={comment.owner}
              name={comment.author}
              showAvatar={false}
            />
          </strong>
          {mine && (
            <span className="rounded bg-[#eef2f8] px-1.5 py-0.5 text-[10px] font-medium text-[#63758f]">
              Vous
            </span>
          )}
          <time
            className="ml-auto text-[11px] text-[#71839c] max-sm:ml-0"
            dateTime={new Date(comment.createdAt).toISOString()}
            title={formatDateTime(comment.createdAt)}
          >
            {formatDate(comment.createdAt)}
            {comment.updatedAt ? " · modifié" : ""}
          </time>
        </header>
        {editing ? (
          <form
            aria-busy={busy}
            onSubmit={(event) => {
              event.preventDefault();
              if (busy || !body.trim() || body.trim() === comment.body.trim())
                return;
              void perform(
                () => edit({ id: comment._id, body }),
                "Votre commentaire n’a pas pu être modifié. Réessayez.",
                () => {
                  focusRequest.current = "edit";
                  setAnnouncement("Commentaire modifié.");
                },
              );
            }}
          >
            <label
              className="mb-2 block text-[13px] font-semibold text-[#536580]"
              htmlFor={`edit-${comment._id}`}
            >
              Modifier votre commentaire
            </label>
            <Textarea
              ref={editingField}
              className={inputClass}
              id={`edit-${comment._id}`}
              autoFocus
              maxLength={1000}
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                setError("");
              }}
              onKeyDown={submitOnShortcut}
              aria-describedby={`edit-length-${comment._id}${error ? ` error-${comment._id}` : ""}`}
              disabled={busy}
              rows={3}
              required
            />
            <div className="comment-actions mt-3 flex flex-wrap items-center gap-2">
              <span
                className="mr-auto text-[11px] text-[#71839c] tabular-nums max-sm:w-full"
                id={`edit-length-${comment._id}`}
              >
                {body.length} / 1 000
              </span>
              <button
                className={primaryClass}
                disabled={
                  busy || !body.trim() || body.trim() === comment.body.trim()
                }
              >
                {busy && (
                  <LoaderCircle
                    className="animate-spin motion-reduce:animate-none"
                    size={14}
                    aria-hidden="true"
                  />
                )}
                {busy ? "Enregistrement…" : "Enregistrer"}
              </button>
              <button
                className={actionClass}
                type="button"
                disabled={busy}
                onClick={() => {
                  focusRequest.current = "edit";
                  setBody(comment.body);
                  setError("");
                  setEditing(false);
                }}
              >
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm leading-[1.8] whitespace-pre-wrap text-[#526885] wrap-anywhere">
            {comment.body}
          </p>
        )}
        {mine && !editing && (
          <div className="comment-actions mt-2.5">
            {confirm ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#efd5db] bg-[#fff8f9] p-2.5">
                <span
                  className="mr-auto text-xs leading-relaxed text-[#9d3d50]"
                  id={`delete-${comment._id}`}
                >
                  Supprimer ce commentaire ?
                </span>
                <button
                  ref={confirmButton}
                  className={`${controlClass} min-h-9 bg-[#b43e53] text-white hover:bg-[#9d3044]`}
                  disabled={busy}
                  aria-describedby={`delete-${comment._id}`}
                  onClick={() =>
                    void perform(
                      () => remove({ id: comment._id }),
                      "Votre commentaire n’a pas pu être supprimé. Réessayez.",
                      onDeleted,
                    )
                  }
                >
                  {busy ? "Suppression…" : "Confirmer la suppression"}
                </button>
                <button
                  className={actionClass}
                  disabled={busy}
                  onClick={() => {
                    focusRequest.current = "remove";
                    setConfirm(false);
                    setError("");
                  }}
                >
                  Annuler
                </button>
              </div>
            ) : (
              <div className="-ml-2 flex flex-wrap items-center gap-1">
                <button
                  ref={editButton}
                  className={actionClass}
                  disabled={busy}
                  onClick={() => {
                    setBody(comment.body);
                    setError("");
                    setAnnouncement("");
                    setEditing(true);
                  }}
                >
                  <Pencil size={13} aria-hidden="true" />
                  Modifier
                </button>
                <button
                  ref={removeButton}
                  className={`${controlClass} min-h-9 text-[#63758f] hover:bg-[#fff4f6] hover:text-[#9d3d50]`}
                  disabled={busy}
                  onClick={() => {
                    focusRequest.current = "confirm";
                    setError("");
                    setAnnouncement("");
                    setConfirm(true);
                  }}
                >
                  <Trash2 size={13} aria-hidden="true" />
                  Supprimer
                </button>
              </div>
            )}
          </div>
        )}
        {error && (
          <p id={`error-${comment._id}`} className={errorClass} role="alert">
            {error}
          </p>
        )}
        <span className="sr-only" role="status" aria-live="polite">
          {announcement}
        </span>
      </div>
    </article>
  );
}
