import { usePublicPagination } from "@/lib/clik/use-public-pagination";
import type { PublicData } from "@/lib/seo/public-data";
import { defaultAvatar } from "@clik/avatars";
import BrickAvatar from "@/components/ui/brick-avatar";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import { ArrowRight, LoaderCircle, Send } from "lucide-react";
import { SignInTo } from "./shared";
import CommentDiscussion from "./comment-discussion";
import {
  actionClass,
  primaryClass,
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
      className="creation-comments min-w-0 scroll-mt-25"
      aria-labelledby="comments-title"
    >
      <header className="comments-heading mb-6 flex min-h-8 items-center">
        <h2
          className="text-xl leading-snug font-bold tracking-[-0.4px] text-[#25354e]"
          id="comments-title"
        >
          Commentaires
          <span
            className="ml-2.5 align-middle text-xs font-normal text-[#8190a5] tabular-nums"
            aria-hidden="true"
          >
            {count}
          </span>
        </h2>
      </header>
      <div className="comments-thread min-w-0">
        {isLoading ? (
          <div className="mb-8 flex items-start gap-3" role="status">
            <span className="sr-only">
              Chargement du formulaire de commentaire…
            </span>
            <Skeleton
              className="size-9 shrink-0 rounded-lg bg-[#eef2f8]"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1" aria-hidden="true">
              <Skeleton className="h-36 rounded-lg bg-[#eef2f8]" />
            </div>
          </div>
        ) : isAuthenticated ? (
          <form
            className="comment-form mb-8 flex items-start gap-3 max-xs:gap-2.5"
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
            <div
              className="comment-composer-avatar mt-1 shrink-0"
              aria-hidden="true"
            >
              {me ? (
                <BrickAvatar
                  avatar={me.avatar ?? defaultAvatar(me._id)}
                  size={34}
                />
              ) : (
                <Skeleton className="size-8.5 rounded-lg bg-[#eef2f8]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <label className="sr-only" htmlFor="new-comment">
                Votre commentaire
              </label>
              <div className="comment-composer-field rounded-[10px] border border-[#dfe5ee] bg-[#f9fafc] transition-colors focus-within:border-[#86a8e9] focus-within:bg-white">
                <Textarea
                  ref={composer}
                  className="min-h-20 max-h-90 resize-none rounded-[10px] border-0 bg-transparent px-3.5 py-3 text-sm leading-relaxed text-[#2e405b] placeholder:text-[#8a98ab] focus-visible:border-transparent focus-visible:ring-0 md:text-sm md:leading-relaxed"
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
                  rows={2}
                  placeholder="Ajouter un commentaire…"
                  disabled={busy}
                  required
                />
                <div className="comment-composer-footer flex flex-wrap items-center justify-between gap-2 px-3 pb-3">
                  <span
                    className="text-[10px] text-[#8a98ab] tabular-nums"
                    id="comment-length"
                  >
                    {body.length} / 1 000
                  </span>
                  <button
                    className={cn(
                      primaryClass,
                      "ml-auto min-h-8 gap-1.5 px-2.5 py-1.5",
                    )}
                    aria-label={busy ? "Envoi…" : "Publier le commentaire"}
                    title="Publier (⌘/Ctrl + Entrée)"
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
                    {busy ? "Envoi…" : "Publier"}
                  </button>
                </div>
              </div>
              {error && (
                <p id="comment-error" className={errorClass} role="alert">
                  {error}
                </p>
              )}
            </div>
          </form>
        ) : (
          <SignInTo
            returnHash="comments"
            className="comments-signin group/comments-signin mb-7 flex min-h-13 w-full justify-between gap-3 rounded-md border border-[#e5eaf2] bg-[#f8fafc] px-4 py-3.5 text-left text-[13px] font-medium text-[#63758f] hover:border-[#c7d5eb] hover:bg-[#f3f6fb] hover:text-[#356ae6]"
          >
            Se connecter pour commenter{" "}
            <ArrowRight
              className="shrink-0 text-[#91a1b8] transition-transform group-hover/comments-signin:translate-x-0.5 motion-reduce:transition-none"
              size={15}
              aria-hidden="true"
            />
          </SignInTo>
        )}
        <span className="sr-only" role="status" aria-live="polite">
          {announcement}
        </span>
        {status === "LoadingFirstPage" ? (
          <div className="space-y-7" role="status">
            <span className="sr-only">Chargement des commentaires…</span>
            <div aria-hidden="true" className="space-y-7">
              {[0, 1].map((index) => (
                <div key={index} className="flex gap-3">
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
          <div className="comments-list space-y-7">
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
          <div className="comments-empty py-3">
            <p className="text-[13px] font-medium text-[#526783]">
              Aucun commentaire pour le moment.
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-[#8190a5]">
              Laissez le premier mot à l’auteur.
            </p>
          </div>
        )}
        {(status === "CanLoadMore" || status === "LoadingMore") && (
          <button
            className={`${actionClass} mt-6 flex min-h-10 gap-2`}
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
