import { cn } from "@/lib/utils";
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
        className={cn(
          "empty-state px-[25px] py-[70px] gap-[20px] min-h-[300px] flex flex-col items-center justify-center text-center text-[color:#7d8ba0] [&_h1]:text-[color:#32445f] [&_h1]:[font-size:24px] [&_h1]:font-[700] [&_h2]:text-[color:#32445f] [&_h2]:[font-size:24px] [&_h2]:font-[700] [&_p]:max-w-[510px] [&_p]:leading-[1.8]",
        )}
        role="status"
      >
        Chargement de la création…
      </div>
    );
  if (!p)
    return (
      <div
        className={cn(
          "empty-state px-[25px] py-[70px] gap-[20px] min-h-[300px] flex flex-col items-center justify-center text-center text-[color:#7d8ba0] [&_h1]:text-[color:#32445f] [&_h1]:[font-size:24px] [&_h1]:font-[700] [&_h2]:text-[color:#32445f] [&_h2]:[font-size:24px] [&_h2]:font-[700] [&_p]:max-w-[510px] [&_p]:leading-[1.8]",
        )}
      >
        <h1>Cette création n’est plus disponible.</h1>
        <p>
          Les reprises déjà enregistrées restent dans les projets de leurs
          auteurs.
        </p>
        <Link
          to="/gallery"
          className={cn(
            "primary-link group/primary-link px-[19px] py-[12px] gap-[10px] inline-flex items-center justify-center bg-[#356ae6] text-[color:#fff] rounded-[9px] [font-size:14px] font-[650] whitespace-nowrap [&:hover]:bg-[#2458ce]",
          )}
        >
          Retour à la galerie
        </Link>
      </div>
    );
  return (
    <main
      className={cn(
        "creation-page px-[5%] m-[auto] max-w-[1400px] pt-[35px] pb-[64px]",
      )}
    >
      <div
        className={cn(
          "creation-layout gap-[36px] grid grid-cols-[minmax(0,_1.8fr)_minmax(300px,_1fr)] [align-items:start] [@media(width<=850px)]:gap-[25px] [@media(width<=850px)]:grid-cols-[1fr] [@media(851px<=width<=1100px)]:gap-[24px] [@media(851px<=width<=1100px)]:grid-cols-[minmax(0,_1.4fr)_minmax(280px,_1fr)] [&_h1]:mx-[0] [&_h1]:[font-size:clamp(28px,_3vw,_42px)] [&_h1]:leading-[1.15] [&_h1]:font-[800] [&_h1]:tracking-[-1.5px] [&_h1]:mt-[6px] [&_h1]:mb-[16px] [&_h1]:[overflow-wrap:anywhere] [@media(width<=850px)]:[&_aside]:pb-[30px]",
        )}
      >
        <div className={cn("creation-preview-panel min-w-[0]")}>
          <div
            className={cn(
              "public-scene overflow-hidden border-[length:1px] border-solid border-[color:#e2e8f1] h-[560px] rounded-[20px] relative bg-[#edf1f7] [@media(width<=520px)]:h-[350px] [@media(520px<width<=850px)]:h-[450px]",
            )}
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
            <p
              className={cn(
                "creation-view-hint gap-[7px] absolute bottom-[5px] left-[12px] right-[110px] min-h-[30px] flex justify-start items-center [font-size:11px] text-[color:#8190a5] leading-[1.6] pointer-events-none [@media(width<=640px)]:gap-[5px] [@media(width<=640px)]:left-[10px] [@media(width<=640px)]:[font-size:10px] [&_svg]:shrink-[0]",
              )}
            >
              <MousePointer2 size={14} aria-hidden="true" />
              <span>
                Glissez pour explorer
                <span
                  className={cn(
                    "creation-view-hint-zoom [@media(width<=640px)]:hidden",
                  )}
                >
                  {" "}
                  · Pincez ou défilez pour zoomer
                </span>
              </span>
            </p>
          </div>
        </div>
        <aside className={cn("creation-details min-w-[0]")}>
          {p.isAssembly && (
            <span
              className={cn(
                "assembly-badge group/assembly-badge px-[8px] py-[3px] border-[length:1px] border-solid border-[color:#c7dfdf] inline-flex w-[fit-content] items-center rounded-[6px] bg-[#edf7f5] text-[color:#37786b] [font-size:10px] font-[650] leading-[1.5] whitespace-nowrap",
              )}
            >
              Assemblage
            </span>
          )}
          <h1>{p.title}</h1>
          <p className={cn("author text-[color:#6e84a3] [font-size:14px]")}>
            par <AuthorLink id={p.owner} name={p.author} avatar={p.avatar} />
          </p>
          <p
            className={cn(
              "publication-date mx-[0] [font-size:12px] text-[color:#96a2b5] mt-[12px] mb-[22px]",
            )}
          >
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
            <p
              className={cn(
                "description mx-[0] my-[25px] text-[color:#63758f] leading-[1.9] [font-size:15px] [white-space:pre-wrap] [overflow-wrap:anywhere]",
              )}
            >
              {p.description}
            </p>
          )}
          {!!p.sources?.length ? (
            <div
              className={cn(
                "creation-source-list mx-[0] my-[20px] text-[color:#71839c] [font-size:12px] leading-[1.7] [&_>_p]:gap-[7px] [&_>_p]:flex [&_>_p]:items-center [&_>_p]:font-[650] [&_ul]:gap-[6px] [&_ul]:grid [&_ul]:mt-[9px] [&_ul]:[overflow-wrap:anywhere] [&_a]:text-[color:#356ae6] [&_a:hover]:[text-decoration:underline] [&_a:hover]:underline-offset-[3px]",
              )}
            >
              <p>
                <GitBranch size={15} aria-hidden="true" />
                {p.isAssembly ? "Sources de l’assemblage" : "À partir de"}
              </p>
              <ul>
                {p.sources.map((source) => (
                  <li key={source.publicationId}>
                    {source.available ? (
                      <Link
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
              <p
                className={cn(
                  "attribution px-[15px] py-[12px] mx-[0] my-[15px] gap-[8px] flex items-start [font-size:12px] leading-[1.7] bg-[#f0f4fb] text-[color:#7b8ea8] rounded-[6px] [overflow-wrap:anywhere] [&_svg]:shrink-[0] [&_svg]:mt-[2px]",
                )}
              >
                <GitBranch size={16} aria-hidden="true" />
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
              <p
                className={cn(
                  "publication-date mx-[0] [font-size:12px] text-[color:#96a2b5] mt-[12px] mb-[22px]",
                )}
              >
                Mise à jour le {new Date(p.updatedAt).toLocaleString("fr-FR")}.
                Les votes sont conservés.
              </p>
            )}
          <div
            className={cn(
              "creation-fork p-[20px] border-[length:1px] border-solid border-[color:#dce6f7] mt-[28px] rounded-[16px] bg-[#f0f5fd] [@media(851px<=width<=1100px)]:p-[16px]",
            )}
          >
            <div
              className={cn(
                "creation-fork-heading gap-[12px] flex items-center mb-[18px] [&_h2]:[font-size:17px] [&_h2]:font-[750] [&_h2]:tracking-[-0.4px] [&_h2]:leading-[1.4] [&_p]:[font-size:12px] [&_p]:text-[color:#71839c] [&_p]:mt-[5px] [&_p]:leading-[1.7]",
              )}
            >
              <svg
                className={cn("creation-fork-art w-[48px] h-[60px] shrink-[0]")}
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
                <h2>Et si vous imaginiez la suite ?</h2>
                <p>Une nouvelle branche, votre propre version.</p>
              </div>
            </div>
            {isAuthenticated ? (
              <Button
                className={cn(
                  "creation-fork-button p-[12px] gap-[8px] flex justify-center w-[100%] min-h-[44px] h-[auto] rounded-[10px] bg-[#356ae6] text-[color:#fff] [font-size:12px] font-[650] whitespace-normal leading-[1.5] [&:hover]:bg-[#2859cd] [&_svg]:shrink-[0]",
                )}
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
                <GitBranch size={17} aria-hidden="true" />
                {busy
                  ? "Création de votre version…"
                  : "Continuer cette création"}
                <ArrowRight size={16} aria-hidden="true" />
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
                className={cn(
                  "primary-link creation-fork-button group/primary-link px-[19px] py-[12px] gap-[10px] inline-flex items-center justify-center bg-[#356ae6] text-[color:#fff] rounded-[9px] [font-size:14px] font-[650] whitespace-nowrap [&:hover]:bg-[#2458ce] p-[12px] gap-[8px] flex justify-center w-[100%] min-h-[44px] h-[auto] rounded-[10px] bg-[#356ae6] text-[color:#fff] [font-size:12px] font-[650] whitespace-normal leading-[1.5] [&:hover]:bg-[#2859cd] [&_svg]:shrink-[0]",
                )}
              >
                <GitBranch size={17} aria-hidden="true" /> Se connecter pour
                continuer
              </Link>
            )}
            <p
              className={cn(
                "creation-fork-note mt-[12px] text-[color:#7889a3] [font-size:11px] leading-[1.7]",
              )}
            >
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
