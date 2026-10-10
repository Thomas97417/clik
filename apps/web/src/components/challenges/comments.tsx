import { usePublicPagination } from "@/lib/clik/use-public-pagination";
import type { PublicData } from "@/lib/seo/public-data";
import { defaultAvatar } from "@clik/avatars";
import BrickAvatar from "@/components/ui/brick-avatar";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useRef, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import { ArrowRight, LoaderCircle, MessageCircle, Send } from "lucide-react";
import { SignInTo } from "./shared";
import CommentDiscussion from "./comment-discussion";
import {
  actionClass,
  primaryClass,
  inputClass,
  errorClass,
  commentError,
  submitOnShortcut,
} from "./comment-controls";

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
              <CommentDiscussion
                key={comment._id}
                comment={comment}
                meId={me?._id}
                isAuthenticated={isAuthenticated}
                authLoading={isLoading}
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
