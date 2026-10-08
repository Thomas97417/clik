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
    <main className="collection-page projects-page px-[5%] py-16 m-auto max-w-330 [@media(width<=850px)]:pt-10">
      <div className="page-heading group/page-heading gap-6.25 flex justify-between items-center [@media(width<=850px)]:flex-col mb-7.5 [@media(width<=850px)]:items-start">
        <div>
          <h1 className="mx-0 my-3 text-5xl leading-[inherit] tracking-[-2px] font-extrabold [@media(width<=850px)]:text-[40px]">
            Mes créations<span className="text-[#356ae6]">.</span>
          </h1>
          <p className="text-[#7b889b] text-[15px]">
            Retrouvez vos constructions. Faites-les évoluer ou partagez-les, à
            votre rythme.
          </p>
        </div>
        <Button
          className="primary-link new-creation group/new-creation group/primary-link gap-2.5 inline-flex items-center justify-center bg-[#356ae6] text-white text-sm font-[650] whitespace-nowrap hover:bg-[#2458ce] px-4.5 py-0 h-11 rounded-[9px] leading-(--text-xs--line-height)"
          onClick={newCreation}
        >
          <Plus
            className="size-4 pointer-events-none shrink-0"
            size={17}
            aria-hidden="true"
          />{" "}
          Nouvelle création
        </Button>
      </div>
      {!isLoading && !isAuthenticated && (
        <div className="projects-account-note px-6 py-5 gap-4 border border-solid border-[#e0e8fa] flex items-center bg-[#f3f6fd] rounded-[12px] mb-8 [@media(width<=850px)]:p-4.5 [@media(width<=850px)]:flex-wrap">
          <span className="projects-note-icon grid place-items-center shrink-0 rounded-[12px] text-[#356ae6] bg-white size-11">
            <Cloud size={22} aria-hidden="true" />
          </span>
          <div className="[@media(width<=850px)]:flex-1 [@media(width<=850px)]:min-w-47.5">
            <h2 className="text-sm leading-[inherit] font-bold mb-1">
              Vos créations vous suivent.
            </h2>
            <p className="text-xs text-[#68788e] leading-[1.6]">
              Connectez-vous pour retrouver vos créations en ligne et les
              partager dans la galerie.
            </p>
          </div>
          <Link
            className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 gap-2 inline-flex items-center ml-auto text-[#356ae6] text-xs font-[650] whitespace-nowrap [@media(width<=850px)]:ml-15 leading-normal"
            to="/sign-in"
            onClick={() =>
              sessionStorage.setItem("clik-return-to", "/projects")
            }
          >
            Se connecter <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      )}
      <div className="projects-toolbar px-0 gap-4 flex items-center justify-between flex-wrap pt-0 pb-5.5 mb-7 border-b border-solid border-b-[#e4eaf2] [@media(width<=520px)]:gap-3">
        <div
          className="project-filters p-1 gap-1 flex bg-[#f2f5f9] rounded-[10px] [@media(width<=520px)]:grid [@media(width<=520px)]:grid-cols-2 [@media(width<=520px)]:w-full"
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
              className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 px-3.5 py-2.25 gap-1.75 flex items-center rounded-[7px] text-[#697a94] text-xs leading-[inherit] font-semibold whitespace-nowrap [@media(width<=520px)]:px-2.25 [@media(width<=520px)]:text-[11px] [@media(width<=520px)]:justify-center hover:text-[#356ae6] aria-pressed:text-[#356ae6] aria-pressed:bg-white aria-pressed:[box-shadow:0_2px_5px_#31476b10]"
              key={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {Icon && (
                <Icon
                  className="[@media(width<=520px)]:hidden"
                  size={15}
                  aria-hidden="true"
                />
              )}
              {label}
            </button>
          ))}
        </div>
        <div className="projects-toolbar-controls flex items-center justify-between flex-wrap gap-y-3 gap-x-5 ml-auto [@media(width<=520px)]:gap-2.5 [@media(width<=520px)]:w-full">
          <span
            className="projects-count text-[#78869c] text-xs leading-[inherit]"
            aria-live="polite"
          >
            {loading
              ? "Chargement…"
              : `${creations.length} création${creations.length === 1 ? "" : "s"} affichée${creations.length === 1 ? "" : "s"}`}
          </span>
          <div className="collection-sort group/collection-sort gap-2.5 flex items-center shrink-0 text-xs leading-[inherit] text-[#71839c] [@media(width<=520px)]:ml-auto">
            <label
              className="[@media(width<=520px)]:overflow-hidden [@media(width<=520px)]:absolute [@media(width<=520px)]:[clip-path:inset(50%)] [@media(width<=520px)]:whitespace-nowrap [@media(width<=520px)]:size-px"
              htmlFor="projects-sort"
            >
              Trier par
            </label>
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
                className="collection-sort-trigger group/collection-sort-trigger px-2.75 py-2 border border-solid border-[#dfe7f2] w-47.5 min-h-9.5 rounded-[9px] bg-white text-[#455f83] cursor-pointer hover:border-[#b7caf0] hover:bg-[#f8faff] data-popup-open:border-[#b7caf0] data-popup-open:bg-[#f8faff] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-3 [@media(width<=520px)]:w-43.5"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                className="collection-sort-menu p-1 rounded-[11px] bg-white text-[#455f83] [box-shadow:0_8px_24px_#213d6a14,0_0_0_1px_#dfe7f2]"
                align="end"
                alignItemWithTrigger={false}
              >
                {sortOptions.map((option) => (
                  <SelectItem
                    className="min-h-9 rounded-[7px] cursor-pointer data-highlighted:bg-[#edf3ff] data-highlighted:text-[#2458ce] data-selected:text-[#2458ce]"
                    key={option.value}
                    value={option.value}
                  >
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
          className="projects-local-error px-4.5 py-3.5 border border-solid border-[#ecd8b4] bg-[#fffbf2] rounded-[9px] mb-6 text-[#82591a] text-[13px]"
          role="alert"
        >
          Les créations de cet appareil n’ont pas pu être chargées.{" "}
          <button
            className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 underline ml-2"
            onClick={() => setRetry((n) => n + 1)}
          >
            Réessayer
          </button>
        </div>
      )}
      {loading ? (
        <div
          className="creation-grid projects-skeletons group/creation-grid gap-6.5 grid grid-cols-3 [@media(width<=520px)]:gap-3.75 [@media(width<=520px)]:grid-cols-1 [@media(520px<width<=850px)]:gap-3.75 [@media(520px<width<=850px)]:grid-cols-2"
          role="status"
          aria-label="Chargement des créations"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <div
              className="project-skeleton overflow-hidden border border-solid border-[#e4eaf2] rounded-[14px] pb-5"
              key={i}
              aria-hidden="true"
            >
              <div className="aspect-4/3 bg-[#edf2f8]" />
              <span className="mx-4.5 block w-3/5 h-3.5 bg-[#edf2f8] mt-5 mb-0 rounded-[4px] last:w-[40%] last:h-2.5 last:mt-2.5" />
              <span className="mx-4.5 block w-3/5 h-3.5 bg-[#edf2f8] mt-5 mb-0 rounded-[4px] last:w-[40%] last:h-2.5 last:mt-2.5" />
            </div>
          ))}
        </div>
      ) : creations.length ? (
        <div className="creation-grid projects-grid group/creation-grid gap-6.5 grid grid-cols-3 [@media(width<=520px)]:gap-3.75 [@media(width<=520px)]:grid-cols-1 [@media(520px<width<=850px)]:gap-3.75 [@media(520px<width<=850px)]:grid-cols-2">
          {creations.map((creation) => (
            <ProjectCard
              key={creation.id}
              creation={creation}
              onLocalChange={() => setRetry((value) => value + 1)}
            />
          ))}
        </div>
      ) : (
        <div className="projects-empty px-6 py-16 border border-dashed border-[#d6dfed] flex items-center text-center flex-col rounded-2xl bg-[#fbfcff]">
          <span className="projects-empty-icon grid place-items-center rounded-[20px] bg-[#edf3ff] text-[#356ae6] mb-6 size-18">
            {filter === "published" ? (
              <Globe2 size={32} />
            ) : filter === "online" ? (
              <Cloud size={32} />
            ) : (
              <Box size={32} />
            )}
          </span>
          <h2 className="text-[23px] tracking-[-0.5px] font-[750]">
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
          <p className="mx-0 max-w-105 text-[#73829a] text-sm leading-[1.8] mt-3 mb-6">
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
              className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 primary-link group/primary-link px-4.75 py-3 gap-2.5 inline-flex items-center justify-center bg-[#356ae6] text-white text-sm font-[650] whitespace-nowrap hover:bg-[#2458ce] h-10 rounded-[8px] leading-normal"
              onClick={() =>
                sessionStorage.setItem("clik-return-to", "/projects")
              }
            >
              Se connecter
            </Link>
          ) : filter === "published" ? (
            <Button
              className="primary-link group/primary-link px-4.75 py-3 gap-2.5 inline-flex items-center justify-center bg-[#356ae6] text-white text-sm font-[650] whitespace-nowrap hover:bg-[#2458ce] h-10 rounded-[8px] leading-(--text-xs--line-height)"
              onClick={() => setFilter("all")}
            >
              Voir mes créations
            </Button>
          ) : (
            <Button
              className="primary-link group/primary-link px-4.75 py-3 gap-2.5 inline-flex items-center justify-center bg-[#356ae6] text-white text-sm font-[650] whitespace-nowrap hover:bg-[#2458ce] h-10 rounded-[8px] leading-(--text-xs--line-height)"
              onClick={newCreation}
            >
              <Plus className="size-4 pointer-events-none shrink-0" size={16} />{" "}
              Créer dans l’atelier
            </Button>
          )}
        </div>
      )}
      {isAuthenticated &&
        filter !== "local" &&
        (status === "CanLoadMore" || status === "LoadingMore") && (
          <div className="projects-pagination gap-4.5 flex items-center justify-center mt-8 before:[content:''] before:h-px before:flex-1 before:max-w-27.5 before:bg-[#e0e7f2] [@media(width<=520px)]:before:hidden after:[content:''] after:h-px after:flex-1 after:max-w-27.5 after:bg-[#e0e7f2] [@media(width<=520px)]:after:hidden">
            <Button
              className="projects-load-more data-[slot=button]:px-4.5 data-[slot=button]:py-2.25 data-[slot=button]:gap-2.5 data-[slot=button]:border data-[slot=button]:border-solid data-[slot=button]:border-[#d7e2f3] data-[slot=button]:min-w-62 data-[slot=button]:min-h-11.5 data-[slot=button]:rounded-[12px] data-[slot=button]:bg-white data-[slot=button]:text-[#455f83] data-[slot=button]:text-xs data-[slot=button]:font-[650] data-[slot=button]:[box-shadow:0_2px_5px_#31476b08] data-[slot=button]:[transition:background_150ms,border-color_150ms,box-shadow_150ms] [@media(width<=520px)]:data-[slot=button]:min-w-0 [@media(width<=520px)]:data-[slot=button]:w-full [@media(width<=520px)]:data-[slot=button]:max-w-80 [&[data-slot='button']:hover:not(:disabled)]:border-[#b5c9ef] [&[data-slot='button']:hover:not(:disabled)]:bg-[#f6f9ff] [&[data-slot='button']:hover:not(:disabled)]:text-[#356ae6] [&[data-slot='button']:hover:not(:disabled)]:[box-shadow:0_3px_10px_#31476b0c] [&[data-slot='button']:focus-visible]:outline-2 [&[data-slot='button']:focus-visible]:outline-solid [&[data-slot='button']:focus-visible]:outline-[#356ae6] [&[data-slot='button']:focus-visible]:outline-offset-4 [&[data-slot='button']:disabled]:opacity-100 [&[data-slot='button']:disabled]:bg-[#f6f8fc] [&[data-slot='button']:disabled]:text-[#71839c]"
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
                className="projects-load-more-icon grid place-items-center rounded-[7px] bg-[#edf3ff] text-[#356ae6] size-6.5"
                aria-hidden="true"
              >
                {status === "LoadingMore" || loadingPublished ? (
                  <LoaderCircle
                    className="size-4 pointer-events-none shrink-0 animate-spin motion-reduce:animate-none"
                    size={16}
                  />
                ) : (
                  <Plus
                    className="size-4 pointer-events-none shrink-0"
                    size={16}
                  />
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
      <p className="projects-footnote gap-2 flex items-center text-[#78869a] text-xs leading-[1.7] mt-7.5">
        <LockKeyhole className="shrink-0" size={14} aria-hidden="true" /> Vos
        créations restent privées. Seules les versions que vous publiez sont
        visibles dans la galerie.
      </p>
    </main>
  );
}
