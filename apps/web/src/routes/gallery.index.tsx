import { createFileRoute, Link } from "@tanstack/react-router";
import { usePaginatedQuery } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { ArrowRight, GitBranch, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import GallerySortSelect, {
  validateGallerySearch,
} from "@/components/clik/gallery-sort";
import PublicCreationCard from "@/components/clik/public-creation-card";
import GalleryArt from "@/components/clik/gallery-art";

export const Route = createFileRoute("/gallery/")({
  validateSearch: validateGallerySearch,
  head: () => ({
    meta: [
      { title: "La galerie — Clik" },
      {
        name: "description",
        content:
          "Explorez les constructions de la communauté Clik, partagez vos impressions et créez votre propre version.",
      },
    ],
  }),
  component: Gallery,
});
function Gallery() {
  const { sort = "recent" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { results, status, loadMore } = usePaginatedQuery(
    api.projects.gallery,
    { sort },
    { initialNumItems: 12 },
  );
  return (
    <main className="collection-page gallery-page">
      <header className="gallery-hero">
        <div className="gallery-hero-copy">
          <h1>
            La galerie<span>.</span>
          </h1>
          <p>
            De petites briques, de grandes idées.
            <br />
            Explorez les constructions de la communauté et imaginez la suite.
          </p>
          <Link to="/editor" className="primary-link">
            <Plus size={17} aria-hidden="true" /> À vous de créer
          </Link>
        </div>
        <GalleryArt />
      </header>
      <section aria-labelledby="gallery-creations-title">
        <div className="gallery-toolbar">
          <div>
            <h2 id="gallery-creations-title">À découvrir</h2>
            <p>Ouvrez une création, laissez un mot, faites-en votre version.</p>
          </div>
          <GallerySortSelect
            value={sort}
            onValueChange={(value) => {
              void navigate({
                search: { sort: value === "recent" ? undefined : value },
                resetScroll: false,
              });
            }}
          />
        </div>
        {status === "LoadingFirstPage" ? (
          <div role="status" aria-label="Chargement des créations">
            <span className="sr-only">Ouverture de la galerie…</span>
            <div className="creation-grid" aria-hidden="true">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="gallery-skeleton">
                  <div />
                  <span />
                  <span />
                </div>
              ))}
            </div>
          </div>
        ) : !results.length ? (
          <div className="empty-state gallery-empty">
            <h2>La première idée pourrait être la vôtre.</h2>
            <p>Publiez une création depuis l’atelier pour ouvrir la galerie.</p>
            <Link to="/editor" className="primary-link">
              Ouvrir l’atelier
            </Link>
          </div>
        ) : (
          <div className="creation-grid">
            {results.map((p) => (
              <PublicCreationCard key={p._id} creation={p} />
            ))}
          </div>
        )}
        {!!results.length && (
          <div className="gallery-pagination">
            <p role="status">
              {results.length} création{results.length === 1 ? "" : "s"}{" "}
              affichée{results.length === 1 ? "" : "s"}
            </p>
            {(status === "CanLoadMore" || status === "LoadingMore") && (
              <Button
                variant="outline"
                disabled={status === "LoadingMore"}
                onClick={() => loadMore(12)}
              >
                {status === "LoadingMore"
                  ? "Chargement…"
                  : "Voir plus de créations"}
                <Plus size={15} aria-hidden="true" />
              </Button>
            )}
          </div>
        )}
      </section>
      <aside className="gallery-remix-note">
        <span className="gallery-remix-icon">
          <GitBranch size={22} aria-hidden="true" />
        </span>
        <div>
          <h2>Une création, mille possibilités.</h2>
          <p>
            Chaque création publique peut devenir le point de départ de la
            vôtre. Son auteur reste crédité.
          </p>
        </div>
        <Link to="/editor">
          Faire le premier clik <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </aside>
    </main>
  );
}
