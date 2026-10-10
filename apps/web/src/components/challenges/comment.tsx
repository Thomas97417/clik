import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation } from "convex/react";
import { Pencil, Trash2, MessageCircle, LoaderCircle } from "lucide-react";
import type { AvatarDescriptor } from "@clik/avatars";
import { defaultAvatar } from "@clik/avatars";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type {
  Doc,
  Id,
} from "@my-better-t-app/backend/convex/_generated/dataModel";
import BrickAvatar from "@/components/ui/brick-avatar";
import AuthorLink from "@/components/clik/author-link";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatDateTime } from "@/lib/format-date";
import {
  actionClass,
  controlClass,
  primaryClass,
  inputClass,
  errorClass,
  commentError,
  submitOnShortcut,
} from "./comment-controls";

export type CommentData = Doc<"comments"> & {
  avatar?: AvatarDescriptor;
  replyTo?: { _id: Id<"comments">; author: string } | null;
};

export default function Comment({
  comment,
  mine,
  onDeleted,
  replyAction,
}: {
  comment: CommentData;
  mine: boolean;
  onDeleted: () => void;
  replyAction?: ReactNode;
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

  if (comment.deletedAt !== undefined)
    return (
      <article
        id={`comment-${comment._id}`}
        className="comment comment-deleted flex scroll-mt-6 gap-3 p-4.5 max-xs:gap-2.5 max-xs:p-3.5"
      >
        <span
          className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-[#eef2f8] text-[#94a1b3]"
          aria-hidden="true"
        >
          <MessageCircle size={16} />
        </span>
        <div className="comment-content min-w-0 flex-1">
          <p className="text-[13px] leading-relaxed text-[#71839c]">
            Commentaire supprimé
          </p>
          {replyAction && (
            <div className="comment-actions -ml-2 mt-2">{replyAction}</div>
          )}
        </div>
      </article>
    );

  return (
    <article
      id={`comment-${comment._id}`}
      tabIndex={-1}
      className="comment flex scroll-mt-6 gap-3 p-4.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#a7c0f2] max-xs:gap-2.5 max-xs:p-3.5"
      data-mine={mine || undefined}
    >
      <div className="comment-avatar mt-0.5 shrink-0" aria-hidden="true">
        <BrickAvatar
          avatar={comment.avatar ?? defaultAvatar(comment.owner)}
          size={32}
        />
      </div>
      <div className="comment-content min-w-0 flex-1">
        {comment.replyToId && comment.replyToId !== comment.threadId && (
          <p className="comment-reply-context mb-1 text-[11px] leading-relaxed text-[#71839c] wrap-anywhere">
            En réponse à {comment.replyTo?.author ?? "un commentaire supprimé"}
          </p>
        )}
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
        {(mine || replyAction) && !editing && (
          <div className="comment-actions mt-2.5">
            {confirm ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#efd5db] bg-[#fff8f9] p-2.5">
                <span
                  className="mr-auto text-xs leading-relaxed text-[#9d3d50]"
                  id={`delete-${comment._id}`}
                >
                  Supprimer ce commentaire ?
                  {!!comment.replyCount && (
                    <span className="mt-1 block">
                      Les réponses seront conservées.
                    </span>
                  )}
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
                {replyAction}
                {mine && (
                  <>
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
                  </>
                )}
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
