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
      <DialogContent
        className="project-import-dialog p-0 gap-0 overflow-hidden border border-solid border-[#e1e7ef] flex flex-col w-180 max-w-[calc(100vw-32px)]! max-h-[min(820px,calc(100dvh-32px))] rounded-2xl bg-white text-[#26344c] [transition-property:opacity,transform] [box-shadow:0_24px_80px_#1b2d4926] [@media(width<=520px)]:max-w-[calc(100vw-20px)]! [@media(width<=520px)]:max-h-[calc(100dvh-20px)] [@media(width<=520px)]:rounded-[12px]"
        showCloseButton={!busy}
      >
        <DialogHeader className="px-7 shrink-0 pt-6.5 pb-5.5 [@media(width<=520px)]:px-4.5 [@media(width<=520px)]:pt-5.5 [@media(width<=520px)]:pb-4.5">
          <DialogTitle className="pr-6 text-2xl font-[750] tracking-[-0.8px] leading-tight [@media(width<=520px)]:text-[22px]">
            Importer une création
          </DialogTitle>
          <DialogDescription className="max-w-127.5 mt-1.5 text-[#718098] text-[13px] leading-[1.6]">
            Retrouvez vos projets et assemblez-les ici. La copie sera placée
            dans un nouveau groupe, à un emplacement libre.
          </DialogDescription>
        </DialogHeader>
        <div className="project-import-browser px-7 py-0 flex flex-col min-h-0 [@media(width<=520px)]:px-4.5">
          <div className="project-import-tools shrink-0">
            <label className="project-import-search px-3 py-0 gap-2.5 border border-solid border-[#e1e7ef] flex items-center h-10.5 rounded-[8px] bg-[#f8fafc] text-[#8090a6] focus-within:border-[#8daaf0] focus-within:bg-white">
              <Search size={16} aria-hidden="true" />
              <input
                className="outline-offset-3 border-0 border-none border-current flex-1 min-w-0 h-full outline-none bg-transparent text-[#26344c] text-[13px] placeholder:text-[#8090a6] [&::-webkit-search-cancel-button]:appearance-none"
                type="search"
                aria-label="Rechercher parmi les projets chargés"
                placeholder="Rechercher une création…"
                value={search}
                disabled={busy}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button
                  className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 grid place-items-center rounded-[5px] hover:bg-[#eaf0fb] hover:text-[#356ae6] size-6.5"
                  type="button"
                  aria-label="Effacer la recherche"
                  disabled={busy}
                  onClick={() => setSearch("")}
                >
                  <X className="shrink-0" size={14} aria-hidden="true" />
                </button>
              )}
            </label>
            <div
              className="project-import-filters gap-1 flex mt-3"
              role="group"
              aria-label="Emplacement des projets"
            >
              {locationFilters
                .filter((filter) => authenticated || filter.value !== "online")
                .map((filter) => (
                  <button
                    className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 px-2.5 py-1.5 rounded-[6px] text-[#748198] text-xs leading-[inherit] font-[550] hover:bg-[#f1f4f9] hover:text-[#26344c] aria-pressed:bg-[#edf2ff] aria-pressed:text-[#356ae6]"
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
            <div
              className="project-import-error group/project-import-error px-3 py-2.5 mt-3 bg-[#fff1ef] rounded-[7px] text-[#af4e3a] text-xs leading-[inherit]"
              role="alert"
            >
              Les projets de cet appareil n’ont pas pu être chargés.{" "}
              <button
                className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 underline underline-offset-3"
                disabled={busy || loading}
                onClick={() => setRetry((n) => n + 1)}
              >
                Réessayer
              </button>
            </div>
          )}
          {remoteError && (
            <div
              className="project-import-error group/project-import-error px-3 py-2.5 mt-3 bg-[#fff1ef] rounded-[7px] text-[#af4e3a] text-xs leading-[inherit]"
              role="alert"
            >
              {remoteError}{" "}
              <button
                className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 underline underline-offset-3"
                disabled={busy || remoteLoading}
                onClick={() => void loadRemote(cursor)}
              >
                Réessayer
              </button>
            </div>
          )}
          <div className="project-import-results px-0 gap-2 flex justify-between pt-4 pb-2.5 text-[#8490a2] text-[11px]">
            <span role="status">
              {visibleChoices.length} création
              {visibleChoices.length === 1 ? "" : "s"}
            </span>
            {authenticated && !done && location !== "local" && (
              <span>Parmi les projets chargés</span>
            )}
          </div>
          <div
            className="project-import-scroll min-h-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] pt-0.5 pr-1.5 pb-5 pl-0.5"
            aria-label="Projets à importer"
            aria-busy={isLoading}
          >
            <div className="project-import-list gap-3.5 grid grid-cols-2 [@media(width<=520px)]:grid-cols-[minmax(0,1fr)]">
              {visibleChoices.map((choice) => {
                const checked = selected?.id === choice.id;
                return (
                  <button
                    key={choice.id}
                    type="button"
                    className="cursor-pointer outline-offset-3 project-import-choice p-0 overflow-hidden border border-solid border-[#e1e7ef] flex flex-col min-w-0 rounded-[10px] text-left bg-white [transition:border-color_150ms] hover:enabled:border-[#a5b8d8] aria-pressed:border-[#356ae6] aria-pressed:[box-shadow:0_0_0_1px_#356ae6] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:-outline-offset-4 disabled:opacity-50 disabled:cursor-not-allowed group/project-import-choice"
                    disabled={busy || !choice.partCount}
                    aria-pressed={checked}
                    aria-label={`Choisir ${choice.title}${choice.invalid ? " — indisponible" : !choice.partCount ? " — sans pièces" : ""}`}
                    onClick={() => {
                      setSelected(choice);
                      setError("");
                    }}
                  >
                    <div className="project-import-thumbnail overflow-hidden relative w-full h-37.5 shrink-0 bg-[#f0f3f8] [@media(width<=520px)]:h-40">
                      <CreationPreview
                        placeholderClassName="min-h-0 text-[11px]"
                        imageClassName="object-contain size-full"
                        className="size-full"
                        scene={choice.scene}
                        cacheKey={choice.cacheKey}
                        title={choice.title}
                      />
                      <span
                        className="project-import-check group/project-import-check border border-solid border-[#cfd9e7] absolute top-2.5 right-2.5 grid place-items-center rounded-[6px] bg-[#ffffffe0] text-white size-5.75 group-aria-pressed/project-import-choice:border-[#356ae6] group-aria-pressed/project-import-choice:bg-[#356ae6]"
                        aria-hidden="true"
                      >
                        {checked && <Check className="shrink-0" size={14} />}
                      </span>
                    </div>
                    <span className="project-import-copy px-3.5 py-3 block w-full min-w-0">
                      <strong
                        className="overflow-hidden block text-ellipsis whitespace-nowrap text-[#26344c] text-[13px] font-[650]"
                        title={choice.title}
                      >
                        {choice.title}
                      </strong>
                      <span className="project-import-meta flex flex-wrap items-center justify-between gap-y-1 gap-x-2 mt-1.75 text-[#7c899d] text-[10px]">
                        <span className="gap-1 inline-flex items-center">
                          {choice.location === "online" ? (
                            <Cloud
                              className="shrink-0"
                              size={12}
                              aria-hidden="true"
                            />
                          ) : (
                            <HardDrive
                              className="shrink-0"
                              size={12}
                              aria-hidden="true"
                            />
                          )}
                          {choice.location === "online"
                            ? "En ligne"
                            : "Sur cet appareil"}
                        </span>
                        <span className="gap-1 inline-flex items-center">
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
              <p
                className="project-import-loading px-0 py-7 gap-2 flex items-center justify-center text-[#7c899d] text-xs leading-[inherit]"
                role="status"
              >
                <LoaderCircle
                  size={16}
                  className="animate-spin"
                  aria-hidden="true"
                />
                Chargement de vos projets…
              </p>
            )}
            {!isLoading && !visibleChoices.length && (
              <div className="project-import-empty px-5 py-10.5 gap-2 grid justify-items-center text-center">
                <strong className="text-[#465771] text-[15px]">
                  {choices.length
                    ? "Aucune création trouvée"
                    : "Pas encore d’autre création"}
                </strong>
                <p className="max-w-80 text-[#7c899d] text-[13px] leading-[1.6]">
                  {choices.length
                    ? "Essayez un autre nom ou un autre emplacement."
                    : localError || remoteError
                      ? "Réessayez de charger vos projets pour les retrouver ici."
                      : "Vos autres créations apparaîtront ici, prêtes à rejoindre votre construction."}
                </p>
                {(search || location !== "all") && (
                  <button
                    className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 text-[#356ae6] text-xs leading-[inherit] underline underline-offset-3"
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
                className="project-import-more mx-auto flex mt-3.5 mb-0 text-[#356ae6] text-xs"
                variant="ghost"
                disabled={busy || remoteLoading}
                onClick={() => void loadRemote(cursor)}
              >
                <Plus
                  className="size-4 pointer-events-none shrink-0"
                  size={15}
                  aria-hidden="true"
                />
                Voir plus de projets
              </Button>
            )}
          </div>
        </div>
        <DialogFooter className="px-7 py-4.5 gap-4 grid grid-cols-[minmax(0,1fr)_auto] items-center shrink-0 border-t border-solid border-t-[#e8edf5] bg-[#fafbfd] [@media(width<=520px)]:px-4.5 [@media(width<=520px)]:py-3.5 [@media(width<=520px)]:gap-3 [@media(width<=520px)]:grid-cols-[minmax(0,1fr)]">
          {error && (
            <p
              className="project-import-error group/project-import-error px-3 py-2.5 bg-[#fff1ef] rounded-[7px] text-[#af4e3a] text-xs leading-[inherit] m-0 col-span-full"
              role="alert"
            >
              {error}
            </p>
          )}
          <div
            className="project-import-summary gap-1 grid min-w-0"
            role="status"
          >
            <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-xs leading-[inherit] font-semibold">
              {selection?.title || "Choisissez une création"}
            </strong>
            <span className="text-[#8190a4] text-[11px]">
              {selection
                ? `${selection.partCount} pièce${selection.partCount === 1 ? "" : "s"} · Sources conservées`
                : "Votre projet d’origine reste intact."}
            </span>
          </div>
          <div className="project-import-actions gap-2 flex items-center [@media(width<=520px)]:justify-end">
            <Button
              className="px-3.5 gap-1.75 min-h-9.5 rounded-[7px] text-xs"
              variant="ghost"
              disabled={busy}
              onClick={onClose}
            >
              Annuler
            </Button>
            <Button
              className="px-3.5 gap-1.75 min-h-9.5 rounded-[7px] text-xs"
              disabled={!selection?.partCount || busy}
              onClick={() => void doImport()}
            >
              {busy ? (
                <LoaderCircle
                  className="size-4 pointer-events-none shrink-0 animate-spin"
                  size={16}
                  aria-hidden="true"
                />
              ) : (
                <ArrowDownToLine
                  className="size-4 pointer-events-none shrink-0"
                  size={16}
                  aria-hidden="true"
                />
              )}
              {busy ? "Import en cours…" : "Importer le projet"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
