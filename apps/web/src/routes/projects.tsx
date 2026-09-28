import { createFileRoute, Link } from "@tanstack/react-router";
import { useConvexAuth, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { Box, Plus, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/projects")({ component: Projects });
function Projects() {
  const { isAuthenticated, isLoading } = useConvexAuth(),
    {
      results: projects,
      status,
      loadMore,
    } = usePaginatedQuery(api.projects.list, isAuthenticated ? {} : "skip", {
      initialNumItems: 12,
    }),
    withdraw = useMutation(api.projects.withdraw);
  return (
    <main className="collection-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Votre espace de création</span>
          <h1>
            Mes créations<span>.</span>
          </h1>
          <p>
            Vos brouillons sont privés. Vous choisissez ce que vous partagez.
          </p>
        </div>
        <Link to="/editor" className="primary-link">
          <Plus size={17} /> Ouvrir le brouillon local
        </Link>
      </div>
      {isLoading ? (
        <div className="empty-state">Chargement…</div>
      ) : !isAuthenticated ? (
        <div className="empty-state">
          <h2>Gardez vos idées à portée de main.</h2>
          <p>
            Connectez-vous pour enregistrer vos créations en ligne. Votre
            brouillon local reste dans l’atelier.
          </p>
          <Link to="/sign-in" className="primary-link">
            Se connecter
          </Link>
        </div>
      ) : status === "LoadingFirstPage" ? (
        <div className="empty-state">Chargement de vos créations…</div>
      ) : !projects.length ? (
        <div className="empty-state">
          <Box size={40} />
          <h2>Tout commence dans l’atelier.</h2>
          <p>Construisez puis choisissez « Conserver dans mes projets ».</p>
          <Link to="/editor" className="primary-link">
            Commencer à construire
          </Link>
        </div>
      ) : (
        <div className="project-list">
          {projects.map((p) => (
            <article key={p._id}>
              <div className="project-icon">
                <Box size={28} />
              </div>
              <div>
                <h2>{p.title}</h2>
                <p>
                  {p.publicationId
                    ? "Une version est publiée"
                    : "Brouillon privé"}{" "}
                  · {new Date(p.updatedAt).toLocaleDateString("fr-FR")}
                </p>
                {p.origin && (
                  <p>
                    D’après {p.origin.title}, de {p.origin.author}
                  </p>
                )}
              </div>
              <div className="project-actions">
                {p.publicationId && (
                  <>
                    <Link
                      to="/creations/$publicationId"
                      params={{ publicationId: p.publicationId }}
                    >
                      Voir la publication
                    </Link>
                    <Button
                      variant="outline"
                      onClick={() =>
                        withdraw({ id: p.publicationId! })
                          .then(() => toast.success("Publication retirée."))
                          .catch((e) => toast.error(String(e)))
                      }
                    >
                      Retirer
                    </Button>
                  </>
                )}
                <Link
                  className="primary-link"
                  to="/editor/$projectId"
                  params={{ projectId: p._id }}
                >
                  Ouvrir <ArrowUpRight size={16} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
      {status === "CanLoadMore" && (
        <Button
          className="load-more"
          variant="outline"
          onClick={() => loadMore(12)}
        >
          Voir plus de projets
        </Button>
      )}
    </main>
  );
}
