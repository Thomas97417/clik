import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import { ArrowLeft, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Comments from "@/components/challenges/comments";
import { CreationChallenge } from "@/components/challenges/shared";
import ClientScene from "@/components/clik/client-scene";
export const Route = createFileRoute("/creations/$publicationId")({
  component: Creation,
});
function Creation() {
  const { publicationId } = Route.useParams(),
    navigate = useNavigate(),
    { isAuthenticated } = useConvexAuth();
  const [versionId, setVersionId] = useState<Id<"versions"> | undefined>();
  const p = useQuery(api.projects.creation, {
      id: publicationId as Id<"publications">,
      ...(versionId ? { versionId } : {}),
    }),
    remix = useMutation(api.projects.remix),
    [busy, setBusy] = useState(false);
  if (p && !p.challenge && versionId !== p._id) setVersionId(p._id);
  if (p === undefined)
    return <div className="empty-state">Chargement de la création…</div>;
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
      <Link to="/gallery" className="back-link">
        <ArrowLeft size={16} /> La galerie
      </Link>
      <div className="creation-layout">
        <div className="public-scene">
          <ClientScene scene={JSON.parse(p.scene)} />
          <span>Glissez pour explorer · Pincez ou défilez pour zoomer</span>
        </div>
        <aside>
          <span className="eyebrow">
            {p.challenge ? "Création du défi" : "Création de la communauté"}
          </span>
          {p.challenge && (
            <CreationChallenge
              day={p.challenge.day}
              publicationId={publicationId as Id<"publications">}
              owner={p.owner}
              count={p.voteCount}
            />
          )}
          <h1>{p.title}</h1>
          <p className="author">par {p.author}</p>
          {p.description && <p className="description">{p.description}</p>}
          {p.origin && (
            <p className="attribution">
              D’après « {p.origin.title} » de {p.origin.author}.
            </p>
          )}
          <p className="publication-date">
            Publiée le {new Date(p.createdAt).toLocaleDateString("fr-FR")}
          </p>
          {p.challenge &&
            p.updatedAt &&
            p.submittedAt &&
            p.updatedAt > p.submittedAt && (
              <p className="publication-date">
                Mise à jour le {new Date(p.updatedAt).toLocaleString("fr-FR")}.
                Les votes sont conservés.
              </p>
            )}
          {isAuthenticated ? (
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const id = await remix({
                    id: publicationId as Id<"publications">,
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
              <Copy size={16} />
              {busy ? "Copie en cours…" : "Reprendre cette création"}
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
              className="primary-link"
            >
              Se connecter pour reprendre
            </Link>
          )}
          <p className="reuse-note">
            Créez votre propre version. Une copie privée de cette scène sera
            ajoutée à vos projets, avec son attribution.
          </p>
        </aside>
      </div>
      <Comments
        publicationId={publicationId as Id<"publications">}
        count={p.commentCount}
      />
    </main>
  );
}
