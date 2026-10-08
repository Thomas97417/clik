import { usePublicPagination } from "@/lib/clik/use-public-pagination";
import type { PublicData } from "@/lib/seo/public-data";
import { defaultAvatar, type AvatarDescriptor } from "@clik/avatars";
import BrickAvatar from "@/components/ui/brick-avatar";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type {
  Doc,
  Id,
} from "@my-better-t-app/backend/convex/_generated/dataModel";
import { ArrowUpRight } from "lucide-react";
import { SignInTo } from "./shared";
import AuthorLink from "@/components/clik/author-link";
import CommunityArt from "@/components/clik/community-art";
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
  const { isAuthenticated } = useConvexAuth(),
    me = useQuery(api.auth.getCurrentUser, isAuthenticated ? {} : "skip");
  const { results, status, loadMore } = usePublicPagination(
    api.comments.list,
    { publicationId },
    initial,
    undefined,
    20,
  );
  const add = useMutation(api.comments.add),
    [body, setBody] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <section
      id="comments"
      className="creation-comments px-0 gap-12 grid grid-cols-[240px_minmax(0,1fr)] items-start scroll-mt-25 mt-14 pt-3 pb-5 max-md-narrow:gap-4 max-md-narrow:grid-cols-1 max-md-narrow:mt-9.5 min-md-narrow:max-lg-wide:gap-7 min-md-narrow:max-lg-wide:grid-cols-[200px_minmax(0,1fr)]"
      aria-labelledby="comments-title"
    >
      <header className="comments-heading pt-1 max-md-narrow:px-0 max-md-narrow:pt-3 max-md-narrow:relative max-md-narrow:pb-0">
        <CommunityArt
          className="w-31.25 h-24 mt-0 mr-0 mb-4 -ml-3 max-md-narrow:w-16.5 max-md-narrow:h-13.75 max-md-narrow:mb-0 max-md-narrow:ml-0 max-md-narrow:absolute max-md-narrow:right-0 max-md-narrow:top-1"
          kind="comments"
        />
        <h2
          className="text-[27px] font-extrabold tracking-[-0.8px] text-[#25354e] max-md-narrow:text-[21px] max-md-narrow:pr-17.5 min-md-narrow:max-lg-wide:text-[23px]"
          id="comments-title"
        >
          Commentaires
          <span className="px-1.75 py-0 inline-flex align-middle items-center justify-center min-w-6.75 h-6.75 ml-2 rounded-[8px_8px_8px_2px] bg-[#f7e7d9] text-xs leading-[inherit] text-[#9e714b] font-semibold">
            {" "}
            {count}
          </span>
        </h2>
        <p className="mt-3.5 text-[#7d8798] text-[13px] leading-[1.9] max-w-77.5 max-md-narrow:mt-2.5 max-md-narrow:text-xs max-md-narrow:max-w-95 max-md-narrow:pr-19.5">
          Les idées s’assemblent aussi à plusieurs. Un petit mot peut donner
          envie d’aller plus loin.
        </p>
      </header>
      <div className="comments-thread min-w-0">
        {isAuthenticated ? (
          <form
            className="comment-form p-5.5 mx-0 border border-solid border-[#e6ded6] relative mt-3 mb-7.5 rounded-[8px_20px_20px_20px] bg-[#fffefc] [box-shadow:0_5px_0_#eee6dc66] max-sm:p-3.75 before:[content:''] before:absolute before:w-13.5 before:h-3.75 before:-top-2 before:right-6.5 before:bg-[#f1d9bcbb] before:transform-[rotate(4deg)] before:pointer-events-none"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy || !body.trim()) return;
              setBusy(true);
              setError("");
              try {
                await add({ publicationId, body });
                setBody("");
              } catch (e) {
                setError(String(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="comment-composer-heading gap-2.5 flex items-center mb-3.5">
              {me && (
                <BrickAvatar
                  avatar={me.avatar ?? defaultAvatar(me._id)}
                  size={30}
                />
              )}
              <label
                className="block text-[13px] text-[#536580] font-semibold"
                htmlFor="new-comment"
              >
                Votre commentaire
              </label>
            </div>
            <Textarea
              className="p-3.25 border border-solid w-full resize-y min-h-27.5 max-h-90 rounded-[10px] text-sm leading-[1.7] text-[#2e405b] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-2 border-[#eee7df] bg-transparent"
              id="new-comment"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={1000}
              aria-describedby="comment-length"
              rows={3}
              placeholder="Un détail que vous aimez, une idée pour la suite…"
              disabled={busy}
              required
            />
            <div className="comment-composer-footer gap-3 flex items-center justify-between flex-wrap mt-3.5">
              <span
                className="text-[11px] tabular-nums text-[#9398a2]"
                id="comment-length"
              >
                {body.length} / 1 000
              </span>
              <button
                className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 primary-link group/primary-link inline-flex items-center justify-center bg-[#356ae6] text-white font-[650] whitespace-nowrap hover:bg-[#2458ce] px-3.5 py-2.5 gap-2.5 rounded-[10px] min-h-10 text-xs leading-[inherit]"
                disabled={busy || !body.trim()}
              >
                {busy ? "Envoi…" : "Publier le commentaire"}
                <ArrowUpRight
                  className="shrink-0"
                  size={16}
                  aria-hidden="true"
                />
              </button>
            </div>
          </form>
        ) : (
          <div className="comments-signin p-6.5 mx-0 border border-solid border-[#ede0d2] mt-3 mb-7 bg-[#fcf5ed] rounded-[8px_20px_20px_20px] max-md-narrow:p-5">
            <p className="text-[#755d49] text-base font-[650] leading-[1.6]">
              Votre regard fait aussi partie de la création.
            </p>
            <span className="mx-0 block text-[#9b8775] text-[13px] leading-[1.8] mt-2 mb-4.5">
              Rejoignez la conversation pour partager vos idées avec son auteur.
            </span>
            <SignInTo>Se connecter pour commenter</SignInTo>
          </div>
        )}
        {error && (
          <p
            className="challenge-error px-3.75 py-3 gap-2.5 border border-solid border-[#efd5db] flex flex-wrap rounded-[9px] bg-[#fff4f6] text-[#9d3d50] text-[13px] leading-[1.8] wrap-anywhere"
            role="alert"
          >
            {error}
          </p>
        )}
        <div className="comments-list">
          {results.map((comment) => (
            <Comment
              key={comment._id}
              comment={comment}
              mine={comment.owner === me?._id}
            />
          ))}
        </div>
        {!results.length && (
          <p
            className="comments-empty px-0 pt-5.5 pb-3 text-center text-[13px] leading-[1.8] text-[#8a94a5]"
            role="status"
          >
            {status === "LoadingFirstPage"
              ? "Chargement des commentaires…"
              : "Tout est encore à dire. Et si vous laissiez le premier mot ?"}
          </p>
        )}
        {status === "CanLoadMore" && (
          <button
            className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 load-more group/load-more mx-auto my-8.75 block px-4 py-2.5 border border-solid border-[#dfe5ef] rounded-[20px] text-xs leading-[inherit] text-[#637997] bg-white"
            onClick={() => loadMore(20)}
          >
            Voir les commentaires précédents
          </button>
        )}
        {status === "LoadingMore" && <p role="status">Chargement…</p>}
      </div>
    </section>
  );
}
function Comment({
  comment,
  mine,
}: {
  comment: Doc<"comments"> & { avatar?: AvatarDescriptor };
  mine: boolean;
}) {
  const [editing, setEditing] = useState(false),
    [confirm, setConfirm] = useState(false),
    [body, setBody] = useState(comment.body),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const edit = useMutation(api.comments.edit),
    remove = useMutation(api.comments.remove);
  const perform = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await action();
      setEditing(false);
      setConfirm(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <article
      className="comment p-0 gap-3 flex mt-5 group/comment"
      data-mine={mine || undefined}
    >
      <div
        className="comment-avatar grid place-items-center mt-3 shrink-0 rounded-[10px] bg-[#eaf0fc] [&:has([class~='group/brick-avatar'])]:bg-transparent [&:has([class~='group/brick-avatar'])]:rounded-[6px] size-8.5"
        aria-hidden="true"
      >
        <BrickAvatar
          avatar={comment.avatar ?? defaultAvatar(comment.owner)}
          size={32}
        />
      </div>
      <div className="comment-content group/comment-content px-5 py-4.5 border border-solid border-[#e6ebf3] flex-1 min-w-0 bg-white rounded-[4px_18px_18px_18px] max-md-narrow:p-3.5 group-data-[mine]/comment:border-[#dbe5f8] group-data-[mine]/comment:bg-[#f4f7fd]">
        <header className="flex items-baseline flex-wrap gap-y-1.5 gap-x-3.5 mb-2.5">
          <strong className="text-[13px] wrap-anywhere">
            <AuthorLink
              id={comment.owner}
              name={comment.author}
              showAvatar={false}
            />
          </strong>
          <time
            className="text-[11px] text-[#95a0b1] ml-auto max-md-narrow:ml-0"
            dateTime={new Date(comment.createdAt).toISOString()}
          >
            {new Date(comment.createdAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            {comment.updatedAt ? " · modifié" : ""}
          </time>
        </header>
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void perform(() => edit({ id: comment._id, body }));
            }}
          >
            <label
              className="block text-[13px] text-[#536580] font-semibold mb-2.5"
              htmlFor={`edit-${comment._id}`}
            >
              Modifier votre commentaire
            </label>
            <Textarea
              id={`edit-${comment._id}`}
              autoFocus
              maxLength={1000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={busy}
              rows={3}
              required
            />
            <div className="comment-actions flex flex-wrap items-center gap-y-1 gap-x-2 mt-3 text-[11px] text-[#6b82a6]">
              <button
                className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 px-2 py-1.5 min-h-7.5 rounded-[6px] hover:text-[#356ae6] hover:bg-[#e8effb] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-2"
                disabled={busy || !body.trim()}
              >
                Enregistrer
              </button>
              <button
                className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 px-2 py-1.5 min-h-7.5 rounded-[6px] hover:text-[#356ae6] hover:bg-[#e8effb] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-2"
                type="button"
                disabled={busy}
                onClick={() => setEditing(false)}
              >
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <p className="whitespace-pre-wrap wrap-anywhere text-sm leading-[1.8] text-[#526885]">
            {comment.body}
          </p>
        )}
        {mine && !editing && (
          <div className="comment-actions flex flex-wrap items-center gap-y-1 gap-x-2 mt-3 text-[11px] text-[#6b82a6]">
            {confirm ? (
              <>
                <span>Supprimer ce commentaire ?</span>
                <button
                  className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 px-2 py-1.5 min-h-7.5 rounded-[6px] hover:text-[#356ae6] hover:bg-[#e8effb] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-2"
                  disabled={busy}
                  onClick={() =>
                    void perform(() => remove({ id: comment._id }))
                  }
                >
                  Confirmer la suppression
                </button>
                <button
                  className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 px-2 py-1.5 min-h-7.5 rounded-[6px] hover:text-[#356ae6] hover:bg-[#e8effb] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-2"
                  disabled={busy}
                  onClick={() => setConfirm(false)}
                >
                  Annuler
                </button>
              </>
            ) : (
              <>
                <button
                  className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 px-2 py-1.5 min-h-7.5 rounded-[6px] hover:text-[#356ae6] hover:bg-[#e8effb] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-2"
                  onClick={() => {
                    setBody(comment.body);
                    setEditing(true);
                  }}
                >
                  Modifier
                </button>
                <button
                  className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 px-2 py-1.5 min-h-7.5 rounded-[6px] hover:text-[#356ae6] hover:bg-[#e8effb] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-2"
                  onClick={() => setConfirm(true)}
                >
                  Supprimer
                </button>
              </>
            )}
          </div>
        )}
        {error && (
          <p
            className="challenge-error px-3.75 py-3 gap-2.5 border border-solid border-[#efd5db] flex flex-wrap rounded-[9px] bg-[#fff4f6] whitespace-pre-wrap wrap-anywhere text-sm leading-[1.8] text-[#526885]"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    </article>
  );
}
