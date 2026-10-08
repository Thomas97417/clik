import { cn } from "@/lib/utils";
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
        className={cn(
          "project-import-dialog p-[0] gap-[0] overflow-hidden border-[length:1px] border-solid border-[color:#e1e7ef] flex flex-col w-[720px] max-w-[calc(100vw_-_32px)]! max-h-[min(820px,_calc(100dvh_-_32px))] rounded-[16px] bg-[#fff] text-[color:#26344c] [transition-property:opacity,_transform] [box-shadow:0_24px_80px_#1b2d4926] [@media(width<=520px)]:max-w-[calc(100vw_-_20px)]! [@media(width<=520px)]:max-h-[calc(100dvh_-_20px)] [@media(width<=520px)]:rounded-[12px] [&_[data-slot='dialog-header']]:px-[28px] [&_[data-slot='dialog-header']]:shrink-[0] [&_[data-slot='dialog-header']]:pt-[26px] [&_[data-slot='dialog-header']]:pb-[22px] [@media(width<=520px)]:[&_[data-slot='dialog-header']]:px-[18px] [@media(width<=520px)]:[&_[data-slot='dialog-header']]:pt-[22px] [@media(width<=520px)]:[&_[data-slot='dialog-header']]:pb-[18px] [&_[data-slot='dialog-title']]:pr-[24px] [&_[data-slot='dialog-title']]:[font-size:24px] [&_[data-slot='dialog-title']]:font-[750] [&_[data-slot='dialog-title']]:tracking-[-0.8px] [&_[data-slot='dialog-title']]:leading-[1.25] [@media(width<=520px)]:[&_[data-slot='dialog-title']]:[font-size:22px] [&_[data-slot='dialog-description']]:max-w-[510px] [&_[data-slot='dialog-description']]:mt-[6px] [&_[data-slot='dialog-description']]:text-[color:#718098] [&_[data-slot='dialog-description']]:[font-size:13px] [&_[data-slot='dialog-description']]:leading-[1.6] [&_[data-slot='dialog-footer']]:px-[28px] [&_[data-slot='dialog-footer']]:py-[18px] [&_[data-slot='dialog-footer']]:gap-[16px] [&_[data-slot='dialog-footer']]:grid [&_[data-slot='dialog-footer']]:grid-cols-[minmax(0,_1fr)_auto] [&_[data-slot='dialog-footer']]:items-center [&_[data-slot='dialog-footer']]:shrink-[0] [&_[data-slot='dialog-footer']]:[border-top-width:1px] [&_[data-slot='dialog-footer']]:[border-top-style:solid] [&_[data-slot='dialog-footer']]:[border-top-color:#e8edf5] [&_[data-slot='dialog-footer']]:bg-[#fafbfd] [@media(width<=520px)]:[&_[data-slot='dialog-footer']]:px-[18px] [@media(width<=520px)]:[&_[data-slot='dialog-footer']]:py-[14px] [@media(width<=520px)]:[&_[data-slot='dialog-footer']]:gap-[12px] [@media(width<=520px)]:[&_[data-slot='dialog-footer']]:grid-cols-[minmax(0,_1fr)] [&_[data-slot='dialog-footer']_>_[class~='group/project-import-error']]:m-[0] [&_[data-slot='dialog-footer']_>_[class~='group/project-import-error']]:col-[1_/_-1]",
        )}
        showCloseButton={!busy}
      >
        <DialogHeader>
          <DialogTitle>Importer une création</DialogTitle>
          <DialogDescription>
            Retrouvez vos projets et assemblez-les ici. La copie sera placée
            dans un nouveau groupe, à un emplacement libre.
          </DialogDescription>
        </DialogHeader>
        <div
          className={cn(
            "project-import-browser px-[28px] py-[0] flex flex-col min-h-[0] [@media(width<=520px)]:px-[18px]",
          )}
        >
          <div className={cn("project-import-tools shrink-[0]")}>
            <label
              className={cn(
                "project-import-search px-[12px] py-[0] gap-[10px] border-[length:1px] border-solid border-[color:#e1e7ef] flex items-center h-[42px] rounded-[8px] bg-[#f8fafc] text-[color:#8090a6] [&:focus-within]:border-[color:#8daaf0] [&:focus-within]:bg-[#fff] [&_input]:border-[length:0] [&_input]:border-none [&_input]:border-[color:currentColor] [&_input]:flex-[1] [&_input]:min-w-[0] [&_input]:h-[100%] [&_input]:[outline:none] [&_input]:bg-[transparent] [&_input]:text-[color:#26344c] [&_input]:[font-size:13px] [&_input::placeholder]:text-[color:#8090a6] [&_input::-webkit-search-cancel-button]:[appearance:none] [&_button]:grid [&_button]:[place-items:center] [&_button]:w-[26px] [&_button]:h-[26px] [&_button]:rounded-[5px] [&_button:hover]:bg-[#eaf0fb] [&_button:hover]:text-[color:#356ae6]",
              )}
            >
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
              className={cn(
                "project-import-filters gap-[4px] flex mt-[12px] [&_button]:px-[10px] [&_button]:py-[6px] [&_button]:rounded-[6px] [&_button]:text-[color:#748198] [&_button]:[font-size:12px] [&_button]:font-[550] [&_button:hover]:bg-[#f1f4f9] [&_button:hover]:text-[color:#26344c] [&_button[aria-pressed='true']]:bg-[#edf2ff] [&_button[aria-pressed='true']]:text-[color:#356ae6]",
              )}
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
            <div
              className={cn(
                "project-import-error group/project-import-error px-[12px] py-[10px] mt-[12px] bg-[#fff1ef] rounded-[7px] text-[color:#af4e3a] [font-size:12px] [&_button]:[text-decoration:underline] [&_button]:underline-offset-[3px]",
              )}
              role="alert"
            >
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
            <div
              className={cn(
                "project-import-error group/project-import-error px-[12px] py-[10px] mt-[12px] bg-[#fff1ef] rounded-[7px] text-[color:#af4e3a] [font-size:12px] [&_button]:[text-decoration:underline] [&_button]:underline-offset-[3px]",
              )}
              role="alert"
            >
              {remoteError}{" "}
              <button
                disabled={busy || remoteLoading}
                onClick={() => void loadRemote(cursor)}
              >
                Réessayer
              </button>
            </div>
          )}
          <div
            className={cn(
              "project-import-results px-[0] gap-[8px] flex justify-between pt-[16px] pb-[10px] text-[color:#8490a2] [font-size:11px]",
            )}
          >
            <span role="status">
              {visibleChoices.length} création
              {visibleChoices.length === 1 ? "" : "s"}
            </span>
            {authenticated && !done && location !== "local" && (
              <span>Parmi les projets chargés</span>
            )}
          </div>
          <div
            className={cn(
              "project-import-scroll min-h-[0] overflow-y-auto [overscroll-behavior:contain] [scrollbar-gutter:stable] pt-[2px] pr-[6px] pb-[20px] pl-[2px]",
            )}
            aria-label="Projets à importer"
            aria-busy={isLoading}
          >
            <div
              className={cn(
                "project-import-list gap-[14px] grid grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=520px)]:grid-cols-[minmax(0,_1fr)]",
              )}
            >
              {visibleChoices.map((choice) => {
                const checked = selected?.id === choice.id;
                return (
                  <button
                    key={choice.id}
                    type="button"
                    className={cn(
                      "project-import-choice p-[0] overflow-hidden border-[length:1px] border-solid border-[color:#e1e7ef] flex flex-col min-w-[0] rounded-[10px] text-left bg-[#fff] [transition:border-color_150ms] [&:hover:not(:disabled)]:border-[color:#a5b8d8] [&[aria-pressed='true']]:border-[color:#356ae6] [&[aria-pressed='true']]:[box-shadow:0_0_0_1px_#356ae6] [&:focus-visible]:[outline:2px_solid_#356ae6] [&:focus-visible]:[outline-offset:-4px] [&:disabled]:opacity-[0.5] [&:disabled]:cursor-[not-allowed] [&[aria-pressed='true']_[class~='group/project-import-check']]:border-[color:#356ae6] [&[aria-pressed='true']_[class~='group/project-import-check']]:bg-[#356ae6]",
                    )}
                    disabled={busy || !choice.partCount}
                    aria-pressed={checked}
                    aria-label={`Choisir ${choice.title}${choice.invalid ? " — indisponible" : !choice.partCount ? " — sans pièces" : ""}`}
                    onClick={() => {
                      setSelected(choice);
                      setError("");
                    }}
                  >
                    <div
                      className={cn(
                        "project-import-thumbnail overflow-hidden relative w-[100%] h-[150px] shrink-[0] bg-[#f0f3f8] [@media(width<=520px)]:h-[160px] [&_[class~='group/creation-preview']]:w-[100%] [&_[class~='group/creation-preview']]:h-[100%] [&_[class~='group/creation-preview']_img]:w-[100%] [&_[class~='group/creation-preview']_img]:h-[100%] [&_[class~='group/creation-preview']_img]:object-contain [&_[class~='group/creation-preview-placeholder']]:min-h-[0] [&_[class~='group/creation-preview-placeholder']]:[font-size:11px]",
                      )}
                    >
                      <CreationPreview
                        scene={choice.scene}
                        cacheKey={choice.cacheKey}
                        title={choice.title}
                      />
                      <span
                        className={cn(
                          "project-import-check group/project-import-check border-[length:1px] border-solid border-[color:#cfd9e7] absolute top-[10px] right-[10px] grid [place-items:center] w-[23px] h-[23px] rounded-[6px] bg-[#ffffffe0] text-[color:white]",
                        )}
                        aria-hidden="true"
                      >
                        {checked && <Check size={14} />}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "project-import-copy px-[14px] py-[12px] block w-[100%] min-w-[0] [&_strong]:overflow-hidden [&_strong]:block [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_strong]:text-[color:#26344c] [&_strong]:[font-size:13px] [&_strong]:font-[650]",
                      )}
                    >
                      <strong title={choice.title}>{choice.title}</strong>
                      <span
                        className={cn(
                          "project-import-meta flex flex-wrap items-center justify-between gap-y-[4px] gap-x-[8px] mt-[7px] text-[color:#7c899d] [font-size:10px] [&_>_span]:gap-[4px] [&_>_span]:inline-flex [&_>_span]:items-center",
                        )}
                      >
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
              <p
                className={cn(
                  "project-import-loading px-[0] py-[28px] gap-[8px] flex items-center justify-center text-[color:#7c899d] [font-size:12px]",
                )}
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
              <div
                className={cn(
                  "project-import-empty px-[20px] py-[42px] gap-[8px] grid [justify-items:center] text-center [&_strong]:text-[color:#465771] [&_strong]:[font-size:15px] [&_p]:max-w-[320px] [&_p]:text-[color:#7c899d] [&_p]:[font-size:13px] [&_p]:leading-[1.6] [&_button]:text-[color:#356ae6] [&_button]:[font-size:12px] [&_button]:[text-decoration:underline] [&_button]:underline-offset-[3px]",
                )}
              >
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
                className={cn(
                  "project-import-more mx-[auto] flex mt-[14px] mb-[0] text-[color:#356ae6] [font-size:12px]",
                )}
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
            <p
              className={cn(
                "project-import-error group/project-import-error px-[12px] py-[10px] mt-[12px] bg-[#fff1ef] rounded-[7px] text-[color:#af4e3a] [font-size:12px] [&_button]:[text-decoration:underline] [&_button]:underline-offset-[3px]",
              )}
              role="alert"
            >
              {error}
            </p>
          )}
          <div
            className={cn(
              "project-import-summary gap-[4px] grid min-w-[0] [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_strong]:[font-size:12px] [&_strong]:font-[600] [&_span]:text-[color:#8190a4] [&_span]:[font-size:11px]",
            )}
            role="status"
          >
            <strong>{selection?.title || "Choisissez une création"}</strong>
            <span>
              {selection
                ? `${selection.partCount} pièce${selection.partCount === 1 ? "" : "s"} · Sources conservées`
                : "Votre projet d’origine reste intact."}
            </span>
          </div>
          <div
            className={cn(
              "project-import-actions gap-[8px] flex items-center [@media(width<=520px)]:justify-end [&_button]:px-[14px] [&_button]:gap-[7px] [&_button]:min-h-[38px] [&_button]:rounded-[7px] [&_button]:[font-size:12px]",
            )}
          >
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
