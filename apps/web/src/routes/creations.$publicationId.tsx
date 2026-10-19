import { loadPublic } from "@/lib/seo/public-data";
import { seo, absolute, breadcrumbs } from "@/lib/seo/meta";
import {
  createFileRoute,
  Link,
  useNavigate,
  notFound,
} from "@tanstack/react-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useMemo, useState } from "react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import type { SceneDocument } from "@clik/scene";
import {
  ArrowLeft,
  ArrowRight,
  Box,
  ChevronRight,
  GitBranch,
  Link2,
  LoaderCircle,
  MousePointer2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Comments from "@/components/challenges/comments";
import { CreationChallenge, SignInTo } from "@/components/challenges/shared";
import AuthorLink from "@/components/clik/author-link";
import ClientScene from "@/components/clik/client-scene";
import CreationRemixes from "@/components/clik/creation-remixes";
import AssemblyBadge from "@/components/clik/assembly-badge";
import { formatDate, formatDateTime } from "@/lib/format-date";
export const Route = createFileRoute("/creations/$publicationId")({
  loader: async ({ params }) => {
    const data = await loadPublic({
      kind: "creation",
      id: params.publicationId,
    });
    if (!data.creation) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    const p = loaderData?.creation,
      path = `/creations/${encodeURIComponent(params.publicationId)}`;
    return seo({
      title: p?.title || "Création indisponible",
      text:
        p?.description ||
        `${p?.title || "Une création"}, une construction en briques 3D par ${p?.author || "la communauté Clik"}. Explorez-la et créez votre propre version.`,
      path,
      image: p?.thumbnailUrl,
      imageWidth: 640,
      imageHeight: 480,
      noindex: !p,
      schema: p
        ? [
            {
              "@context": "https://schema.org",
              "@type": "CreativeWork",
              name: p.title,
              description: p.description,
              url: absolute(path),
              image: p.thumbnailUrl,
              datePublished: new Date(p.createdAt).toISOString(),
              ...(p.updatedAt
                ? { dateModified: new Date(p.updatedAt).toISOString() }
                : {}),
              author: {
                "@type": "Person",
                name: p.author,
                url: absolute(`/gallery/user/${encodeURIComponent(p.owner)}`),
              },
              inLanguage: "fr",
            },
            breadcrumbs([
              { name: "La galerie", path: "/gallery" },
              { name: p.title, path },
            ]),
          ]
        : undefined,
    });
  },
  component: Creation,
});
function Creation() {
  const { publicationId } = Route.useParams();
  return (
    <CreationDetail
      key={publicationId}
      publicationId={publicationId as Id<"publications">}
    />
  );
}
function CreationDetail({
  publicationId,
}: {
  publicationId: Id<"publications">;
}) {
  const navigate = useNavigate(),
    { isAuthenticated } = useConvexAuth();
  const [versionId, setVersionId] = useState<Id<"versions"> | undefined>();
  const initial = Route.useLoaderData();
  const live = useQuery(api.projects.creation, {
      id: publicationId,
      ...(versionId ? { versionId } : {}),
    }),
    remix = useMutation(api.projects.remix),
    [busy, setBusy] = useState(false);
  const p = live === undefined ? initial.creation : live;
  const scene = useMemo(
    () => (p ? (JSON.parse(p.scene) as SceneDocument) : null),
    [p?.scene],
  );
  const parts = useMemo(
    () => scene?.nodes.filter((node) => node.kind === "part") ?? [],
    [scene],
  );
  const colorCount = useMemo(
    () => new Set(parts.map((part) => part.color.toLowerCase())).size,
    [parts],
  );
  if (p && !p.challenge && versionId !== p._id) setVersionId(p._id);
  if (p === undefined)
    return (
      <div
        className="empty-state px-6.25 py-17.5 gap-5 min-h-75 flex flex-col items-center justify-center text-center text-[#7d8ba0]"
        role="status"
      >
        Chargement de la création…
      </div>
    );
  if (!p)
    return (
      <div className="empty-state px-6.25 py-17.5 gap-5 min-h-75 flex flex-col items-center justify-center text-center text-[#7d8ba0]">
        <h1 className="text-[#32445f] text-2xl leading-[inherit] font-bold">
          Cette création n’est plus disponible.
        </h1>
        <p className="max-w-127.5 leading-[1.8]">
          Les reprises déjà enregistrées restent dans les projets de leurs
          auteurs.
        </p>
        <Link
          to="/gallery"
          className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 primary-link group/primary-link px-4.75 py-3 gap-2.5 inline-flex items-center justify-center bg-[#356ae6] text-white rounded-[9px] text-sm font-[650] whitespace-nowrap hover:bg-[#2458ce] leading-normal"
        >
          Retour à la galerie
        </Link>
      </div>
    );
  const createVersion = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const id = await remix({ id: publicationId, versionId: p._id });
      await navigate({
        to: "/editor/$projectId",
        params: { projectId: id },
      });
    } catch (e) {
      toast.error(
        e instanceof ConvexError && typeof e.data === "string"
          ? e.data
          : "Votre version n’a pas pu être créée. Réessayez.",
      );
    } finally {
      setBusy(false);
    }
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        window.location.origin + window.location.pathname,
      );
      toast.success("Lien de la création copié.");
    } catch {
      toast.error(
        "Le lien n’a pas pu être copié. Copiez l’adresse de cette page.",
      );
    }
  };
  return (
    <main className="creation-page mx-auto max-w-340 px-8 pt-7 pb-16 max-sm:px-4 max-sm:pt-5">
      <nav
        className="mb-5 flex min-w-0 items-center gap-3 text-xs text-[#71839c] max-sm:mb-4"
        aria-label="Fil d’Ariane"
      >
        <Link
          to="/gallery"
          className="inline-flex min-h-8 shrink-0 items-center gap-2 rounded-md font-medium transition-colors hover:text-[#356ae6] focus-visible:outline-2 focus-visible:outline-[#356ae6] focus-visible:outline-offset-4"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          La galerie
        </Link>
        <ChevronRight
          className="shrink-0 text-[#b4bfce]"
          size={13}
          aria-hidden="true"
        />
        <span className="truncate text-[#526783]" aria-current="page">
          {p.title}
        </span>
      </nav>

      <article
        className="rounded-[22px] border border-[#e1e7ef] bg-white p-8 shadow-[0_4px_24px_#25354e04] max-lg-narrow:p-6 max-sm:rounded-2xl max-sm:p-4"
        aria-labelledby="creation-title"
      >
        <header className="creation-details mb-7 flex items-center justify-between gap-x-8 gap-y-5 max-lg-narrow:flex-wrap max-sm:mb-5">
          <div className="min-w-0">
            {p.isAssembly && <AssemblyBadge className="mb-3" />}
            <h1
              id="creation-title"
              className="text-[clamp(28px,3vw,40px)] leading-[1.15] font-extrabold tracking-[-1.2px] text-[#202e45] wrap-anywhere"
            >
              {p.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[#71839c]">
              <p className="author min-w-0">
                <AuthorLink
                  id={p.owner}
                  name={p.author}
                  avatar={p.avatar}
                  className="gap-2 text-[13px] text-[#445a78]"
                />
              </p>
              <span
                className="size-0.75 rounded-full bg-[#c5cfdd] max-sm:hidden"
                aria-hidden="true"
              />
              <p className="publication-date max-sm:w-full">
                Publiée le{" "}
                <time dateTime={new Date(p.createdAt).toISOString()}>
                  {formatDate(p.createdAt, "long")}
                </time>
              </p>
            </div>
          </div>
          <div className="creation-page-actions flex shrink-0 flex-wrap items-center gap-2 max-sm:w-full">
            <button
              type="button"
              className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-xs font-medium whitespace-nowrap text-[#526783] transition-colors hover:bg-[#f0f4fa] hover:text-[#356ae6] focus-visible:outline-2 focus-visible:outline-[#356ae6] focus-visible:outline-offset-3 max-sm:flex-1 max-3xs:gap-1.5 max-3xs:px-2 max-3xs:text-[11px]"
              onClick={copyLink}
            >
              <Link2 size={15} aria-hidden="true" />
              Copier le lien
            </button>
          </div>
        </header>

        <div className="creation-layout grid grid-cols-[minmax(0,1fr)_320px] items-start gap-8 max-lg-narrow:grid-cols-1 max-lg-narrow:gap-7 lg-start:max-xl-narrow:grid-cols-[minmax(0,1fr)_280px] lg-start:max-xl-narrow:gap-6">
          <div className="creation-preview-panel min-w-0">
            <div
              className="public-scene relative h-130 overflow-hidden rounded-xl border border-[#e4eaf2] bg-[#edf1f7] max-sm-narrow:h-80 min-sm-narrow:max-lg-narrow:h-112"
              role="region"
              aria-label={`Aperçu 3D de ${p.title}`}
            >
              <ClientScene
                scene={scene!}
                showGrid={false}
                showViewControls
                poster={p.thumbnailUrl}
                title={p.title}
              />
              <span
                className="pointer-events-none absolute top-4 left-4 inline-flex items-center gap-2 text-[11px] font-medium text-[#647995] max-sm:top-3 max-sm:left-3"
                aria-hidden="true"
              >
                <Box size={15} />
                Vue 3D interactive
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[11px] leading-relaxed text-[#71839c]">
              <p className="creation-view-hint flex items-center gap-1.5">
                <MousePointer2
                  className="shrink-0"
                  size={13}
                  aria-hidden="true"
                />
                Glissez pour explorer
                <span className="creation-view-hint-zoom max-sm:hidden">
                  · Défilez pour zoomer
                </span>
              </p>
              {parts.length > 0 && (
                <p className="creation-facts tabular-nums">
                  {parts.length} pièce{parts.length === 1 ? "" : "s"}
                  <span className="mx-2 text-[#bac5d4]" aria-hidden="true">
                    /
                  </span>
                  {colorCount} couleur{colorCount === 1 ? "" : "s"}
                </p>
              )}
            </div>
          </div>

          <aside className="creation-sidebar min-w-0">
            {p.description && (
              <section
                aria-labelledby="creation-description-title"
                className="mb-6"
              >
                <h2
                  id="creation-description-title"
                  className="mb-3 text-sm font-semibold tracking-[-0.2px] text-[#263b58]"
                >
                  À propos de cette création
                </h2>
                <p className="description text-[14px] leading-[1.85] whitespace-pre-wrap text-[#63758f] wrap-anywhere">
                  {p.description}
                </p>
              </section>
            )}
            {!!p.sources?.length ? (
              <div className="creation-source-list mb-6 text-xs leading-[1.7] text-[#71839c]">
                <p className="gap-1.75 flex items-center font-[650]">
                  <GitBranch size={15} aria-hidden="true" />
                  {p.isAssembly ? "Sources de l’assemblage" : "À partir de"}
                </p>
                <ul className="gap-1.5 grid mt-2.25 wrap-anywhere">
                  {p.sources.map((source) => (
                    <li key={source.publicationId}>
                      {source.available ? (
                        <Link
                          className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 text-[#356ae6] hover:underline hover:underline-offset-3"
                          to="/creations/$publicationId"
                          params={{ publicationId: source.publicationId }}
                        >
                          « {source.title} »
                        </Link>
                      ) : (
                        <span>« {source.title} »</span>
                      )}
                      <span> par {source.author}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              p.origin && (
                <p className="attribution mb-6 flex items-start gap-2 text-xs leading-[1.7] text-[#71839c] wrap-anywhere">
                  <GitBranch
                    className="shrink-0 mt-0.5"
                    size={16}
                    aria-hidden="true"
                  />
                  <span>
                    D’après « {p.origin.title} » de {p.origin.author}.
                  </span>
                </p>
              )
            )}
            {p.challenge &&
              p.updatedAt &&
              p.submittedAt &&
              p.updatedAt > p.submittedAt && (
                <p className="mb-6 text-[11px] leading-relaxed text-[#8190a5]">
                  Mise à jour le {formatDateTime(p.updatedAt)}. Les votes sont
                  conservés.
                </p>
              )}
            <div className="creation-fork border-t border-[#e8edf3] pt-6 first:border-t-0 first:pt-0">
              <div className="creation-fork-heading mb-4">
                <h2 className="text-[17px] leading-snug font-bold tracking-[-0.3px] text-[#263b58]">
                  Construisez votre version
                </h2>
                <p className="mt-2 text-xs leading-[1.75] text-[#71839c]">
                  Ouvrez une copie dans l’atelier et apportez-y votre touche.
                </p>
              </div>
              {isAuthenticated ? (
                <Button
                  className="creation-fork-button h-auto min-h-11 w-full justify-between gap-2 rounded-lg bg-[#356ae6] px-3.5 py-3 text-xs leading-normal font-semibold whitespace-normal text-white hover:bg-[#2458ce]"
                  disabled={busy}
                  aria-busy={busy}
                  onClick={createVersion}
                >
                  {busy ? (
                    <LoaderCircle
                      className="size-4 shrink-0 animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  ) : (
                    <GitBranch className="size-4 shrink-0" aria-hidden="true" />
                  )}
                  <span className="flex-1 text-left">
                    {busy ? "Création de votre version…" : "Créer ma version"}
                  </span>
                  <ArrowRight
                    className="size-4 pointer-events-none shrink-0"
                    size={16}
                    aria-hidden="true"
                  />
                </Button>
              ) : (
                <SignInTo className="creation-fork-button flex min-h-11 w-full justify-between gap-2 rounded-lg bg-[#356ae6] px-3.5 py-3 text-xs leading-normal font-semibold text-white hover:bg-[#2458ce]">
                  <GitBranch
                    className="shrink-0"
                    size={17}
                    aria-hidden="true"
                  />{" "}
                  <span className="flex-1 text-left">
                    Se connecter pour créer
                  </span>
                  <ArrowRight
                    className="shrink-0"
                    size={16}
                    aria-hidden="true"
                  />
                </SignInTo>
              )}
              <p className="creation-fork-note mt-2.5 text-[11px] leading-relaxed text-[#8190a5]">
                Copie privée. L’auteur d’origine reste crédité.
              </p>
            </div>
            {p.challenge && (
              <CreationChallenge
                day={p.challenge.day}
                publicationId={publicationId}
                owner={p.owner}
                count={p.voteCount}
              />
            )}
          </aside>
        </div>
        <div className="creation-community mt-9 grid grid-cols-[minmax(0,1fr)_320px] items-start gap-8 border-t border-[#e8edf3] pt-8 max-lg-narrow:grid-cols-1 max-lg-narrow:gap-8 max-sm:mt-7 max-sm:pt-6 lg-start:max-xl-narrow:grid-cols-[minmax(0,1fr)_280px] lg-start:max-xl-narrow:gap-6">
          <Comments
            initial={initial.comments}
            publicationId={publicationId}
            count={p.commentCount}
          />
          <CreationRemixes
            initial={initial.remixes}
            publicationId={publicationId}
            isAuthenticated={isAuthenticated}
            creatingVersion={busy}
            onCreateVersion={createVersion}
          />
        </div>
      </article>
    </main>
  );
}
