import { cn } from "@/lib/utils";
import { loadPublic } from "@/lib/seo/public-data";
import { seo, absolute, breadcrumbs } from "@/lib/seo/meta";
import {
  usePublicPagination,
  continuationHref,
} from "@/lib/clik/use-public-pagination";
import PublicMore from "@/components/clik/public-more";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import BrickAvatar from "@/components/ui/brick-avatar";
import { defaultAvatar } from "@clik/avatars";
import { Box } from "lucide-react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import PublicCreationCard from "@/components/clik/public-creation-card";
import GallerySortSelect, {
  validateGallerySearch,
} from "@/components/clik/gallery-sort";

export const Route = createFileRoute("/gallery/user/$userId")({
  validateSearch: validateGallerySearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    const data = await loadPublic({
      kind: "creator",
      userId: params.userId,
      ...deps,
    });
    if (!data.creator) throw notFound();
    return data;
  },
  component: CreatorPage,
  head: ({ loaderData, params, match }) => {
    const name = loaderData?.creator?.name || "Créateur introuvable",
      path = `/gallery/user/${encodeURIComponent(params.userId)}`;
    return seo({
      title: `Les créations de ${name}`,
      text: `Découvrez les constructions en briques 3D de ${name} sur Clik. Explorez ses créations publiques et imaginez votre propre version.`,
      path,
      noindex: !loaderData?.gallery.page.length || !!match.search.cursor,
      schema: [
        {
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          url: absolute(path),
          mainEntity: { "@type": "Person", name, url: absolute(path) },
        },
        breadcrumbs([
          { name: "La galerie", path: "/gallery" },
          { name, path },
        ]),
      ],
    });
  },
  errorComponent: () => (
    <main
      className={cn(
        "collection-page empty-state px-[25px] py-[70px] gap-[20px] min-h-[300px] flex flex-col items-center justify-center text-center text-[color:#7d8ba0] [&_h1]:text-[color:#32445f] [&_h1]:[font-size:24px] [&_h1]:font-[700] [&_h2]:text-[color:#32445f] [&_h2]:[font-size:24px] [&_h2]:font-[700] [&_p]:max-w-[510px] [&_p]:leading-[1.8] px-[5%] py-[64px] m-[auto] max-w-[1320px] [@media(width<=850px)]:pt-[40px]",
      )}
    >
      <h1>Cette galerie n’a pas pu être chargée.</h1>
      <p>Réessayez dans un instant.</p>
      <Link
        to="/gallery"
        className={cn(
          "primary-link group/primary-link px-[19px] py-[12px] gap-[10px] inline-flex items-center justify-center bg-[#356ae6] text-[color:#fff] rounded-[9px] [font-size:14px] font-[650] whitespace-nowrap [&:hover]:bg-[#2458ce]",
        )}
      >
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
  const { sort = "recent", cursor } = Route.useSearch();
  const navigate = Route.useNavigate();
  const initial = Route.useLoaderData();
  const liveCreator = useQuery(api.projects.creator, { userId });
  const creator = liveCreator === undefined ? initial.creator : liveCreator;
  const { results, status, loadMore, nextCursor } = usePublicPagination(
    api.projects.gallery,
    creator ? { ownerId: userId, sort } : "skip",
    initial.gallery,
    cursor,
  );
  return (
    <main
      className={cn(
        "collection-page creator-page [&_[class~='group/collection-meta']]:gap-[16px] [&_[class~='group/collection-meta']]:items-center [&_[class~='group/collection-meta']]:flex-wrap [@media(width<=640px)]:[&_[class~='group/collection-meta']]:gap-[8px] [@media(width<=640px)]:[&_[class~='group/collection-meta']]:items-start [@media(width<=640px)]:[&_[class~='group/collection-meta']]:flex-col [&_>_[class~='group/back-link']]:mb-[32px] px-[5%] py-[64px] m-[auto] max-w-[1320px] [@media(width<=850px)]:pt-[40px]",
      )}
    >
      {creator === undefined ? (
        <div
          className={cn(
            "empty-state px-[25px] py-[70px] gap-[20px] min-h-[300px] flex flex-col items-center justify-center text-center text-[color:#7d8ba0] [&_h1]:text-[color:#32445f] [&_h1]:[font-size:24px] [&_h1]:font-[700] [&_h2]:text-[color:#32445f] [&_h2]:[font-size:24px] [&_h2]:font-[700] [&_p]:max-w-[510px] [&_p]:leading-[1.8]",
          )}
          role="status"
        >
          Chargement du créateur…
        </div>
      ) : !creator ? (
        <div
          className={cn(
            "empty-state px-[25px] py-[70px] gap-[20px] min-h-[300px] flex flex-col items-center justify-center text-center text-[color:#7d8ba0] [&_h1]:text-[color:#32445f] [&_h1]:[font-size:24px] [&_h1]:font-[700] [&_h2]:text-[color:#32445f] [&_h2]:[font-size:24px] [&_h2]:font-[700] [&_p]:max-w-[510px] [&_p]:leading-[1.8]",
          )}
        >
          <h1>Utilisateur introuvable.</h1>
          <p>Ce compte n’existe pas ou n’est plus disponible.</p>
        </div>
      ) : (
        <>
          <div
            className={cn(
              "page-heading creator-heading group/page-heading gap-[25px] flex justify-between items-center mb-[45px] [@media(width<=850px)]:items-start [@media(width<=850px)]:flex-col [&_h1]:mx-[0] [&_h1]:my-[12px] [&_h1]:[font-size:48px] [&_h1]:tracking-[-2px] [&_h1]:font-[800] [@media(width<=850px)]:[&_h1]:[font-size:40px] [&_h1_>_span]:text-[color:#356ae6] [&_p]:text-[color:#7b889b] [&_p]:[font-size:15px] gap-[24px] justify-start [@media(width<=640px)]:gap-[18px] [@media(width<=640px)]:items-start",
            )}
          >
            <div
              className={cn(
                "creator-avatar overflow-hidden grid [place-items:center] flex-[0_0_96px] w-[96px] h-[96px] rounded-[16px] bg-[#f1f5fc] text-[color:#356ae6] [font-size:38px] font-[750] [@media(width<=640px)]:w-[72px] [@media(width<=640px)]:h-[72px] [@media(width<=640px)]:rounded-[12px] [@media(width<=640px)]:[font-size:30px] [@media(width<=640px)]:basis-[72px] [&_[class~='group/brick-avatar']]:w-[100%] [&_[class~='group/brick-avatar']]:h-[100%] [&_[class~='group/brick-avatar']]:object-cover",
              )}
            >
              <BrickAvatar
                avatar={creator.avatar ?? defaultAvatar(creator.id)}
                size={96}
                label={`Avatar de ${creator.name}`}
              />
            </div>
            <div
              className={cn(
                "creator-identity min-w-[0] [&_h1]:[overflow-wrap:anywhere] [&_h1]:mb-[0]",
              )}
            >
              <h1>
                {creator.name}
                <span>.</span>
              </h1>
              <p>Ses idées prennent forme. Explorez ses créations publiques.</p>
            </div>
          </div>
          <div
            className={cn(
              "collection-meta group/collection-meta px-[0] py-[22px] flex justify-between [border-top-width:1px] [border-top-style:solid] [border-top-color:#e0e6ef] [font-size:13px] text-[color:#8090a6] [&_>_span:first-child]:text-[color:#3b4b65] [&_>_span:first-child]:font-[650]",
            )}
          >
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
            <div
              className={cn(
                "empty-state px-[25px] py-[70px] gap-[20px] min-h-[300px] flex flex-col items-center justify-center text-center text-[color:#7d8ba0] [&_h1]:text-[color:#32445f] [&_h1]:[font-size:24px] [&_h1]:font-[700] [&_h2]:text-[color:#32445f] [&_h2]:[font-size:24px] [&_h2]:font-[700] [&_p]:max-w-[510px] [&_p]:leading-[1.8]",
              )}
              role="status"
            >
              Chargement des créations…
            </div>
          ) : !results.length ? (
            <div
              className={cn(
                "creator-empty empty-state [&_>_svg]:mx-[auto] [&_>_svg]:mt-[0] [&_>_svg]:mb-[18px] [&_>_svg]:text-[color:#91a3be] px-[25px] py-[70px] gap-[20px] min-h-[300px] flex flex-col items-center justify-center text-center text-[color:#7d8ba0] [&_h1]:text-[color:#32445f] [&_h1]:[font-size:24px] [&_h1]:font-[700] [&_h2]:text-[color:#32445f] [&_h2]:[font-size:24px] [&_h2]:font-[700] [&_p]:max-w-[510px] [&_p]:leading-[1.8]",
              )}
            >
              <Box size={34} aria-hidden="true" />
              <h2>Aucune création publique pour le moment.</h2>
              <p>Les prochaines créations publiées apparaîtront ici.</p>
            </div>
          ) : (
            <div
              className={cn(
                "creation-grid group/creation-grid gap-[26px] grid grid-cols-[repeat(3,_1fr)] [@media(width<=520px)]:gap-[15px] [@media(width<=520px)]:grid-cols-[1fr] [@media(520px<width<=850px)]:gap-[15px] [@media(520px<width<=850px)]:grid-cols-[repeat(2,_1fr)]",
              )}
            >
              {results.map((creation) => (
                <PublicCreationCard key={creation._id} creation={creation} />
              ))}
            </div>
          )}
          {status === "CanLoadMore" && (
            <PublicMore
              className={cn(
                "load-more group/load-more mx-[auto] my-[35px] block",
              )}
              href={continuationHref(
                `/gallery/user/${encodeURIComponent(userId)}`,
                nextCursor,
                { sort },
              )}
              loading={false}
              onMore={() => loadMore(12)}
            >
              Voir plus de créations
            </PublicMore>
          )}
          {status === "LoadingMore" && (
            <p
              className={cn(
                "load-more group/load-more mx-[auto] my-[35px] block",
              )}
              role="status"
            >
              Chargement…
            </p>
          )}
        </>
      )}
    </main>
  );
}
