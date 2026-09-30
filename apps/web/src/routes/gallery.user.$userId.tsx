import { createFileRoute, Link } from "@tanstack/react-router";
import { usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { ArrowLeft, Box } from "lucide-react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { Button } from "@/components/ui/button";
import PublicCreationCard from "@/components/clik/public-creation-card";

export const Route = createFileRoute("/gallery/user/$userId")({
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
  const creator = useQuery(api.projects.creator, { userId });
  const { results, status, loadMore } = usePaginatedQuery(
    api.projects.gallery,
    creator ? { ownerId: userId } : "skip",
    { initialNumItems: 12 },
  );
  const [failedImage, setFailedImage] = useState<string>();
  return (
    <main className="collection-page creator-page">
      <Link to="/gallery" className="back-link">
        <ArrowLeft size={16} aria-hidden="true" /> La galerie
      </Link>
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
              {creator.imageUrl && creator.imageUrl !== failedImage ? (
                <img
                  src={creator.imageUrl}
                  alt={`Photo de ${creator.name}`}
                  onError={() => setFailedImage(creator.imageUrl!)}
                />
              ) : (
                <span aria-hidden="true">
                  {creator.name.charAt(0).toLocaleUpperCase("fr-FR")}
                </span>
              )}
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
            <span>Les plus récentes</span>
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
          <p className="reuse-note">
            Les créations publiques sont réutilisables dans Clik avec
            attribution.
          </p>
        </>
      )}
    </main>
  );
}
