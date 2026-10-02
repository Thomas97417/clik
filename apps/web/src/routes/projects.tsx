import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useConvexAuth, usePaginatedQuery } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import {
  ArrowRight,
  Box,
  Cloud,
  HardDrive,
  LockKeyhole,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { listLocalCreations } from "@/lib/clik/local";
import ProjectCard, { type CreationItem } from "@/components/clik/project-card";

export const Route = createFileRoute("/projects")({ component: Projects });
function Projects() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { results, status, loadMore } = usePaginatedQuery(
    api.projects.list,
    isAuthenticated ? {} : "skip",
    { initialNumItems: 12 },
  );
  const navigate = useNavigate();
  const [location, setLocation] = useState<"all" | "online" | "local">("all");
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
      }))
    : [];
  const creations = [...remote, ...local].filter(
    (p) => location === "all" || location === p.location,
  );
  const loading =
    (location !== "online" && localLoading) ||
    (location !== "local" &&
      (isLoading || (isAuthenticated && status === "LoadingFirstPage")));
  const newCreation = () =>
    void navigate({ to: "/editor", search: { draft: crypto.randomUUID() } });
  return (
    <main className="collection-page projects-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Votre collection, votre imagination</span>
          <h1>
            Mes créations<span>.</span>
          </h1>
          <p>
            Retrouvez vos constructions. Faites-les évoluer ou partagez-les, à
            votre rythme.
          </p>
        </div>
        <Button className="primary-link new-creation" onClick={newCreation}>
          <Plus size={17} aria-hidden="true" /> Nouvelle création
        </Button>
      </div>
      {!isLoading && !isAuthenticated && (
        <div className="projects-account-note">
          <span className="projects-note-icon">
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
      <div className="projects-toolbar">
        <div
          className="project-filters"
          role="group"
          aria-label="Emplacement des créations"
        >
          {(
            [
              ["all", "Toutes", null],
              ["online", "En ligne", Cloud],
              ["local", "Sur cet appareil", HardDrive],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              aria-pressed={location === value}
              onClick={() => setLocation(value)}
            >
              {Icon && <Icon size={15} aria-hidden="true" />}
              {label}
            </button>
          ))}
        </div>
        <span className="projects-count" aria-live="polite">
          {loading
            ? "Chargement…"
            : `${creations.length} création${creations.length === 1 ? "" : "s"} affichée${creations.length === 1 ? "" : "s"}`}
        </span>
      </div>
      {localError && location !== "online" && (
        <div className="projects-local-error" role="alert">
          Les créations de cet appareil n’ont pas pu être chargées.{" "}
          <button onClick={() => setRetry((n) => n + 1)}>Réessayer</button>
        </div>
      )}
      {loading ? (
        <div
          className="creation-grid projects-skeletons"
          role="status"
          aria-label="Chargement des créations"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <div className="project-skeleton" key={i} aria-hidden="true">
              <div />
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : creations.length ? (
        <div className="creation-grid projects-grid">
          {creations.map((creation) => (
            <ProjectCard
              key={creation.id}
              creation={creation}
              onLocalChange={() => setRetry((value) => value + 1)}
            />
          ))}
        </div>
      ) : (
        <div className="projects-empty">
          <span className="projects-empty-icon">
            {location === "online" ? <Cloud size={32} /> : <Box size={32} />}
          </span>
          <h2>
            {location === "online"
              ? isAuthenticated
                ? "Votre collection en ligne commence ici."
                : "Retrouvez votre collection en ligne."
              : "Une place pour votre prochaine idée."}
          </h2>
          <p>
            {location === "online"
              ? isAuthenticated
                ? "Dans l’atelier, choisissez « Conserver le projet » pour l’ajouter à votre collection."
                : "Connectez-vous pour voir les créations enregistrées sur votre compte."
              : "Petite expérience ou grande construction : toutes vos créations ont leur place ici."}
          </p>
          {location === "online" && !isAuthenticated ? (
            <Link
              to="/sign-in"
              className="primary-link"
              onClick={() =>
                sessionStorage.setItem("clik-return-to", "/projects")
              }
            >
              Se connecter
            </Link>
          ) : (
            <Button className="primary-link" onClick={newCreation}>
              <Plus size={16} /> Créer dans l’atelier
            </Button>
          )}
        </div>
      )}
      {isAuthenticated &&
        location !== "local" &&
        (status === "CanLoadMore" || status === "LoadingMore") && (
          <Button
            className="load-more"
            variant="outline"
            disabled={status === "LoadingMore"}
            onClick={() => loadMore(12)}
          >
            {status === "LoadingMore"
              ? "Chargement…"
              : "Voir plus de créations"}
          </Button>
        )}
      <p className="projects-footnote">
        <LockKeyhole size={14} aria-hidden="true" /> Vos créations restent
        privées. Seules les versions que vous publiez sont visibles dans la
        galerie.
      </p>
    </main>
  );
}
