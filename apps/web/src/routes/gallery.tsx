import { createFileRoute, Link } from "@tanstack/react-router";
import { usePaginatedQuery } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { ArrowUpRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/gallery")({ component: Gallery });
function Gallery() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.projects.gallery,
    {},
    { initialNumItems: 12 },
  );
  return (
    <main className="collection-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">L’imagination se partage</span>
          <h1>
            La galerie<span>.</span>
          </h1>
          <p>Des idées à explorer, des constructions à réinventer.</p>
        </div>
        <Link to="/editor" className="primary-link">
          <Plus size={17} /> À vous de créer
        </Link>
      </div>
      <div className="collection-meta">
        <span>Créations de la communauté</span>
        <span>Les plus récentes</span>
      </div>
      {status === "LoadingFirstPage" ? (
        <div className="empty-state">Ouverture de la galerie…</div>
      ) : !results.length ? (
        <div className="empty-state">
          <h2>La première idée pourrait être la vôtre.</h2>
          <p>Publiez une création depuis l’atelier pour ouvrir la galerie.</p>
          <Link to="/editor" className="primary-link">
            Ouvrir l’atelier
          </Link>
        </div>
      ) : (
        <div className="creation-grid">
          {results.map((p) => (
            <Link
              key={p._id}
              to="/creations/$publicationId"
              params={{ publicationId: p._id }}
              className="creation-card"
            >
              <div className="thumbnail">
                {p.thumbnailUrl && (
                  <img src={p.thumbnailUrl} alt={p.title} loading="lazy" />
                )}
                <span className="card-arrow">
                  <ArrowUpRight size={20} />
                </span>
              </div>
              <div className="card-meta">
                {p.challenge && (
                  <span className="challenge-badge">
                    Défi du {p.challenge.day}
                  </span>
                )}
                <h2>{p.title}</h2>
                <p>par {p.author}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
      {status === "CanLoadMore" && (
        <Button
          variant="outline"
          className="load-more"
          onClick={() => loadMore(12)}
        >
          Voir plus de créations
        </Button>
      )}
      {status === "LoadingMore" && <p>Chargement…</p>}
      <p className="reuse-note">
        Les créations publiques sont réutilisables dans Clik avec attribution.
      </p>
    </main>
  );
}
