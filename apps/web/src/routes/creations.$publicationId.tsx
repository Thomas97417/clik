import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import { ArrowRight, GitBranch, MousePointer2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Comments from "@/components/challenges/comments";
import { CreationChallenge } from "@/components/challenges/shared";
import AuthorLink from "@/components/clik/author-link";
import ClientScene from "@/components/clik/client-scene";
import CreationRemixes from "@/components/clik/creation-remixes";
export const Route = createFileRoute("/creations/$publicationId")({
  component: Creation,
});
function Creation() {
  const { publicationId } = Route.useParams();
  return (
    <CreationDetail
      key={publicationId}
      publicationId={publicationId as Id<"publications">}
    />
  );
}
function CreationDetail({
  publicationId,
}: {
  publicationId: Id<"publications">;
}) {
  const navigate = useNavigate(),
    { isAuthenticated } = useConvexAuth();
  const [versionId, setVersionId] = useState<Id<"versions"> | undefined>();
  const p = useQuery(api.projects.creation, {
      id: publicationId,
      ...(versionId ? { versionId } : {}),
    }),
    remix = useMutation(api.projects.remix),
    [busy, setBusy] = useState(false);
  const scene = useMemo(() => (p ? JSON.parse(p.scene) : null), [p?.scene]);
  if (p && !p.challenge && versionId !== p._id) setVersionId(p._id);
  if (p === undefined)
    return (
      <div className="empty-state" role="status">
        Chargement de la création…
      </div>
    );
  if (!p)
    return (
      <div className="empty-state">
        <h1>Cette création n’est plus disponible.</h1>
        <p>
          Les reprises déjà enregistrées restent dans les projets de leurs
          auteurs.
        </p>
        <Link to="/gallery" className="primary-link">
          Retour à la galerie
        </Link>
      </div>
    );
  return (
    <main className="creation-page">
      <div className="creation-layout">
        <div className="creation-preview-panel">
          <div
            className="public-scene"
            role="region"
            aria-label={`Aperçu 3D de ${p.title}`}
          >
            <ClientScene scene={scene} showGrid={false} showViewControls />
            <p className="creation-view-hint">
              <MousePointer2 size={14} aria-hidden="true" />
              <span>
                Glissez pour explorer
                <span className="creation-view-hint-zoom">
                  {" "}
                  · Pincez ou défilez pour zoomer
                </span>
              </span>
            </p>
          </div>
        </div>
        <aside className="creation-details">
          {p.isAssembly && <span className="assembly-badge">Assemblage</span>}
          <h1>{p.title}</h1>
          <p className="author">
            par <AuthorLink id={p.owner} name={p.author} avatar={p.avatar} />
          </p>
          <p className="publication-date">
            Publiée le{" "}
            <time dateTime={new Date(p.createdAt).toISOString()}>
              {new Date(p.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
          </p>
          {p.description && <p className="description">{p.description}</p>}
          {!!p.sources?.length ? (
            <div className="creation-source-list">
              <p>
                <GitBranch size={15} aria-hidden="true" />
                {p.isAssembly ? "Sources de l’assemblage" : "À partir de"}
              </p>
              <ul>
                {p.sources.map((source) => (
                  <li key={source.publicationId}>
                    {source.available ? (
                      <Link
                        to="/creations/$publicationId"
                        params={{ publicationId: source.publicationId }}
                      >
                        « {source.title} »
                      </Link>
                    ) : (
                      <span>« {source.title} »</span>
                    )}
                    <span> par {source.author}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            p.origin && (
              <p className="attribution">
                <GitBranch size={16} aria-hidden="true" />
                <span>
                  D’après « {p.origin.title} » de {p.origin.author}.
                </span>
              </p>
            )
          )}
          {p.challenge &&
            p.updatedAt &&
            p.submittedAt &&
            p.updatedAt > p.submittedAt && (
              <p className="publication-date">
                Mise à jour le {new Date(p.updatedAt).toLocaleString("fr-FR")}.
                Les votes sont conservés.
              </p>
            )}
          <div className="creation-fork">
            <div className="creation-fork-heading">
              <svg
                className="creation-fork-art"
                viewBox="0 0 56 68"
                fill="none"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d="M14 12v44"
                  stroke="#b4c6e5"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d="M14 48c0-23 28-8 28-34"
                  stroke="#356ae6"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <rect
                  x="8"
                  y="6"
                  width="12"
                  height="12"
                  rx="3"
                  fill="#dbe6f8"
                  stroke="#a6badc"
                  strokeWidth="2"
                />
                <rect
                  x="8"
                  y="50"
                  width="12"
                  height="12"
                  rx="3"
                  fill="#dbe6f8"
                  stroke="#a6badc"
                  strokeWidth="2"
                />
                <rect
                  x="35"
                  y="5"
                  width="14"
                  height="14"
                  rx="3"
                  fill="#356ae6"
                />
                <path
                  d="M39 12h6m-3-3v6"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <div>
                <h2>Et si vous imaginiez la suite ?</h2>
                <p>Une nouvelle branche, votre propre version.</p>
              </div>
            </div>
            {isAuthenticated ? (
              <Button
                className="creation-fork-button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const id = await remix({
                      id: publicationId,
                      versionId: p._id,
                    });
                    await navigate({
                      to: "/editor/$projectId",
                      params: { projectId: id },
                    });
                  } catch (e) {
                    toast.error(String(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <GitBranch size={17} aria-hidden="true" />
                {busy
                  ? "Création de votre version…"
                  : "Continuer cette création"}
                <ArrowRight size={16} aria-hidden="true" />
              </Button>
            ) : (
              <Link
                to="/sign-in"
                onClick={() =>
                  sessionStorage.setItem(
                    "clik-return-to",
                    window.location.pathname,
                  )
                }
                className="primary-link creation-fork-button"
              >
                <GitBranch size={17} aria-hidden="true" /> Se connecter pour
                continuer
              </Link>
            )}
            <p className="creation-fork-note">
              Une copie privée rejoint vos créations. L’auteur d’origine reste
              crédité.
            </p>
          </div>
        </aside>
      </div>
      {p.challenge && (
        <CreationChallenge
          day={p.challenge.day}
          publicationId={publicationId}
          owner={p.owner}
          count={p.voteCount}
        />
      )}
      <CreationRemixes publicationId={publicationId} />
      <Comments publicationId={publicationId} count={p.commentCount} />
    </main>
  );
}
