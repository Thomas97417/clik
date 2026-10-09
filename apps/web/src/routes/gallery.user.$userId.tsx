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
import CreationGridSkeleton from "@/components/clik/creation-grid-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
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
  pendingComponent: () => <CreatorPage pending />,
  codeSplitGroupings: [["component", "pendingComponent"]],
  pendingMs: 0,
  pendingMinMs: 0,
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
    <main className="collection-page empty-state gap-5 min-h-75 flex flex-col items-center justify-center text-center text-[#7d8ba0] px-[5%] py-16 m-auto max-w-330 max-lg-narrow:pt-10">
      <h1 className="text-[#32445f] text-2xl leading-[inherit] font-bold">
        Cette galerie n’a pas pu être chargée.
      </h1>
      <p className="max-w-127.5 leading-[1.8]">Réessayez dans un instant.</p>
      <Link
        to="/gallery"
        className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 primary-link group/primary-link px-4.75 py-3 gap-2.5 inline-flex items-center justify-center bg-[#356ae6] text-white rounded-[9px] text-sm font-[650] whitespace-nowrap hover:bg-[#2458ce] leading-normal"
      >
        Retour à la galerie
      </Link>
    </main>
  ),
});
function CreatorPage({ pending = false }: { pending?: boolean } = {}) {
  const { userId } = Route.useParams();
  return <CreatorGallery key={userId} userId={userId} pending={pending} />;
}
function CreatorGallery({
  userId,
  pending,
}: {
  userId: string;
  pending: boolean;
}) {
  const { sort = "recent", cursor } = Route.useSearch();
  const navigate = Route.useNavigate();
  const initial = Route.useLoaderData();
  const liveCreator = useQuery(
    api.projects.creator,
    pending ? "skip" : { userId },
  );
  const creator = pending
    ? undefined
    : liveCreator === undefined
      ? initial.creator
      : liveCreator;
  const { results, status, loadMore, nextCursor } = usePublicPagination(
    api.projects.gallery,
    creator ? { ownerId: userId, sort } : "skip",
    pending ? undefined : initial.gallery,
    cursor,
  );
  return (
    <main className="collection-page creator-page px-[5%] py-16 m-auto max-w-330 max-lg-narrow:pt-10">
      {creator === null ? (
        <div className="empty-state px-6.25 py-17.5 gap-5 min-h-75 flex flex-col items-center justify-center text-center text-[#7d8ba0]">
          <h1 className="text-[#32445f] text-2xl leading-[inherit] font-bold">
            Utilisateur introuvable.
          </h1>
          <p className="max-w-127.5 leading-[1.8]">
            Ce compte n’existe pas ou n’est plus disponible.
          </p>
        </div>
      ) : (
        <>
          <div className="page-heading creator-heading group/page-heading flex items-center mb-11.25 max-lg-narrow:items-start max-lg-narrow:flex-col gap-6 justify-start max-sm:gap-4.5 max-sm:items-start">
            <div className="creator-avatar overflow-hidden grid place-items-center flex-[0_0_96px] rounded-2xl bg-[#f1f5fc] text-[#356ae6] text-[38px] font-[750] max-sm:rounded-[12px] max-sm:text-3xl max-sm:leading-[inherit] max-sm:basis-18 size-24 max-sm:size-18">
              {creator ? (
                <BrickAvatar
                  className="object-cover size-full"
                  avatar={creator.avatar ?? defaultAvatar(creator.id)}
                  size={96}
                  label={`Avatar de ${creator.name}`}
                />
              ) : (
                <Skeleton className="size-full" aria-hidden="true" />
              )}
            </div>
            <div className="creator-identity min-w-0 max-w-full">
              <h1 className="mx-0 my-3 text-5xl leading-[inherit] tracking-[-2px] font-extrabold max-lg-narrow:text-[40px] wrap-anywhere mb-0">
                {creator ? (
                  <>
                    {creator.name}
                    <span className="text-[#356ae6]">.</span>
                  </>
                ) : (
                  <>
                    <span className="sr-only">La galerie du créateur</span>
                    <Skeleton
                      className="h-14 w-64 max-w-full rounded-[6px] max-lg-narrow:h-12"
                      aria-hidden="true"
                    />
                  </>
                )}
              </h1>
              <p className="text-[#7b889b] text-[15px]">
                Ses idées prennent forme. Explorez ses créations publiques.
              </p>
            </div>
          </div>
          <div className="collection-meta group/collection-meta px-0 py-5.5 flex justify-between border-t border-solid border-t-[#e0e6ef] text-[13px] text-[#8090a6] gap-4 items-center flex-wrap max-sm:gap-2 max-sm:items-start max-sm:flex-col">
            <span className="first:text-[#3b4b65] first:font-[650]">
              Créations publiques
            </span>
            <GallerySortSelect
              disabled={pending}
              value={sort}
              onValueChange={(value) => {
                void navigate({
                  search: { sort: value === "recent" ? undefined : value },
                  resetScroll: false,
                });
              }}
            />
          </div>
          {pending || status === "LoadingFirstPage" ? (
            <CreationGridSkeleton />
          ) : !results.length ? (
            <div className="creator-empty empty-state px-6.25 py-17.5 gap-5 min-h-75 flex flex-col items-center justify-center text-center text-[#7d8ba0]">
              <Box
                className="mx-auto mt-0 mb-4.5 text-[#91a3be]"
                size={34}
                aria-hidden="true"
              />
              <h2 className="text-[#32445f] text-2xl leading-[inherit] font-bold">
                Aucune création publique pour le moment.
              </h2>
              <p className="max-w-127.5 leading-[1.8]">
                Les prochaines créations publiées apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="creation-grid group/creation-grid gap-6.5 grid grid-cols-3 max-sm-narrow:gap-3.75 max-sm-narrow:grid-cols-1 min-sm-narrow:max-lg-narrow:gap-3.75 min-sm-narrow:max-lg-narrow:grid-cols-2">
              {results.map((creation) => (
                <PublicCreationCard key={creation._id} creation={creation} />
              ))}
            </div>
          )}
          {status === "CanLoadMore" && (
            <PublicMore
              className="load-more group/load-more mx-auto my-8.75 block"
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
              className="load-more group/load-more mx-auto my-8.75 block"
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
