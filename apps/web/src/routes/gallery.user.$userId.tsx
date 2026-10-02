import { createFileRoute, Link } from "@tanstack/react-router";
import { usePaginatedQuery, useQuery } from "convex/react";
import BrickAvatar from "@/components/ui/brick-avatar";
import { defaultAvatar } from "@clik/avatars";
import { Box } from "lucide-react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { Button } from "@/components/ui/button";
import PublicCreationCard from "@/components/clik/public-creation-card";
import GallerySortSelect, {
  validateGallerySearch,
} from "@/components/clik/gallery-sort";

export const Route = createFileRoute("/gallery/user/$userId")({
  validateSearch: validateGallerySearch,
  component: CreatorPage,
  head: () => ({ meta: [{ title: "Galerie du créateur — Clik" }] }),
  errorComponent: () => (
    <main className="collection-page empty-state">
      <h1>Cette galerie n’a pas pu être chargée.</h1>
      <p>Réessayez dans un instant.</p>
      <Link to="/gallery" className="primary-link">
        Retour à la galerie
      </Link>
    </main>
  ),
});
function CreatorPage() {
  const { userId } = Route.useParams();
  return <CreatorGallery key={userId} userId={userId} />;
}
function CreatorGallery({ userId }: { userId: string }) {
  const { sort = "recent" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const creator = useQuery(api.projects.creator, { userId });
  const { results, status, loadMore } = usePaginatedQuery(
    api.projects.gallery,
    creator ? { ownerId: userId, sort } : "skip",
    { initialNumItems: 12 },
  );
  return (
    <main className="collection-page creator-page">
      {creator === undefined ? (
        <div className="empty-state" role="status">
          Chargement du créateur…
        </div>
      ) : !creator ? (
        <div className="empty-state">
          <h1>Utilisateur introuvable.</h1>
          <p>Ce compte n’existe pas ou n’est plus disponible.</p>
        </div>
      ) : (
        <>
          <div className="page-heading creator-heading">
            <div className="creator-avatar">
              <BrickAvatar
                avatar={creator.avatar ?? defaultAvatar(creator.id)}
                size={96}
                label={`Avatar de ${creator.name}`}
              />
            </div>
            <div className="creator-identity">
              <span className="eyebrow">Un univers à découvrir</span>
              <h1>
                {creator.name}
                <span>.</span>
              </h1>
              <p>Ses idées prennent forme. Explorez ses créations publiques.</p>
            </div>
          </div>
          <div className="collection-meta">
            <span>Créations publiques</span>
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
            <div className="empty-state" role="status">
              Chargement des créations…
            </div>
          ) : !results.length ? (
            <div className="creator-empty empty-state">
              <Box size={34} aria-hidden="true" />
              <h2>Aucune création publique pour le moment.</h2>
              <p>Les prochaines créations publiées apparaîtront ici.</p>
            </div>
          ) : (
            <div className="creation-grid">
              {results.map((creation) => (
                <PublicCreationCard key={creation._id} creation={creation} />
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
          {status === "LoadingMore" && (
            <p className="load-more" role="status">
              Chargement…
            </p>
          )}
        </>
      )}
    </main>
  );
}
