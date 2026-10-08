import { createFileRoute, Link } from "@tanstack/react-router";
import { loadPublic } from "@/lib/seo/public-data";
import { seo, collection } from "@/lib/seo/meta";
import {
  usePublicPagination,
  continuationHref,
} from "@/lib/clik/use-public-pagination";
import PublicMore from "@/components/clik/public-more";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { ArrowRight, GitBranch, Plus } from "lucide-react";
import GallerySortSelect, {
  validateGallerySearch,
} from "@/components/clik/gallery-sort";
import PublicCreationCard from "@/components/clik/public-creation-card";
import GalleryArt from "@/components/clik/gallery-art";

export const Route = createFileRoute("/gallery/")({
  validateSearch: validateGallerySearch,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => loadPublic({ kind: "gallery", ...deps }),
  head: ({ match, loaderData }) =>
    seo({
      title: "La galerie de constructions 3D",
      text: "Explorez les créations en briques 3D de la communauté Clik. Découvrez leurs auteurs et construisez votre propre version dans l’atelier en ligne.",
      path: "/gallery",
      noindex: !!match.search.cursor || !loaderData,
      schema: collection("La galerie", "/gallery"),
    }),
  component: Gallery,
});
function Gallery() {
  const { sort = "recent", cursor } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { results, status, loadMore, nextCursor } = usePublicPagination(
    api.projects.gallery,
    { sort },
    Route.useLoaderData(),
    cursor,
  );
  return (
    <main className="collection-page gallery-page px-[5%] py-16 m-auto max-w-330 [@media(width<=850px)]:pt-10">
      <header className="gallery-hero gap-8 grid grid-cols-[1.2fr_1fr] items-start pb-10 [@media(width<=640px)]:px-0 [@media(width<=640px)]:block [@media(width<=640px)]:pb-7 [@media(width<=640px)]:relative [@media(width<=640px)]:pt-0">
        <div className="gallery-hero-copy">
          <h1 className="mx-0 my-3 text-5xl leading-[inherit] tracking-[-2px] font-extrabold [@media(width<=850px)]:text-[40px]">
            La galerie<span className="text-[#356ae6]">.</span>
          </h1>
          <p className="mx-0 mt-5 mb-6.25 max-w-110 text-[#71839c] text-[15px] leading-[1.8] [@media(width<=640px)]:max-w-85 [@media(width<=640px)]:text-sm">
            De petites briques, de grandes idées.
            <br />
            Explorez les constructions de la communauté et imaginez la suite.
          </p>
          <Link
            to="/editor"
            className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 primary-link group/primary-link px-4.75 py-3 gap-2.5 inline-flex items-center justify-center bg-[#356ae6] text-white rounded-[9px] text-sm font-[650] whitespace-nowrap hover:bg-[#2458ce] leading-normal"
          >
            <Plus className="shrink-0" size={17} aria-hidden="true" /> À vous de
            créer
          </Link>
        </div>
        <GalleryArt />
      </header>
      <section aria-labelledby="gallery-creations-title">
        <div className="gallery-toolbar px-0 py-6.25 gap-5 flex items-center justify-between flex-wrap border-t border-solid border-t-[#e0e6ef] [@media(width<=640px)]:gap-4 [@media(width<=640px)]:items-start">
          <div>
            <h2
              className="text-xl leading-[inherit] font-[750] tracking-[-0.5px]"
              id="gallery-creations-title"
            >
              À découvrir
            </h2>
            <p className="mt-1.25 text-xs leading-[1.7] text-[#71839c]">
              Ouvrez une création, laissez un mot, faites-en votre version.
            </p>
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
            <div
              className="creation-grid group/creation-grid gap-6.5 grid grid-cols-3 [@media(width<=520px)]:gap-3.75 [@media(width<=520px)]:grid-cols-1 [@media(520px<width<=850px)]:gap-3.75 [@media(520px<width<=850px)]:grid-cols-2"
              aria-hidden="true"
            >
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="gallery-skeleton overflow-hidden border border-solid border-[#e4eaf2] pb-5.5 rounded-[14px] bg-white"
                >
                  <div className="aspect-4/3 bg-[#eef2f8]" />
                  <span className="mx-5 block w-3/5 h-3.5 mt-4.5 mb-0 bg-[#eef2f8] rounded-[4px] last:w-[35%] last:h-2.5 last:mt-3" />
                  <span className="mx-5 block w-3/5 h-3.5 mt-4.5 mb-0 bg-[#eef2f8] rounded-[4px] last:w-[35%] last:h-2.5 last:mt-3" />
                </div>
              ))}
            </div>
          </div>
        ) : !results.length ? (
          <div className="empty-state gallery-empty px-6.25 py-17.5 gap-5 min-h-75 flex flex-col items-center justify-center text-center text-[#7d8ba0] border border-dashed border-[#cfdaec] rounded-2xl bg-[#f3f6fc]">
            <h2 className="text-[#32445f] text-2xl leading-[inherit] font-bold">
              La première idée pourrait être la vôtre.
            </h2>
            <p className="max-w-127.5 leading-[1.8]">
              Publiez une création depuis l’atelier pour ouvrir la galerie.
            </p>
            <Link
              to="/editor"
              className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 primary-link group/primary-link px-4.75 py-3 gap-2.5 inline-flex items-center justify-center bg-[#356ae6] text-white rounded-[9px] text-sm font-[650] whitespace-nowrap hover:bg-[#2458ce] leading-normal"
            >
              Ouvrir l’atelier
            </Link>
          </div>
        ) : (
          <div className="creation-grid group/creation-grid gap-6.5 grid grid-cols-3 [@media(width<=520px)]:gap-3.75 [@media(width<=520px)]:grid-cols-1 [@media(520px<width<=850px)]:gap-3.75 [@media(520px<width<=850px)]:grid-cols-2">
            {results.map((p) => (
              <PublicCreationCard key={p._id} creation={p} />
            ))}
          </div>
        )}
        {!!results.length && (
          <div className="gallery-pagination gap-3.5 flex flex-col items-center mt-7 text-[#71839c] text-xs leading-[inherit]">
            <p role="status">
              {results.length} création{results.length === 1 ? "" : "s"}{" "}
              affichée{results.length === 1 ? "" : "s"}
            </p>
            {(status === "CanLoadMore" || status === "LoadingMore") && (
              <PublicMore
                href={continuationHref("/gallery", nextCursor, { sort })}
                loading={status === "LoadingMore"}
                onMore={() => loadMore(12)}
              >
                {status === "LoadingMore"
                  ? "Chargement…"
                  : "Voir plus de créations"}
                <Plus
                  className="size-4 pointer-events-none shrink-0"
                  size={15}
                  aria-hidden="true"
                />
              </PublicMore>
            )}
          </div>
        )}
      </section>
      <aside className="gallery-remix-note p-6 gap-4.5 flex items-center mt-12 bg-[#edf2fa] rounded-2xl [@media(width<=640px)]:p-5 [@media(width<=640px)]:gap-3 [@media(width<=640px)]:flex-wrap">
        <span className="gallery-remix-icon grid place-items-center shrink-0 rounded-[12px] bg-white text-[#356ae6] size-11">
          <GitBranch size={22} aria-hidden="true" />
        </span>
        <div className="[@media(width<=640px)]:flex-1 [@media(width<=640px)]:min-w-45">
          <h2 className="text-[15px] font-bold">
            Une création, mille possibilités.
          </h2>
          <p className="mt-1.25 text-xs leading-[1.7] text-[#71839c]">
            Chaque création publique peut devenir le point de départ de la
            vôtre. Son auteur reste crédité.
          </p>
        </div>
        <Link
          className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 gap-2 inline-flex items-center shrink-0 ml-auto text-[#356ae6] text-xs font-[650] [@media(width<=640px)]:ml-14 hover:underline hover:underline-offset-4 leading-normal"
          to="/editor"
        >
          Faire le premier clik <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </aside>
    </main>
  );
}
