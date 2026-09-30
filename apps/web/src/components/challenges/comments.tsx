import { useEffect, useState } from "react";
import {
  useConvexAuth,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type {
  Doc,
  Id,
} from "@my-better-t-app/backend/convex/_generated/dataModel";
import { MessageCircle, Send } from "lucide-react";
import { SignInTo } from "./shared";
export default function Comments({
  publicationId,
  count,
}: {
  publicationId: Id<"publications">;
  count: number;
}) {
  useEffect(() => {
    if (window.location.hash === "#comments")
      document.getElementById("comments")?.scrollIntoView();
  }, [publicationId]);
  const { isAuthenticated } = useConvexAuth(),
    me = useQuery(api.auth.getCurrentUser, isAuthenticated ? {} : "skip");
  const { results, status, loadMore } = usePaginatedQuery(
    api.comments.list,
    { publicationId },
    { initialNumItems: 20 },
  );
  const add = useMutation(api.comments.add),
    [body, setBody] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <section
      id="comments"
      className="creation-comments"
      aria-labelledby="comments-title"
    >
      <div className="comments-heading">
        <MessageCircle size={22} aria-hidden="true" />
        <h2 id="comments-title">
          Les petits mots<span> {count}</span>
        </h2>
      </div>
      <p>
        Une idée, un détail qui vous plaît, un encouragement ? La discussion est
        ouverte.
      </p>
      {isAuthenticated ? (
        <form
          className="comment-form"
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
          <label htmlFor="new-comment">Votre commentaire</label>
          <textarea
            id="new-comment"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Qu’en pensez-vous ?"
            disabled={busy}
            required
          />
          <div>
            <span>{body.length} / 1 000</span>
            <button className="primary-link" disabled={busy || !body.trim()}>
              <Send size={15} />
              {busy ? "Envoi…" : "Publier le commentaire"}
            </button>
          </div>
        </form>
      ) : (
        <div className="comments-signin">
          <SignInTo>Se connecter pour commenter</SignInTo>
        </div>
      )}
      {error && (
        <p className="challenge-error" role="alert">
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
        <p className="comments-empty">
          {status === "LoadingFirstPage"
            ? "Chargement des commentaires…"
            : "Aucun commentaire pour le moment. Lancez la discussion."}
        </p>
      )}
      {status === "CanLoadMore" && (
        <button className="load-more" onClick={() => loadMore(20)}>
          Voir les commentaires précédents
        </button>
      )}
      {status === "LoadingMore" && <p role="status">Chargement…</p>}
    </section>
  );
}
function Comment({
  comment,
  mine,
}: {
  comment: Doc<"comments">;
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
    <article className="comment">
      <div className="comment-avatar" aria-hidden="true">
        {comment.author.charAt(0).toLocaleUpperCase()}
      </div>
      <div className="comment-content">
        <header>
          <strong>{comment.author}</strong>
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
            <textarea
              id={`edit-${comment._id}`}
              autoFocus
              maxLength={1000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={busy}
              rows={3}
              required
            />
            <div className="comment-actions">
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
          <div className="comment-actions">
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
          <p className="challenge-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}
