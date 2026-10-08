import { cn } from "@/lib/utils";
import { seo } from "@/lib/seo/meta";
import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useConvexAuth, usePaginatedQuery } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import {
  ArrowRight,
  Box,
  Cloud,
  Globe2,
  HardDrive,
  LoaderCircle,
  LockKeyhole,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listLocalCreations } from "@/lib/clik/local";
import ProjectCard, { type CreationItem } from "@/components/clik/project-card";

const sortOptions = [
  { value: "recent", label: "Les plus récentes" },
  { value: "oldest", label: "Les plus anciennes" },
] as const;

export const Route = createFileRoute("/projects")({
  head: () =>
    seo({
      title: "Mes créations",
      text: "Retrouvez et organisez vos créations Clik.",
      path: "/projects",
      noindex: true,
    }),
  validateSearch: (search: Record<string, unknown>): { sort?: "oldest" } => ({
    sort: search.sort === "oldest" ? "oldest" : undefined,
  }),
  component: Projects,
});
function Projects() {
  const { sort = "recent" } = Route.useSearch();
  const [filter, setFilter] = useState<
    "all" | "online" | "local" | "published"
  >("all");
  const [publishedTarget, setPublishedTarget] = useState({ sort, count: 12 });
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { results, status, loadMore } = usePaginatedQuery(
    api.projects.list,
    isAuthenticated ? { sort } : "skip",
    { initialNumItems: 12 },
  );
  const navigate = useNavigate();
  const [local, setLocal] = useState<CreationItem[]>([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [localError, setLocalError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let version = 0;
    const refresh = async () => {
      const request = ++version;
      try {
        const entries = await listLocalCreations();
        if (request !== version) return;
        setLocal(
          entries.map((entry) => ({
            id: entry.key,
            title: entry.title,
            scene: entry.scene,
            cacheKey: `local:${entry.key}:${entry.stamp}`,
            updatedAt: entry.updatedAt,
            location: "local",
            stamp: entry.stamp,
            draftId: entry.key === "guest" ? undefined : entry.key.slice(6),
            provenance: entry.provenance,
            origin: entry.provenance?.origin,
          })),
        );
        setLocalError(false);
      } catch {
        if (request === version) setLocalError(true);
      } finally {
        if (request === version) setLocalLoading(false);
      }
    };
    void refresh();
    window.addEventListener("focus", refresh);
    return () => {
      version++;
      window.removeEventListener("focus", refresh);
    };
  }, [retry]);
  const remote: CreationItem[] = isAuthenticated
    ? results.map((p) => ({
        ...p,
        id: p._id,
        projectId: p._id,
        location: "online",
        cacheKey: `project:${p._id}:${p.revision}`,
        provenance: {
          origin: p.origin,
          originReceiptId: p.originReceiptId,
          imports: p.imports ?? [],
        },
      }))
    : [];
  const creations = [...remote, ...local]
    .filter((p) =>
      filter === "published"
        ? p.location === "online" && !!p.publicationId
        : filter === "all" || filter === p.location,
    )
    .sort((a, b) => {
      const difference = (a.updatedAt ?? 0) - (b.updatedAt ?? 0);
      return (
        (sort === "oldest" ? difference : -difference) ||
        a.id.localeCompare(b.id)
      );
    });
  const targetCount =
    publishedTarget.sort === sort ? publishedTarget.count : 12;
  const loadingPublished =
    filter === "published" &&
    isAuthenticated &&
    creations.length < targetCount &&
    (status === "CanLoadMore" || status === "LoadingMore");
  useEffect(() => {
    if (loadingPublished && status === "CanLoadMore") loadMore(12);
  }, [loadingPublished, status, loadMore]);
  const includesLocal = filter === "all" || filter === "local";
  const loading =
    (includesLocal && localLoading) ||
    (filter !== "local" &&
      (isLoading || (isAuthenticated && status === "LoadingFirstPage"))) ||
    (loadingPublished && creations.length === 0);
  const accountRequired =
    (filter === "online" || filter === "published") && !isAuthenticated;
  const newCreation = () =>
    void navigate({ to: "/editor", search: { draft: crypto.randomUUID() } });
  return (
    <main
      className={cn(
        "collection-page projects-page [&_[class~='group/page-heading']]:mb-[30px] [@media(width<=850px)]:[&_[class~='group/page-heading']]:items-start [&_[class~='group/new-creation']]:px-[18px] [&_[class~='group/new-creation']]:py-[0] [&_[class~='group/new-creation']]:h-[44px] [&_[class~='group/new-creation']]:rounded-[9px] px-[5%] py-[64px] m-[auto] max-w-[1320px] [@media(width<=850px)]:pt-[40px]",
      )}
    >
      <div
        className={cn(
          "page-heading group/page-heading gap-[25px] flex justify-between items-center mb-[45px] [@media(width<=850px)]:items-start [@media(width<=850px)]:flex-col [&_h1]:mx-[0] [&_h1]:my-[12px] [&_h1]:[font-size:48px] [&_h1]:tracking-[-2px] [&_h1]:font-[800] [@media(width<=850px)]:[&_h1]:[font-size:40px] [&_h1_>_span]:text-[color:#356ae6] [&_p]:text-[color:#7b889b] [&_p]:[font-size:15px]",
        )}
      >
        <div>
          <h1>
            Mes créations<span>.</span>
          </h1>
          <p>
            Retrouvez vos constructions. Faites-les évoluer ou partagez-les, à
            votre rythme.
          </p>
        </div>
        <Button
          className={cn(
            "primary-link new-creation group/new-creation group/primary-link px-[19px] py-[12px] gap-[10px] inline-flex items-center justify-center bg-[#356ae6] text-[color:#fff] rounded-[9px] [font-size:14px] font-[650] whitespace-nowrap [&:hover]:bg-[#2458ce]",
          )}
          onClick={newCreation}
        >
          <Plus size={17} aria-hidden="true" /> Nouvelle création
        </Button>
      </div>
      {!isLoading && !isAuthenticated && (
        <div
          className={cn(
            "projects-account-note px-[24px] py-[20px] gap-[16px] border-[length:1px] border-solid border-[color:#e0e8fa] flex items-center bg-[#f3f6fd] rounded-[12px] mb-[32px] [@media(width<=850px)]:p-[18px] [@media(width<=850px)]:flex-wrap [&_h2]:[font-size:14px] [&_h2]:font-[700] [&_h2]:mb-[4px] [&_p]:[font-size:12px] [&_p]:text-[color:#68788e] [&_p]:leading-[1.6] [&_>_a]:gap-[8px] [&_>_a]:inline-flex [&_>_a]:items-center [&_>_a]:ml-[auto] [&_>_a]:text-[color:#356ae6] [&_>_a]:[font-size:12px] [&_>_a]:font-[650] [&_>_a]:whitespace-nowrap [@media(width<=850px)]:[&_>_a]:ml-[60px] [@media(width<=850px)]:[&_>_div]:flex-[1] [@media(width<=850px)]:[&_>_div]:min-w-[190px]",
          )}
        >
          <span
            className={cn(
              "projects-note-icon grid [place-items:center] shrink-[0] w-[44px] h-[44px] rounded-[12px] text-[color:#356ae6] bg-[#fff]",
            )}
          >
            <Cloud size={22} aria-hidden="true" />
          </span>
          <div>
            <h2>Vos créations vous suivent.</h2>
            <p>
              Connectez-vous pour retrouver vos créations en ligne et les
              partager dans la galerie.
            </p>
          </div>
          <Link
            to="/sign-in"
            onClick={() =>
              sessionStorage.setItem("clik-return-to", "/projects")
            }
          >
            Se connecter <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      )}
      <div
        className={cn(
          "projects-toolbar px-[0] gap-[16px] flex items-center justify-between flex-wrap pt-[0] pb-[22px] mb-[28px] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e4eaf2] [@media(width<=520px)]:gap-[12px]",
        )}
      >
        <div
          className={cn(
            "project-filters p-[4px] gap-[4px] flex bg-[#f2f5f9] rounded-[10px] [@media(width<=520px)]:grid [@media(width<=520px)]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=520px)]:w-[100%] [&_button]:px-[14px] [&_button]:py-[9px] [&_button]:gap-[7px] [&_button]:flex [&_button]:items-center [&_button]:rounded-[7px] [&_button]:text-[color:#697a94] [&_button]:[font-size:12px] [&_button]:font-[600] [&_button]:whitespace-nowrap [@media(width<=520px)]:[&_button]:px-[9px] [@media(width<=520px)]:[&_button]:[font-size:11px] [@media(width<=520px)]:[&_button]:justify-center [&_button:hover]:text-[color:#356ae6] [&_button[aria-pressed='true']]:text-[color:#356ae6] [&_button[aria-pressed='true']]:bg-[white] [&_button[aria-pressed='true']]:[box-shadow:0_2px_5px_#31476b10] [@media(width<=520px)]:[&_button_svg]:hidden",
          )}
          role="group"
          aria-label="Filtrer les créations"
        >
          {(
            [
              ["all", "Toutes", null],
              ["online", "En ligne", Cloud],
              ["local", "Sur cet appareil", HardDrive],
              ["published", "Dans la galerie", Globe2],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {Icon && <Icon size={15} aria-hidden="true" />}
              {label}
            </button>
          ))}
        </div>
        <div
          className={cn(
            "projects-toolbar-controls flex items-center justify-between flex-wrap gap-y-[12px] gap-x-[20px] ml-[auto] [@media(width<=520px)]:gap-[10px] [@media(width<=520px)]:w-[100%] [@media(width<=520px)]:[&_[class~='group/collection-sort']]:ml-[auto] [@media(width<=520px)]:[&_[class~='group/collection-sort']_>_label]:overflow-hidden [@media(width<=520px)]:[&_[class~='group/collection-sort']_>_label]:absolute [@media(width<=520px)]:[&_[class~='group/collection-sort']_>_label]:w-[1px] [@media(width<=520px)]:[&_[class~='group/collection-sort']_>_label]:h-[1px] [@media(width<=520px)]:[&_[class~='group/collection-sort']_>_label]:[clip-path:inset(50%)] [@media(width<=520px)]:[&_[class~='group/collection-sort']_>_label]:whitespace-nowrap [@media(width<=520px)]:[&_[class~='group/collection-sort-trigger']]:w-[174px]",
          )}
        >
          <span
            className={cn(
              "projects-count text-[color:#78869c] [font-size:12px]",
            )}
            aria-live="polite"
          >
            {loading
              ? "Chargement…"
              : `${creations.length} création${creations.length === 1 ? "" : "s"} affichée${creations.length === 1 ? "" : "s"}`}
          </span>
          <div
            className={cn(
              "collection-sort group/collection-sort gap-[10px] flex items-center shrink-[0] [font-size:12px] text-[color:#71839c]",
            )}
          >
            <label htmlFor="projects-sort">Trier par</label>
            <Select
              items={sortOptions}
              value={sort}
              onValueChange={(value) => {
                if (value !== "recent" && value !== "oldest") return;
                void navigate({
                  to: "/projects",
                  search: { sort: value === "oldest" ? value : undefined },
                  resetScroll: false,
                });
              }}
            >
              <SelectTrigger
                id="projects-sort"
                className={cn(
                  "collection-sort-trigger group/collection-sort-trigger px-[11px] py-[8px] border-[length:1px] border-solid border-[color:#dfe7f2] w-[190px] min-h-[38px] rounded-[9px] bg-[#fff] text-[color:#455f83] cursor-[pointer] [&:hover]:border-[color:#b7caf0] [&:hover]:bg-[#f8faff] [&[data-popup-open]]:border-[color:#b7caf0] [&[data-popup-open]]:bg-[#f8faff] [&:focus-visible]:[outline:2px_solid_#356ae6] [&:focus-visible]:[outline-offset:3px]",
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                className={cn(
                  "collection-sort-menu p-[4px] rounded-[11px] bg-[#fff] text-[color:#455f83] [box-shadow:0_8px_24px_#213d6a14,_0_0_0_1px_#dfe7f2] [&_[data-slot='select-item']]:min-h-[36px] [&_[data-slot='select-item']]:rounded-[7px] [&_[data-slot='select-item']]:cursor-[pointer] [&_[data-slot='select-item'][data-highlighted]]:bg-[#edf3ff] [&_[data-slot='select-item'][data-highlighted]]:text-[color:#2458ce] [&_[data-slot='select-item'][data-selected]]:text-[color:#2458ce]",
                )}
                align="end"
                alignItemWithTrigger={false}
              >
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      {localError && includesLocal && (
        <div
          className={cn(
            "projects-local-error px-[18px] py-[14px] border-[length:1px] border-solid border-[color:#ecd8b4] bg-[#fffbf2] rounded-[9px] mb-[24px] text-[color:#82591a] [font-size:13px] [&_button]:[text-decoration:underline] [&_button]:ml-[8px]",
          )}
          role="alert"
        >
          Les créations de cet appareil n’ont pas pu être chargées.{" "}
          <button onClick={() => setRetry((n) => n + 1)}>Réessayer</button>
        </div>
      )}
      {loading ? (
        <div
          className={cn(
            "creation-grid projects-skeletons group/creation-grid gap-[26px] grid grid-cols-[repeat(3,_1fr)] [@media(width<=520px)]:gap-[15px] [@media(width<=520px)]:grid-cols-[1fr] [@media(520px<width<=850px)]:gap-[15px] [@media(520px<width<=850px)]:grid-cols-[repeat(2,_1fr)]",
          )}
          role="status"
          aria-label="Chargement des créations"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <div
              className={cn(
                "project-skeleton overflow-hidden border-[length:1px] border-solid border-[color:#e4eaf2] rounded-[14px] pb-[20px] [&_>_div]:[aspect-ratio:4/3] [&_>_div]:bg-[#edf2f8] [&_span]:mx-[18px] [&_span]:block [&_span]:w-[60%] [&_span]:h-[14px] [&_span]:bg-[#edf2f8] [&_span]:mt-[20px] [&_span]:mb-[0] [&_span]:rounded-[4px] [&_span:last-child]:w-[40%] [&_span:last-child]:h-[10px] [&_span:last-child]:mt-[10px]",
              )}
              key={i}
              aria-hidden="true"
            >
              <div />
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : creations.length ? (
        <div
          className={cn(
            "creation-grid projects-grid group/creation-grid gap-[26px] grid grid-cols-[repeat(3,_1fr)] [@media(width<=520px)]:gap-[15px] [@media(width<=520px)]:grid-cols-[1fr] [@media(520px<width<=850px)]:gap-[15px] [@media(520px<width<=850px)]:grid-cols-[repeat(2,_1fr)]",
          )}
        >
          {creations.map((creation) => (
            <ProjectCard
              key={creation.id}
              creation={creation}
              onLocalChange={() => setRetry((value) => value + 1)}
            />
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "projects-empty px-[24px] py-[64px] border-[length:1px] border-dashed border-[color:#d6dfed] flex items-center text-center flex-col rounded-[16px] bg-[#fbfcff] [&_h2]:[font-size:23px] [&_h2]:tracking-[-0.5px] [&_h2]:font-[750] [&_p]:mx-[0] [&_p]:max-w-[420px] [&_p]:text-[color:#73829a] [&_p]:[font-size:14px] [&_p]:leading-[1.8] [&_p]:mt-[12px] [&_p]:mb-[24px] [&_[class~='group/primary-link']]:h-[40px] [&_[class~='group/primary-link']]:rounded-[8px]",
          )}
        >
          <span
            className={cn(
              "projects-empty-icon grid [place-items:center] w-[72px] h-[72px] rounded-[20px] bg-[#edf3ff] text-[color:#356ae6] mb-[24px]",
            )}
          >
            {filter === "published" ? (
              <Globe2 size={32} />
            ) : filter === "online" ? (
              <Cloud size={32} />
            ) : (
              <Box size={32} />
            )}
          </span>
          <h2>
            {filter === "published"
              ? isAuthenticated
                ? "Aucune création publiée pour le moment."
                : "Retrouvez vos créations dans la galerie."
              : filter === "online"
                ? isAuthenticated
                  ? "Votre collection en ligne commence ici."
                  : "Retrouvez votre collection en ligne."
                : "Une place pour votre prochaine idée."}
          </h2>
          <p>
            {filter === "published"
              ? isAuthenticated
                ? "Publiez une création depuis son menu pour la retrouver ici et la partager."
                : "Connectez-vous pour voir les créations que vous avez partagées dans la galerie."
              : filter === "online"
                ? isAuthenticated
                  ? "Dans l’atelier, choisissez « Conserver le projet » pour l’ajouter à votre collection."
                  : "Connectez-vous pour voir les créations enregistrées sur votre compte."
                : "Petite expérience ou grande construction : toutes vos créations ont leur place ici."}
          </p>
          {accountRequired ? (
            <Link
              to="/sign-in"
              className={cn(
                "primary-link group/primary-link px-[19px] py-[12px] gap-[10px] inline-flex items-center justify-center bg-[#356ae6] text-[color:#fff] rounded-[9px] [font-size:14px] font-[650] whitespace-nowrap [&:hover]:bg-[#2458ce]",
              )}
              onClick={() =>
                sessionStorage.setItem("clik-return-to", "/projects")
              }
            >
              Se connecter
            </Link>
          ) : filter === "published" ? (
            <Button
              className={cn(
                "primary-link group/primary-link px-[19px] py-[12px] gap-[10px] inline-flex items-center justify-center bg-[#356ae6] text-[color:#fff] rounded-[9px] [font-size:14px] font-[650] whitespace-nowrap [&:hover]:bg-[#2458ce]",
              )}
              onClick={() => setFilter("all")}
            >
              Voir mes créations
            </Button>
          ) : (
            <Button
              className={cn(
                "primary-link group/primary-link px-[19px] py-[12px] gap-[10px] inline-flex items-center justify-center bg-[#356ae6] text-[color:#fff] rounded-[9px] [font-size:14px] font-[650] whitespace-nowrap [&:hover]:bg-[#2458ce]",
              )}
              onClick={newCreation}
            >
              <Plus size={16} /> Créer dans l’atelier
            </Button>
          )}
        </div>
      )}
      {isAuthenticated &&
        filter !== "local" &&
        (status === "CanLoadMore" || status === "LoadingMore") && (
          <div
            className={cn(
              "projects-pagination gap-[18px] flex items-center justify-center mt-[32px] [&::before]:[content:''] [&::before]:h-[1px] [&::before]:flex-[1] [&::before]:max-w-[110px] [&::before]:bg-[#e0e7f2] [@media(width<=520px)]:[&::before]:hidden [&::after]:[content:''] [&::after]:h-[1px] [&::after]:flex-[1] [&::after]:max-w-[110px] [&::after]:bg-[#e0e7f2] [@media(width<=520px)]:[&::after]:hidden",
            )}
          >
            <Button
              className={cn(
                "projects-load-more [&[data-slot='button']]:px-[18px] [&[data-slot='button']]:py-[9px] [&[data-slot='button']]:gap-[10px] [&[data-slot='button']]:border-[length:1px] [&[data-slot='button']]:border-solid [&[data-slot='button']]:border-[color:#d7e2f3] [&[data-slot='button']]:min-w-[248px] [&[data-slot='button']]:min-h-[46px] [&[data-slot='button']]:rounded-[12px] [&[data-slot='button']]:bg-[#fff] [&[data-slot='button']]:text-[color:#455f83] [&[data-slot='button']]:[font-size:12px] [&[data-slot='button']]:font-[650] [&[data-slot='button']]:[box-shadow:0_2px_5px_#31476b08] [&[data-slot='button']]:[transition:background_150ms,_border-color_150ms,_box-shadow_150ms] [@media(width<=520px)]:[&[data-slot='button']]:min-w-[0] [@media(width<=520px)]:[&[data-slot='button']]:w-[100%] [@media(width<=520px)]:[&[data-slot='button']]:max-w-[320px] [&[data-slot='button']:hover:not(:disabled)]:border-[color:#b5c9ef] [&[data-slot='button']:hover:not(:disabled)]:bg-[#f6f9ff] [&[data-slot='button']:hover:not(:disabled)]:text-[color:#356ae6] [&[data-slot='button']:hover:not(:disabled)]:[box-shadow:0_3px_10px_#31476b0c] [&[data-slot='button']:focus-visible]:[outline:2px_solid_#356ae6] [&[data-slot='button']:focus-visible]:[outline-offset:4px] [&[data-slot='button']:disabled]:opacity-[1] [&[data-slot='button']:disabled]:bg-[#f6f8fc] [&[data-slot='button']:disabled]:text-[color:#71839c]",
              )}
              variant="outline"
              disabled={status === "LoadingMore" || loadingPublished}
              aria-busy={status === "LoadingMore" || loadingPublished}
              onClick={() => {
                if (filter === "published") {
                  setPublishedTarget({
                    sort,
                    count: Math.max(creations.length, targetCount) + 12,
                  });
                } else loadMore(12);
              }}
            >
              <span
                className={cn(
                  "projects-load-more-icon grid [place-items:center] w-[26px] h-[26px] rounded-[7px] bg-[#edf3ff] text-[color:#356ae6]",
                )}
                aria-hidden="true"
              >
                {status === "LoadingMore" || loadingPublished ? (
                  <LoaderCircle
                    className="animate-spin motion-reduce:animate-none"
                    size={16}
                  />
                ) : (
                  <Plus size={16} />
                )}
              </span>
              <span aria-live="polite" aria-atomic="true">
                {status === "LoadingMore" || loadingPublished
                  ? "Chargement…"
                  : "Voir plus de créations"}
              </span>
            </Button>
          </div>
        )}
      <p
        className={cn(
          "projects-footnote gap-[8px] flex items-center text-[color:#78869a] [font-size:12px] leading-[1.7] mt-[30px] [&_svg]:shrink-[0]",
        )}
      >
        <LockKeyhole size={14} aria-hidden="true" /> Vos créations restent
        privées. Seules les versions que vous publiez sont visibles dans la
        galerie.
      </p>
    </main>
  );
}
