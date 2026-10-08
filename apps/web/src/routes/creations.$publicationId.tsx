import { loadPublic } from "@/lib/seo/public-data";
import { seo, absolute, breadcrumbs } from "@/lib/seo/meta";
import {
  createFileRoute,
  Link,
  useNavigate,
  notFound,
} from "@tanstack/react-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import { ArrowRight, GitBranch, MousePointer2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Comments from "@/components/challenges/comments";
import { CreationChallenge } from "@/components/challenges/shared";
import AuthorLink from "@/components/clik/author-link";
import ClientScene from "@/components/clik/client-scene";
import CreationRemixes from "@/components/clik/creation-remixes";
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
  const scene = useMemo(() => (p ? JSON.parse(p.scene) : null), [p?.scene]);
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
  return (
    <main className="creation-page px-[5%] m-auto max-w-350 pt-8.75 pb-16">
      <div className="creation-layout gap-9 grid grid-cols-[minmax(0,1.8fr)_minmax(300px,1fr)] items-start [@media(width<=850px)]:gap-6.25 [@media(width<=850px)]:grid-cols-1 [@media(851px<=width<=1100px)]:gap-6 [@media(851px<=width<=1100px)]:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]">
        <div className="creation-preview-panel min-w-0">
          <div
            className="public-scene overflow-hidden border border-solid border-[#e2e8f1] h-140 rounded-[20px] relative bg-[#edf1f7] [@media(width<=520px)]:h-87.5 [@media(520px<width<=850px)]:h-112.5"
            role="region"
            aria-label={`Aperçu 3D de ${p.title}`}
          >
            <ClientScene
              scene={scene}
              showGrid={false}
              showViewControls
              poster={p.thumbnailUrl}
              title={p.title}
            />
            <p className="creation-view-hint gap-1.75 absolute bottom-1.25 left-3 right-27.5 min-h-7.5 flex justify-start items-center text-[11px] text-[#8190a5] leading-[1.6] pointer-events-none [@media(width<=640px)]:gap-1.25 [@media(width<=640px)]:left-2.5 [@media(width<=640px)]:text-[10px]">
              <MousePointer2
                className="shrink-0"
                size={14}
                aria-hidden="true"
              />
              <span>
                Glissez pour explorer
                <span className="creation-view-hint-zoom [@media(width<=640px)]:hidden">
                  {" "}
                  · Pincez ou défilez pour zoomer
                </span>
              </span>
            </p>
          </div>
        </div>
        <aside className="creation-details min-w-0 [@media(width<=850px)]:pb-7.5">
          {p.isAssembly && (
            <span className="assembly-badge group/assembly-badge px-2 py-0.75 border border-solid border-[#c7dfdf] inline-flex w-fit items-center rounded-[6px] bg-[#edf7f5] text-[#37786b] text-[10px] font-[650] leading-normal whitespace-nowrap">
              Assemblage
            </span>
          )}
          <h1 className="mx-0 text-[clamp(28px,_3vw,_42px)] leading-[1.15] font-extrabold tracking-[-1.5px] mt-1.5 mb-4 wrap-anywhere">
            {p.title}
          </h1>
          <p className="author text-[#6e84a3] text-sm leading-[inherit]">
            par <AuthorLink id={p.owner} name={p.author} avatar={p.avatar} />
          </p>
          <p className="publication-date mx-0 text-xs leading-[inherit] text-[#96a2b5] mt-3 mb-5.5">
            Publiée le{" "}
            <time dateTime={new Date(p.createdAt).toISOString()}>
              {new Date(p.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
          </p>
          {p.description && (
            <p className="description mx-0 my-6.25 text-[#63758f] text-[15px] whitespace-pre-wrap wrap-anywhere leading-[1.9]">
              {p.description}
            </p>
          )}
          {!!p.sources?.length ? (
            <div className="creation-source-list mx-0 my-5 text-[#71839c] text-xs leading-[1.7]">
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
              <p className="attribution px-3.75 py-3 mx-0 my-3.75 gap-2 flex items-start text-xs leading-[1.7] bg-[#f0f4fb] text-[#7b8ea8] rounded-[6px] wrap-anywhere">
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
              <p className="publication-date mx-0 text-xs leading-[inherit] text-[#96a2b5] mt-3 mb-5.5">
                Mise à jour le {new Date(p.updatedAt).toLocaleString("fr-FR")}.
                Les votes sont conservés.
              </p>
            )}
          <div className="creation-fork p-5 border border-solid border-[#dce6f7] mt-7 rounded-2xl bg-[#f0f5fd] [@media(851px<=width<=1100px)]:p-4">
            <div className="creation-fork-heading gap-3 flex items-center mb-4.5">
              <svg
                className="creation-fork-art w-12 h-15 shrink-0"
                viewBox="0 0 56 68"
                fill="none"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d="M14 12v44"
                  stroke="#b4c6e5"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d="M14 48c0-23 28-8 28-34"
                  stroke="#356ae6"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <rect
                  x="8"
                  y="6"
                  width="12"
                  height="12"
                  rx="3"
                  fill="#dbe6f8"
                  stroke="#a6badc"
                  strokeWidth="2"
                />
                <rect
                  x="8"
                  y="50"
                  width="12"
                  height="12"
                  rx="3"
                  fill="#dbe6f8"
                  stroke="#a6badc"
                  strokeWidth="2"
                />
                <rect
                  x="35"
                  y="5"
                  width="14"
                  height="14"
                  rx="3"
                  fill="#356ae6"
                />
                <path
                  d="M39 12h6m-3-3v6"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <div>
                <h2 className="text-[17px] font-[750] tracking-[-0.4px] leading-[1.4]">
                  Et si vous imaginiez la suite ?
                </h2>
                <p className="text-xs text-[#71839c] mt-1.25 leading-[1.7]">
                  Une nouvelle branche, votre propre version.
                </p>
              </div>
            </div>
            {isAuthenticated ? (
              <Button
                className="creation-fork-button p-3 gap-2 flex justify-center w-full min-h-11 h-auto rounded-[10px] bg-[#356ae6] text-white text-xs font-[650] whitespace-normal leading-normal hover:bg-[#2859cd]"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const id = await remix({
                      id: publicationId,
                      versionId: p._id,
                    });
                    await navigate({
                      to: "/editor/$projectId",
                      params: { projectId: id },
                    });
                  } catch (e) {
                    toast.error(String(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <GitBranch
                  className="size-4 pointer-events-none shrink-0"
                  size={17}
                  aria-hidden="true"
                />
                {busy
                  ? "Création de votre version…"
                  : "Continuer cette création"}
                <ArrowRight
                  className="size-4 pointer-events-none shrink-0"
                  size={16}
                  aria-hidden="true"
                />
              </Button>
            ) : (
              <Link
                to="/sign-in"
                onClick={() =>
                  sessionStorage.setItem(
                    "clik-return-to",
                    window.location.pathname,
                  )
                }
                className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 primary-link creation-fork-button group/primary-link items-center justify-center bg-[#356ae6] text-white font-[650] p-3 gap-2 flex w-full min-h-11 h-auto rounded-[10px] text-xs whitespace-normal leading-normal hover:bg-[#2859cd]"
              >
                <GitBranch className="shrink-0" size={17} aria-hidden="true" />{" "}
                Se connecter pour continuer
              </Link>
            )}
            <p className="creation-fork-note mt-3 text-[#7889a3] text-[11px] leading-[1.7]">
              Une copie privée rejoint vos créations. L’auteur d’origine reste
              crédité.
            </p>
          </div>
        </aside>
      </div>
      {p.challenge && (
        <CreationChallenge
          day={p.challenge.day}
          publicationId={publicationId}
          owner={p.owner}
          count={p.voteCount}
        />
      )}
      <CreationRemixes
        initial={initial.remixes}
        publicationId={publicationId}
      />
      <Comments
        initial={initial.comments}
        publicationId={publicationId}
        count={p.commentCount}
      />
    </main>
  );
}
