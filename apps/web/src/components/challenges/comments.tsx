import { cn } from "@/lib/utils";
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
      className={cn(
        "creation-comments px-[0] gap-[48px] grid grid-cols-[240px_minmax(0,_1fr)] [align-items:start] [scroll-margin-top:100px] mt-[56px] pt-[12px] pb-[20px] [@media(width<=700px)]:gap-[16px] [@media(width<=700px)]:grid-cols-[1fr] [@media(width<=700px)]:mt-[38px] [@media(700px<width<=1000px)]:gap-[28px] [@media(700px<width<=1000px)]:grid-cols-[200px_minmax(0,_1fr)] [&&_textarea]:p-[13px] [&&_textarea]:border-[length:1px] [&&_textarea]:border-solid [&&_textarea]:border-[color:#e5e8ee] [&&_textarea]:w-[100%] [&&_textarea]:[resize:vertical] [&&_textarea]:min-h-[110px] [&&_textarea]:max-h-[360px] [&&_textarea]:bg-[#fff] [&&_textarea]:rounded-[10px] [&&_textarea]:[font-size:14px] [&&_textarea]:leading-[1.7] [&&_textarea]:text-[color:#2e405b] [&&_textarea:focus-visible]:[outline:2px_solid_#356ae6] [&&_textarea:focus-visible]:[outline-offset:2px]",
      )}
      aria-labelledby="comments-title"
    >
      <header
        className={cn(
          "comments-heading pt-[4px] [@media(width<=700px)]:px-[0] [@media(width<=700px)]:pt-[12px] [@media(width<=700px)]:relative [@media(width<=700px)]:pb-[0] [&_[class~='group/community-art']]:w-[125px] [&_[class~='group/community-art']]:h-[96px] [&_[class~='group/community-art']]:mt-[0] [&_[class~='group/community-art']]:mr-[0] [&_[class~='group/community-art']]:mb-[16px] [&_[class~='group/community-art']]:ml-[-12px] [@media(width<=700px)]:[&_[class~='group/community-art']]:w-[66px] [@media(width<=700px)]:[&_[class~='group/community-art']]:h-[55px] [@media(width<=700px)]:[&_[class~='group/community-art']]:mb-[0] [@media(width<=700px)]:[&_[class~='group/community-art']]:ml-[0] [@media(width<=700px)]:[&_[class~='group/community-art']]:absolute [@media(width<=700px)]:[&_[class~='group/community-art']]:right-[0] [@media(width<=700px)]:[&_[class~='group/community-art']]:top-[4px] [&_h2]:[font-size:27px] [&_h2]:font-[800] [&_h2]:tracking-[-0.8px] [&_h2]:text-[color:#25354e] [@media(width<=700px)]:[&_h2]:[font-size:21px] [@media(width<=700px)]:[&_h2]:pr-[70px] [@media(700px<width<=1000px)]:[&_h2]:[font-size:23px] [&_h2_span]:px-[7px] [&_h2_span]:py-[0] [&_h2_span]:inline-flex [&_h2_span]:[vertical-align:middle] [&_h2_span]:items-center [&_h2_span]:justify-center [&_h2_span]:min-w-[27px] [&_h2_span]:h-[27px] [&_h2_span]:ml-[8px] [&_h2_span]:rounded-[8px_8px_8px_2px] [&_h2_span]:bg-[#f7e7d9] [&_h2_span]:[font-size:12px] [&_h2_span]:text-[color:#9e714b] [&_h2_span]:font-[600] [&_p]:mt-[14px] [&_p]:text-[color:#7d8798] [&_p]:[font-size:13px] [&_p]:leading-[1.9] [&_p]:max-w-[310px] [@media(width<=700px)]:[&_p]:mt-[10px] [@media(width<=700px)]:[&_p]:[font-size:12px] [@media(width<=700px)]:[&_p]:max-w-[380px] [@media(width<=700px)]:[&_p]:pr-[78px]",
        )}
      >
        <CommunityArt kind="comments" />
        <h2 id="comments-title">
          Commentaires<span> {count}</span>
        </h2>
        <p>
          Les idées s’assemblent aussi à plusieurs. Un petit mot peut donner
          envie d’aller plus loin.
        </p>
      </header>
      <div
        className={cn(
          "comments-thread min-w-[0] [&_>_[class~='group/load-more']]:px-[16px] [&_>_[class~='group/load-more']]:py-[10px] [&_>_[class~='group/load-more']]:border-[length:1px] [&_>_[class~='group/load-more']]:border-solid [&_>_[class~='group/load-more']]:border-[color:#dfe5ef] [&_>_[class~='group/load-more']]:rounded-[20px] [&_>_[class~='group/load-more']]:[font-size:12px] [&_>_[class~='group/load-more']]:text-[color:#637997] [&_>_[class~='group/load-more']]:bg-[#fff]",
        )}
      >
        {isAuthenticated ? (
          <form
            className={cn(
              "comment-form p-[22px] mx-[0] border-[length:1px] border-solid border-[color:#e6ded6] relative mt-[12px] mb-[30px] rounded-[8px_20px_20px_20px] bg-[#fffefc] [box-shadow:0_5px_0_#eee6dc66] [@media(width<=640px)]:p-[15px] [&::before]:[content:''] [&::before]:absolute [&::before]:w-[54px] [&::before]:h-[15px] [&::before]:top-[-8px] [&::before]:right-[26px] [&::before]:bg-[#f1d9bcbb] [&::before]:[transform:rotate(4deg)] [&::before]:pointer-events-none [&_label]:block [&_label]:[font-size:13px] [&_label]:text-[color:#536580] [&_label]:font-[600] [&&_textarea]:border-[color:#eee7df] [&&_textarea]:bg-[transparent]",
            )}
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
            <div
              className={cn(
                "comment-composer-heading gap-[10px] flex items-center mb-[14px]",
              )}
            >
              {me && (
                <BrickAvatar
                  avatar={me.avatar ?? defaultAvatar(me._id)}
                  size={30}
                />
              )}
              <label htmlFor="new-comment">Votre commentaire</label>
            </div>
            <Textarea
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
            <div
              className={cn(
                "comment-composer-footer gap-[12px] flex items-center justify-between flex-wrap mt-[14px] [&_>_span]:[font-size:11px] [&_>_span]:tabular-nums [&_>_span]:text-[color:#9398a2] [&_button]:px-[14px] [&_button]:py-[10px] [&_button]:gap-[10px] [&_button]:rounded-[10px] [&_button]:min-h-[40px] [&_button]:[font-size:12px]",
              )}
            >
              <span id="comment-length">{body.length} / 1 000</span>
              <button
                className={cn(
                  "primary-link group/primary-link px-[19px] py-[12px] gap-[10px] inline-flex items-center justify-center bg-[#356ae6] text-[color:#fff] rounded-[9px] [font-size:14px] font-[650] whitespace-nowrap [&:hover]:bg-[#2458ce]",
                )}
                disabled={busy || !body.trim()}
              >
                {busy ? "Envoi…" : "Publier le commentaire"}
                <ArrowUpRight size={16} aria-hidden="true" />
              </button>
            </div>
          </form>
        ) : (
          <div
            className={cn(
              "comments-signin p-[26px] mx-[0] border-[length:1px] border-solid border-[color:#ede0d2] mt-[12px] mb-[28px] bg-[#fcf5ed] rounded-[8px_20px_20px_20px] [@media(width<=700px)]:p-[20px] [&_p]:text-[color:#755d49] [&_p]:[font-size:16px] [&_p]:font-[650] [&_p]:leading-[1.6] [&_>_span]:mx-[0] [&_>_span]:block [&_>_span]:text-[color:#9b8775] [&_>_span]:[font-size:13px] [&_>_span]:leading-[1.8] [&_>_span]:mt-[8px] [&_>_span]:mb-[18px]",
            )}
          >
            <p>Votre regard fait aussi partie de la création.</p>
            <span>
              Rejoignez la conversation pour partager vos idées avec son auteur.
            </span>
            <SignInTo>Se connecter pour commenter</SignInTo>
          </div>
        )}
        {error && (
          <p
            className={cn(
              "challenge-error px-[15px] py-[12px] gap-[10px] border-[length:1px] border-solid border-[color:#efd5db] flex flex-wrap rounded-[9px] bg-[#fff4f6] text-[color:#9d3d50] [font-size:13px] leading-[1.8] [overflow-wrap:anywhere] [&_button]:[text-decoration:underline]",
            )}
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
            className={cn(
              "comments-empty px-[0] pt-[22px] pb-[12px] text-center [font-size:13px] leading-[1.8] text-[color:#8a94a5]",
            )}
            role="status"
          >
            {status === "LoadingFirstPage"
              ? "Chargement des commentaires…"
              : "Tout est encore à dire. Et si vous laissiez le premier mot ?"}
          </p>
        )}
        {status === "CanLoadMore" && (
          <button
            className={cn(
              "load-more group/load-more mx-[auto] my-[35px] block",
            )}
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
      className={cn(
        "comment p-[0] gap-[12px] flex mt-[20px] [&[data-mine]_[class~='group/comment-content']]:border-[color:#dbe5f8] [&[data-mine]_[class~='group/comment-content']]:bg-[#f4f7fd]",
      )}
      data-mine={mine || undefined}
    >
      <div
        className={cn(
          "comment-avatar grid [place-items:center] w-[34px] h-[34px] mt-[12px] shrink-[0] rounded-[10px] bg-[#eaf0fc] [&:has([class~='group/brick-avatar'])]:bg-[transparent] [&:has([class~='group/brick-avatar'])]:rounded-[6px]",
        )}
        aria-hidden="true"
      >
        <BrickAvatar
          avatar={comment.avatar ?? defaultAvatar(comment.owner)}
          size={32}
        />
      </div>
      <div
        className={cn(
          "comment-content group/comment-content [&_label]:block [&_label]:[font-size:13px] [&_label]:text-[color:#536580] [&_label]:font-[600] [&_label]:mb-[10px] px-[20px] py-[18px] border-[length:1px] border-solid border-[color:#e6ebf3] flex-[1] min-w-[0] bg-[#fff] rounded-[4px_18px_18px_18px] [@media(width<=700px)]:p-[14px] [&_header]:flex [&_header]:items-baseline [&_header]:flex-wrap [&_header]:gap-y-[6px] [&_header]:gap-x-[14px] [&_header]:mb-[10px] [&_strong]:[font-size:13px] [&_strong]:[overflow-wrap:anywhere] [&_time]:[font-size:11px] [&_time]:text-[color:#95a0b1] [&_time]:ml-[auto] [@media(width<=700px)]:[&_time]:ml-[0] [&_>_p]:[white-space:pre-wrap] [&_>_p]:[overflow-wrap:anywhere] [&_>_p]:[font-size:14px] [&_>_p]:leading-[1.8] [&_>_p]:text-[color:#526885]",
        )}
      >
        <header>
          <strong>
            <AuthorLink
              id={comment.owner}
              name={comment.author}
              showAvatar={false}
            />
          </strong>
          <time dateTime={new Date(comment.createdAt).toISOString()}>
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
            <label htmlFor={`edit-${comment._id}`}>
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
            <div
              className={cn(
                "comment-actions flex flex-wrap items-center gap-y-[4px] gap-x-[8px] mt-[12px] [font-size:11px] text-[color:#6b82a6] [&_button]:px-[8px] [&_button]:py-[6px] [&_button]:min-h-[30px] [&_button]:rounded-[6px] [&_button:hover]:text-[color:#356ae6] [&_button:hover]:bg-[#e8effb] [&_button:focus-visible]:[outline:2px_solid_#356ae6] [&_button:focus-visible]:[outline-offset:2px]",
              )}
            >
              <button disabled={busy || !body.trim()}>Enregistrer</button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setEditing(false)}
              >
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <p>{comment.body}</p>
        )}
        {mine && !editing && (
          <div
            className={cn(
              "comment-actions flex flex-wrap items-center gap-y-[4px] gap-x-[8px] mt-[12px] [font-size:11px] text-[color:#6b82a6] [&_button]:px-[8px] [&_button]:py-[6px] [&_button]:min-h-[30px] [&_button]:rounded-[6px] [&_button:hover]:text-[color:#356ae6] [&_button:hover]:bg-[#e8effb] [&_button:focus-visible]:[outline:2px_solid_#356ae6] [&_button:focus-visible]:[outline-offset:2px]",
            )}
          >
            {confirm ? (
              <>
                <span>Supprimer ce commentaire ?</span>
                <button
                  disabled={busy}
                  onClick={() =>
                    void perform(() => remove({ id: comment._id }))
                  }
                >
                  Confirmer la suppression
                </button>
                <button disabled={busy} onClick={() => setConfirm(false)}>
                  Annuler
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setBody(comment.body);
                    setEditing(true);
                  }}
                >
                  Modifier
                </button>
                <button onClick={() => setConfirm(true)}>Supprimer</button>
              </>
            )}
          </div>
        )}
        {error && (
          <p
            className={cn(
              "challenge-error px-[15px] py-[12px] gap-[10px] border-[length:1px] border-solid border-[color:#efd5db] flex flex-wrap rounded-[9px] bg-[#fff4f6] text-[color:#9d3d50] [font-size:13px] leading-[1.8] [overflow-wrap:anywhere] [&_button]:[text-decoration:underline]",
            )}
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    </article>
  );
}
