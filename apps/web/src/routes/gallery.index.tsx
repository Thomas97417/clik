import { cn } from "@/lib/utils";
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
    <main
      className={cn(
        "collection-page gallery-page px-[5%] py-[64px] m-[auto] max-w-[1320px] [@media(width<=850px)]:pt-[40px]",
      )}
    >
      <header
        className={cn(
          "gallery-hero [&_h1]:mx-[0] [&_h1]:my-[12px] [&_h1]:[font-size:48px] [&_h1]:tracking-[-2px] [&_h1]:font-[800] [@media(width<=850px)]:[&_h1]:[font-size:40px] [&_h1_>_span]:text-[color:#356ae6] gap-[32px] grid grid-cols-[1.2fr_1fr] [align-items:start] pb-[40px] [@media(width<=640px)]:px-[0] [@media(width<=640px)]:block [@media(width<=640px)]:pb-[28px] [@media(width<=640px)]:relative [@media(width<=640px)]:pt-[0]",
        )}
      >
        <div
          className={cn(
            "gallery-hero-copy [&_>_p]:mx-[0] [&_>_p]:mt-[20px] [&_>_p]:mb-[25px] [&_>_p]:max-w-[440px] [&_>_p]:text-[color:#71839c] [&_>_p]:[font-size:15px] [&_>_p]:leading-[1.8] [@media(width<=640px)]:[&_>_p]:max-w-[340px] [@media(width<=640px)]:[&_>_p]:[font-size:14px]",
          )}
        >
          <h1>
            La galerie<span>.</span>
          </h1>
          <p>
            De petites briques, de grandes idées.
            <br />
            Explorez les constructions de la communauté et imaginez la suite.
          </p>
          <Link
            to="/editor"
            className={cn(
              "primary-link group/primary-link px-[19px] py-[12px] gap-[10px] inline-flex items-center justify-center bg-[#356ae6] text-[color:#fff] rounded-[9px] [font-size:14px] font-[650] whitespace-nowrap [&:hover]:bg-[#2458ce]",
            )}
          >
            <Plus size={17} aria-hidden="true" /> À vous de créer
          </Link>
        </div>
        <GalleryArt />
      </header>
      <section aria-labelledby="gallery-creations-title">
        <div
          className={cn(
            "gallery-toolbar px-[0] py-[25px] gap-[20px] flex items-center justify-between flex-wrap [border-top-width:1px] [border-top-style:solid] [border-top-color:#e0e6ef] [@media(width<=640px)]:gap-[16px] [@media(width<=640px)]:items-start [&_h2]:[font-size:20px] [&_h2]:font-[750] [&_h2]:tracking-[-0.5px] [&_p]:mt-[5px] [&_p]:[font-size:12px] [&_p]:leading-[1.7] [&_p]:text-[color:#71839c]",
          )}
        >
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
            <div
              className={cn(
                "creation-grid group/creation-grid gap-[26px] grid grid-cols-[repeat(3,_1fr)] [@media(width<=520px)]:gap-[15px] [@media(width<=520px)]:grid-cols-[1fr] [@media(520px<width<=850px)]:gap-[15px] [@media(520px<width<=850px)]:grid-cols-[repeat(2,_1fr)]",
              )}
              aria-hidden="true"
            >
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    "gallery-skeleton overflow-hidden border-[length:1px] border-solid border-[color:#e4eaf2] pb-[22px] rounded-[14px] bg-[#fff] [&_>_div]:[aspect-ratio:4/3] [&_>_div]:bg-[#eef2f8] [&_>_span]:mx-[20px] [&_>_span]:block [&_>_span]:w-[60%] [&_>_span]:h-[14px] [&_>_span]:mt-[18px] [&_>_span]:mb-[0] [&_>_span]:bg-[#eef2f8] [&_>_span]:rounded-[4px] [&_>_span:last-child]:w-[35%] [&_>_span:last-child]:h-[10px] [&_>_span:last-child]:mt-[12px]",
                  )}
                >
                  <div />
                  <span />
                  <span />
                </div>
              ))}
            </div>
          </div>
        ) : !results.length ? (
          <div
            className={cn(
              "empty-state gallery-empty px-[25px] py-[70px] gap-[20px] min-h-[300px] flex flex-col items-center justify-center text-center text-[color:#7d8ba0] [&_h1]:text-[color:#32445f] [&_h1]:[font-size:24px] [&_h1]:font-[700] [&_h2]:text-[color:#32445f] [&_h2]:[font-size:24px] [&_h2]:font-[700] [&_p]:max-w-[510px] [&_p]:leading-[1.8] border-[length:1px] border-dashed border-[color:#cfdaec] rounded-[16px] bg-[#f3f6fc]",
            )}
          >
            <h2>La première idée pourrait être la vôtre.</h2>
            <p>Publiez une création depuis l’atelier pour ouvrir la galerie.</p>
            <Link
              to="/editor"
              className={cn(
                "primary-link group/primary-link px-[19px] py-[12px] gap-[10px] inline-flex items-center justify-center bg-[#356ae6] text-[color:#fff] rounded-[9px] [font-size:14px] font-[650] whitespace-nowrap [&:hover]:bg-[#2458ce]",
              )}
            >
              Ouvrir l’atelier
            </Link>
          </div>
        ) : (
          <div
            className={cn(
              "creation-grid group/creation-grid gap-[26px] grid grid-cols-[repeat(3,_1fr)] [@media(width<=520px)]:gap-[15px] [@media(width<=520px)]:grid-cols-[1fr] [@media(520px<width<=850px)]:gap-[15px] [@media(520px<width<=850px)]:grid-cols-[repeat(2,_1fr)]",
            )}
          >
            {results.map((p) => (
              <PublicCreationCard key={p._id} creation={p} />
            ))}
          </div>
        )}
        {!!results.length && (
          <div
            className={cn(
              "gallery-pagination gap-[14px] flex flex-col items-center mt-[28px] text-[color:#71839c] [font-size:12px] [&_button]:px-[18px] [&_button]:py-[10px] [&_button]:gap-[10px] [&_button]:min-h-[42px] [&_button]:rounded-[10px] [&_button]:bg-[#fff] [&_button]:text-[color:#455f83]",
            )}
          >
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
                <Plus size={15} aria-hidden="true" />
              </PublicMore>
            )}
          </div>
        )}
      </section>
      <aside
        className={cn(
          "gallery-remix-note p-[24px] gap-[18px] flex items-center mt-[48px] bg-[#edf2fa] rounded-[16px] [@media(width<=640px)]:p-[20px] [@media(width<=640px)]:gap-[12px] [@media(width<=640px)]:flex-wrap [&_h2]:[font-size:15px] [&_h2]:font-[700] [&_p]:mt-[5px] [&_p]:[font-size:12px] [&_p]:leading-[1.7] [&_p]:text-[color:#71839c] [&_>_a]:gap-[8px] [&_>_a]:inline-flex [&_>_a]:items-center [&_>_a]:shrink-[0] [&_>_a]:ml-[auto] [&_>_a]:text-[color:#356ae6] [&_>_a]:[font-size:12px] [&_>_a]:font-[650] [@media(width<=640px)]:[&_>_a]:ml-[56px] [&_>_a:hover]:[text-decoration:underline] [&_>_a:hover]:underline-offset-[4px] [@media(width<=640px)]:[&_>_div]:flex-[1] [@media(width<=640px)]:[&_>_div]:min-w-[180px]",
        )}
      >
        <span
          className={cn(
            "gallery-remix-icon grid [place-items:center] shrink-[0] w-[44px] h-[44px] rounded-[12px] bg-[#fff] text-[color:#356ae6]",
          )}
        >
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
