import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConvex, useMutation } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import {
  emptyProvenance,
  projectSources,
  validateScene,
  type ProjectProvenance,
  type SceneDocument,
} from "@clik/scene";
import {
  Cloud,
  HardDrive,
  LoaderCircle,
  Plus,
  Check,
  Search,
  X,
  ArrowDownToLine,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { listLocalCreations, readDraft, type Draft } from "@/lib/clik/local";
import { useEditor } from "@/lib/clik/store";
import CreationPreview from "./creation-preview";

type Choice = {
  id: string;
  title: string;
  scene: string | SceneDocument;
  cacheKey: string;
  location: "local" | "online";
  updatedAt?: number;
};
const locationFilters = [
  { value: "all", label: "Toutes" },
  { value: "local", label: "Sur cet appareil" },
  { value: "online", label: "En ligne" },
] as const;
export default function ImportProjectDialog({
  projectId,
  draftId,
  authenticated,
  onClose,
}: {
  projectId?: string;
  draftId?: string;
  authenticated: boolean;
  onClose: () => void;
}) {
  const convex = useConvex();
  const [remote, setRemote] = useState<Choice[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(authenticated);
  const [remoteError, setRemoteError] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [done, setDone] = useState(!authenticated);
  const remoteRequest = useRef(0);
  const prepare = useMutation(api.projects.prepareImport);
  const [local, setLocal] = useState<(Draft & { key: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [localError, setLocalError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<Choice>();
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState<"all" | Choice["location"]>("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const loadRemote = useCallback(
    async (cursor: string | null) => {
      const request = ++remoteRequest.current;
      setRemoteLoading(true);
      setRemoteError("");
      try {
        if (!navigator.onLine)
          throw Error("Reconnectez-vous pour afficher vos projets en ligne.");
        const result = await convex.query(api.projects.list, {
          sort: "recent",
          paginationOpts: { numItems: 12, cursor },
        });
        if (!mounted.current || request !== remoteRequest.current) return;
        const choices = result.page.map((p) => ({
          id: p._id,
          title: p.title,
          scene: p.scene,
          location: "online" as const,
          updatedAt: p.updatedAt,
          cacheKey: `project:${p._id}:${p.revision}`,
        }));
        setRemote((previous) => [
          ...new Map(
            [...(cursor ? previous : []), ...choices].map((p) => [p.id, p]),
          ).values(),
        ]);
        setCursor(result.continueCursor);
        setDone(result.isDone);
      } catch (e) {
        if (mounted.current && request === remoteRequest.current)
          setRemoteError(String(e));
      } finally {
        if (mounted.current && request === remoteRequest.current)
          setRemoteLoading(false);
      }
    },
    [convex],
  );
  useEffect(() => {
    if (authenticated) void loadRemote(null);
    else {
      setLocation("all");
      remoteRequest.current++;
      setRemote([]);
      setRemoteLoading(false);
      setDone(true);
      setRemoteError("");
    }
  }, [authenticated, loadRemote]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    listLocalCreations()
      .then((items) => {
        if (active) {
          setLocal(items);
          setLocalError(false);
        }
      })
      .catch(() => {
        if (active) setLocalError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry]);
  const currentKey = !projectId
    ? draftId
      ? `guest:${draftId}`
      : "guest"
    : undefined;
  const choices = useMemo(
    () =>
      [
        ...remote.filter((p) => p.id !== projectId),
        ...local
          .filter((p) => p.key !== currentKey)
          .map((p) => ({
            id: p.key,
            title: p.title,
            scene: p.scene,
            location: "local" as const,
            updatedAt: p.updatedAt,
            cacheKey: `local:${p.key}:${p.stamp}`,
          })),
      ]
        .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
        .map((choice) => {
          try {
            const scene = validateScene(
              typeof choice.scene === "string"
                ? JSON.parse(choice.scene)
                : choice.scene,
            );
            return {
              ...choice,
              partCount: scene.nodes.filter((node) => node.kind === "part")
                .length,
              invalid: false,
            };
          } catch {
            return { ...choice, partCount: 0, invalid: true };
          }
        }),
    [remote, local, projectId, currentKey],
  );
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("fr");
  const query = normalize(search.trim());
  const visibleChoices = choices.filter(
    (choice) =>
      (location === "all" || choice.location === location) &&
      normalize(choice.title).includes(query),
  );
  const selection = choices.find((choice) => choice.id === selected?.id);
  const isLoading = loading || remoteLoading;
  const doImport = async () => {
    if (!selected || !selection?.partCount || busy) return;
    setBusy(true);
    setError("");
    const destination = useEditor.getState().scene;
    try {
      let scene: SceneDocument, title: string, receiptIds: string[], sources;
      if (selected.location === "online") {
        if (!navigator.onLine)
          throw Error(
            "Hors ligne : reconnectez-vous pour importer un projet en ligne.",
          );
        const source = await prepare({ id: selected.id as Id<"projects"> });
        scene = validateScene(JSON.parse(source.scene));
        title = source.title;
        receiptIds = [source.receiptId];
        sources = source.sources;
      } else {
        const source = await readDraft(selected.id);
        if (!source)
          throw Error("Ce projet n’est plus disponible sur cet appareil.");
        const provenance: ProjectProvenance =
          source.provenance ?? emptyProvenance();
        receiptIds = provenance.imports.flatMap((item) => item.receiptIds);
        if (provenance.originReceiptId)
          receiptIds.push(provenance.originReceiptId);
        else if (provenance.origin && provenance.originSourceProjectId) {
          if (!navigator.onLine)
            throw Error(
              "Reconnectez-vous pour conserver l’attribution de ce projet.",
            );
          const prepared = await prepare({
            id: provenance.originSourceProjectId as Id<"projects">,
          });
          if (prepared.originReceiptId)
            receiptIds.push(prepared.originReceiptId);
        }
        scene = validateScene(source.scene);
        title = source.title;
        sources = projectSources(provenance);
      }
      if (!mounted.current) return;
      if (useEditor.getState().scene !== destination)
        throw Error("La construction a changé pendant l’import. Réessayez.");
      useEditor.getState().importProject(scene, {
        id: crypto.randomUUID(),
        title,
        receiptIds: [...new Set(receiptIds)],
        sources,
      });
      onClose();
    } catch (e) {
      if (mounted.current) setError(String(e));
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="project-import-dialog" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>Importer une création</DialogTitle>
          <DialogDescription>
            Retrouvez vos projets et assemblez-les ici. La copie sera placée
            dans un nouveau groupe, à un emplacement libre.
          </DialogDescription>
        </DialogHeader>
        <div className="project-import-browser">
          <div className="project-import-tools">
            <label className="project-import-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                aria-label="Rechercher parmi les projets chargés"
                placeholder="Rechercher une création…"
                value={search}
                disabled={busy}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button
                  type="button"
                  aria-label="Effacer la recherche"
                  disabled={busy}
                  onClick={() => setSearch("")}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </label>
            <div
              className="project-import-filters"
              role="group"
              aria-label="Emplacement des projets"
            >
              {locationFilters
                .filter((filter) => authenticated || filter.value !== "online")
                .map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    aria-pressed={location === filter.value}
                    disabled={busy}
                    onClick={() => setLocation(filter.value)}
                  >
                    {filter.label}
                  </button>
                ))}
            </div>
          </div>
          {localError && (
            <div className="project-import-error" role="alert">
              Les projets de cet appareil n’ont pas pu être chargés.{" "}
              <button
                disabled={busy || loading}
                onClick={() => setRetry((n) => n + 1)}
              >
                Réessayer
              </button>
            </div>
          )}
          {remoteError && (
            <div className="project-import-error" role="alert">
              {remoteError}{" "}
              <button
                disabled={busy || remoteLoading}
                onClick={() => void loadRemote(cursor)}
              >
                Réessayer
              </button>
            </div>
          )}
          <div className="project-import-results">
            <span role="status">
              {visibleChoices.length} création
              {visibleChoices.length === 1 ? "" : "s"}
            </span>
            {authenticated && !done && location !== "local" && (
              <span>Parmi les projets chargés</span>
            )}
          </div>
          <div
            className="project-import-scroll"
            aria-label="Projets à importer"
            aria-busy={isLoading}
          >
            <div className="project-import-list">
              {visibleChoices.map((choice) => {
                const checked = selected?.id === choice.id;
                return (
                  <button
                    key={choice.id}
                    type="button"
                    className="project-import-choice"
                    disabled={busy || !choice.partCount}
                    aria-pressed={checked}
                    aria-label={`Choisir ${choice.title}${choice.invalid ? " — indisponible" : !choice.partCount ? " — sans pièces" : ""}`}
                    onClick={() => {
                      setSelected(choice);
                      setError("");
                    }}
                  >
                    <div className="project-import-thumbnail">
                      <CreationPreview
                        scene={choice.scene}
                        cacheKey={choice.cacheKey}
                        title={choice.title}
                      />
                      <span className="project-import-check" aria-hidden="true">
                        {checked && <Check size={14} />}
                      </span>
                    </div>
                    <span className="project-import-copy">
                      <strong title={choice.title}>{choice.title}</strong>
                      <span className="project-import-meta">
                        <span>
                          {choice.location === "online" ? (
                            <Cloud size={12} aria-hidden="true" />
                          ) : (
                            <HardDrive size={12} aria-hidden="true" />
                          )}
                          {choice.location === "online"
                            ? "En ligne"
                            : "Sur cet appareil"}
                        </span>
                        <span>
                          {choice.invalid
                            ? "Indisponible"
                            : `${choice.partCount} pièce${choice.partCount === 1 ? "" : "s"}`}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {isLoading && (
              <p className="project-import-loading" role="status">
                <LoaderCircle
                  size={16}
                  className="animate-spin"
                  aria-hidden="true"
                />
                Chargement de vos projets…
              </p>
            )}
            {!isLoading && !visibleChoices.length && (
              <div className="project-import-empty">
                <strong>
                  {choices.length
                    ? "Aucune création trouvée"
                    : "Pas encore d’autre création"}
                </strong>
                <p>
                  {choices.length
                    ? "Essayez un autre nom ou un autre emplacement."
                    : localError || remoteError
                      ? "Réessayez de charger vos projets pour les retrouver ici."
                      : "Vos autres créations apparaîtront ici, prêtes à rejoindre votre construction."}
                </p>
                {(search || location !== "all") && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setSearch("");
                      setLocation("all");
                    }}
                  >
                    Afficher toutes les créations
                  </button>
                )}
              </div>
            )}
            {authenticated && !done && !remoteError && location !== "local" && (
              <Button
                className="project-import-more"
                variant="ghost"
                disabled={busy || remoteLoading}
                onClick={() => void loadRemote(cursor)}
              >
                <Plus size={15} aria-hidden="true" />
                Voir plus de projets
              </Button>
            )}
          </div>
        </div>
        <DialogFooter>
          {error && (
            <p className="project-import-error" role="alert">
              {error}
            </p>
          )}
          <div className="project-import-summary" role="status">
            <strong>{selection?.title || "Choisissez une création"}</strong>
            <span>
              {selection
                ? `${selection.partCount} pièce${selection.partCount === 1 ? "" : "s"} · Sources conservées`
                : "Votre projet d’origine reste intact."}
            </span>
          </div>
          <div className="project-import-actions">
            <Button variant="ghost" disabled={busy} onClick={onClose}>
              Annuler
            </Button>
            <Button
              disabled={!selection?.partCount || busy}
              onClick={() => void doImport()}
            >
              {busy ? (
                <LoaderCircle
                  className="animate-spin"
                  size={16}
                  aria-hidden="true"
                />
              ) : (
                <ArrowDownToLine size={16} aria-hidden="true" />
              )}
              {busy ? "Import en cours…" : "Importer le projet"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
