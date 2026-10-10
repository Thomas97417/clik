import { useEffect, useRef, useState } from "react";
import { useHydrated } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { ChevronDown, LoaderCircle, Reply, Send } from "lucide-react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import { usePublicPagination } from "@/lib/clik/use-public-pagination";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import Comment, { type CommentData } from "./comment";
import { SignInTo } from "./shared";
import {
  actionClass,
  primaryClass,
  inputClass,
  errorClass,
  commentError,
  submitOnShortcut,
} from "./comment-controls";

type ReplyTarget = { comment: CommentData; origin: HTMLButtonElement };

export default function CommentDiscussion({
  comment,
  meId,
  isAuthenticated,
  authLoading,
  onDeleted,
}: {
  comment: CommentData;
  meId?: string;
  isAuthenticated: boolean;
  authLoading: boolean;
  onDeleted: () => void;
}) {
  const hydrated = useHydrated();
  const [expanded, setExpanded] = useState(false);
  const [opened, setOpened] = useState(false);
  const [target, setTarget] = useState<ReplyTarget>();
  const [publishedId, setPublishedId] = useState<Id<"comments">>();
  const [sendingReply, setSendingReply] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const toggle = useRef<HTMLButtonElement>(null);
  const rootReply = useRef<HTMLButtonElement>(null);
  const focusRequest = useRef<HTMLElement | "thread" | null>(null);
  const replyCount = comment.replyCount ?? 0;
  const repliesId = `replies-${comment._id}`;

  useEffect(() => {
    if (!focusRequest.current) return;
    const origin = focusRequest.current;
    const element =
      origin !== "thread" && origin.isConnected && origin.offsetParent
        ? origin
        : (toggle.current ?? rootReply.current);
    if (element) {
      element.focus();
      focusRequest.current = null;
    }
  }, [target, announcement, comment.replyCount, comment.deletedAt]);

  const replyAction = (message: CommentData) => {
    if (authLoading) return null;
    const label =
      message.deletedAt !== undefined
        ? "Répondre à la discussion"
        : `Répondre à ${message.author}`;
    if (!isAuthenticated)
      return (
        <SignInTo
          returnHash={`comment-${comment._id}`}
          className={`${actionClass} comment-reply`}
          label={label}
          title="Connectez-vous pour répondre"
        >
          <Reply size={14} aria-hidden="true" />
          Répondre
        </SignInTo>
      );
    return (
      <button
        ref={message._id === comment._id ? rootReply : undefined}
        className={`${actionClass} comment-reply`}
        type="button"
        disabled={!hydrated || sendingReply}
        aria-label={label}
        onClick={(event) => {
          setTarget({ comment: message, origin: event.currentTarget });
          setOpened(true);
          setExpanded(true);
          setAnnouncement("");
        }}
      >
        <Reply size={14} aria-hidden="true" />
        Répondre
      </button>
    );
  };

  return (
    <div className="comment-discussion" data-thread-id={comment._id}>
      <Comment
        comment={comment}
        mine={comment.owner === meId}
        replyAction={replyAction(comment)}
        onDeleted={() => {
          if (!replyCount) return onDeleted();
          focusRequest.current = "thread";
          setAnnouncement(
            "Commentaire supprimé. Les réponses sont conservées.",
          );
        }}
      />
      {!!replyCount && (
        <div className="comment-thread-controls -mt-1 mr-4.5 mb-3 ml-13.5 max-sm:ml-3.5">
          <button
            ref={toggle}
            type="button"
            className={`${actionClass} comment-thread-toggle group gap-2 text-[#356ae6] hover:text-[#2458ce]`}
            disabled={!hydrated}
            aria-expanded={expanded}
            aria-controls={repliesId}
            onClick={() => {
              if (!expanded) setOpened(true);
              setExpanded((value) => !value);
            }}
          >
            <ChevronDown
              size={14}
              className="transition-transform group-aria-expanded:rotate-180 motion-reduce:transition-none"
              aria-hidden="true"
            />
            {expanded
              ? "Masquer les réponses"
              : `Voir ${replyCount} réponse${replyCount > 1 ? "s" : ""}`}
            {expanded && (
              <span className="text-[#71839c] tabular-nums">
                ({replyCount})
              </span>
            )}
          </button>
        </div>
      )}
      <div
        id={repliesId}
        className="comment-replies mr-4.5 mb-4.5 ml-8 border-l border-[#dce6f3] pl-2 max-sm:mr-2 max-sm:ml-3.5 max-sm:pl-1"
        hidden={!expanded}
        role="group"
        aria-label={
          comment.deletedAt !== undefined
            ? "Réponses à un commentaire supprimé"
            : `Réponses à ${comment.author}`
        }
      >
        {opened && (
          <Replies
            threadId={comment._id}
            meId={meId}
            replyAction={replyAction}
            publishedId={publishedId}
            expanded={expanded}
            onLocated={() => setPublishedId(undefined)}
            onDeleted={() => {
              if (comment.deletedAt !== undefined && replyCount <= 1)
                return onDeleted();
              focusRequest.current = "thread";
              setAnnouncement("Réponse supprimée.");
            }}
          />
        )}
        {target && (
          <ReplyComposer
            publicationId={comment.publicationId}
            target={target}
            onBusyChange={setSendingReply}
            onCancel={() => {
              focusRequest.current = target.origin;
              setTarget(undefined);
            }}
            onSent={(id) => {
              setPublishedId(id);
              setTarget(undefined);
              setAnnouncement("Réponse publiée.");
            }}
          />
        )}
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}

function Replies({
  threadId,
  meId,
  replyAction,
  publishedId,
  expanded,
  onLocated,
  onDeleted,
}: {
  threadId: Id<"comments">;
  meId?: string;
  replyAction: (comment: CommentData) => React.ReactNode;
  publishedId?: Id<"comments">;
  expanded: boolean;
  onLocated: () => void;
  onDeleted: () => void;
}) {
  // Keep already opened pages mounted when folding, preserving loaded replies and drafts.
  const { results, status, loadMore } = usePublicPagination(
    api.comments.replies,
    { threadId },
    undefined,
    undefined,
    20,
  );
  useEffect(() => {
    if (!expanded || !publishedId) return;
    const element = document.getElementById(`comment-${publishedId}`);
    if (element) {
      element.focus({ preventScroll: true });
      element.scrollIntoView({ block: "nearest" });
      onLocated();
    }
  }, [results, publishedId, expanded, onLocated]);

  return (
    <>
      {(status === "CanLoadMore" || status === "LoadingMore") && (
        <button
          className={`${actionClass} comment-replies-more mx-3 mb-2 gap-2 border border-[#dfe5ef]`}
          type="button"
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
            : "Voir les réponses précédentes"}
        </button>
      )}
      {status === "LoadingFirstPage" ? (
        <div className="p-4" role="status" aria-label="Chargement des réponses">
          <div aria-hidden="true" className="flex gap-3">
            <Skeleton className="size-8 shrink-0 rounded-lg bg-[#eef2f8]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-28 rounded bg-[#eef2f8]" />
              <Skeleton className="h-3 w-4/5 rounded bg-[#eef2f8]" />
            </div>
          </div>
        </div>
      ) : (
        <div className="comment-replies-list divide-y divide-[#eef2f8]">
          {[...results].reverse().map((reply) => (
            <Comment
              key={reply._id}
              comment={reply}
              mine={reply.owner === meId}
              replyAction={replyAction(reply)}
              onDeleted={onDeleted}
            />
          ))}
        </div>
      )}
    </>
  );
}

function ReplyComposer({
  publicationId,
  target,
  onCancel,
  onSent,
  onBusyChange,
}: {
  publicationId: Id<"publications">;
  target: ReplyTarget;
  onCancel: () => void;
  onSent: (id: Id<"comments">) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const add = useMutation(api.comments.add);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  const restoreFocus = useRef(false);
  const id = `reply-${target.comment.threadId ?? target.comment._id}`;
  useEffect(() => {
    setError("");
    field.current?.focus({ preventScroll: true });
    field.current?.closest("form")?.scrollIntoView({ block: "nearest" });
  }, [target]);
  useEffect(() => {
    if (!busy && restoreFocus.current) {
      field.current?.focus({ preventScroll: true });
      field.current?.closest("form")?.scrollIntoView({ block: "nearest" });
      restoreFocus.current = false;
    }
  }, [busy]);

  return (
    <form
      className="comment-reply-form mx-3 mt-2 rounded-lg border border-[#e4eaf2] bg-[#fafbfd] p-3.5 max-sm:mx-2 max-sm:p-3"
      aria-busy={busy}
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || !body.trim()) return;
        setBusy(true);
        onBusyChange(true);
        setError("");
        try {
          const replyId = await add({
            publicationId,
            replyToId: target.comment._id,
            body,
          });
          onSent(replyId);
        } catch (error) {
          setError(
            commentError(
              error,
              "Votre réponse n’a pas pu être publiée. Réessayez.",
            ),
          );
          restoreFocus.current = true;
        } finally {
          setBusy(false);
          onBusyChange(false);
        }
      }}
    >
      <label
        htmlFor={id}
        className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-[#536580] wrap-anywhere"
      >
        <Reply size={14} className="shrink-0" aria-hidden="true" />
        Votre réponse à{" "}
        {target.comment.deletedAt !== undefined
          ? "la discussion"
          : target.comment.author}
      </label>
      <Textarea
        ref={field}
        id={id}
        className={`${inputClass} min-h-22 bg-white`}
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
          setError("");
        }}
        onKeyDown={submitOnShortcut}
        maxLength={1000}
        rows={3}
        placeholder="Poursuivez la discussion…"
        aria-describedby={`${id}-length${error ? ` ${id}-error` : ""}`}
        disabled={busy}
        required
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className="mr-auto text-[11px] text-[#71839c] tabular-nums max-sm:w-full"
          id={`${id}-length`}
        >
          {body.length} / 1 000
        </span>
        <button
          type="button"
          className={actionClass}
          onClick={onCancel}
          disabled={busy}
        >
          Annuler
        </button>
        <button
          className={`${primaryClass} max-sm:w-full`}
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
          {busy ? "Envoi…" : "Publier la réponse"}
        </button>
      </div>
      {error && (
        <p className={errorClass} id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
