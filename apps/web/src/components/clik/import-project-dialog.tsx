import { useCallback, useEffect, useRef, useState } from "react";
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
  Layers,
  LoaderCircle,
  Plus,
  Check,
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
  const choices: Choice[] = [
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
  ].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  const doImport = async () => {
    if (!selected || busy) return;
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
          <span className="project-import-symbol" aria-hidden="true">
            <Layers size={24} />
          </span>
          <DialogTitle>Une création dans votre construction</DialogTitle>
          <DialogDescription>
            Choisissez un projet. Une copie rejoint la scène dans son propre
            groupe, avec ses sources.
          </DialogDescription>
        </DialogHeader>
        {localError && (
          <div className="project-import-error" role="alert">
            Les projets de cet appareil n’ont pas pu être chargés.{" "}
            <button onClick={() => setRetry((n) => n + 1)}>Réessayer</button>
          </div>
        )}
        {remoteError && (
          <div className="project-import-error" role="alert">
            {remoteError}{" "}
            <button
              disabled={remoteLoading}
              onClick={() => void loadRemote(cursor)}
            >
              Réessayer
            </button>
          </div>
        )}
        <div
          className="project-import-list"
          aria-label="Projets à importer"
          aria-busy={loading || remoteLoading}
        >
          {choices.map((choice) => {
            let partCount = 0;
            try {
              partCount = validateScene(
                typeof choice.scene === "string"
                  ? JSON.parse(choice.scene)
                  : choice.scene,
              ).nodes.filter((n) => n.kind === "part").length;
            } catch {
              /* Corrupt local projects cannot be imported. */
            }
            const checked = selected?.id === choice.id;
            return (
              <button
                key={choice.id}
                type="button"
                className="project-import-choice"
                disabled={busy || !partCount}
                aria-pressed={checked}
                aria-label={`Choisir ${choice.title}${!partCount ? " — sans pièces" : ""}`}
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
                </div>
                <span className="project-import-copy">
                  <strong>{choice.title}</strong>
                  <small>
                    {choice.location === "online" ? (
                      <Cloud size={13} />
                    ) : (
                      <HardDrive size={13} />
                    )}
                    {choice.location === "online"
                      ? "En ligne"
                      : "Sur cet appareil"}{" "}
                    · {partCount} pièce{partCount === 1 ? "" : "s"}
                  </small>
                </span>
                <span className="project-import-check" aria-hidden="true">
                  {checked && <Check size={16} />}
                </span>
              </button>
            );
          })}
          {(loading || remoteLoading) && (
            <p role="status">Chargement de vos projets…</p>
          )}
          {!loading &&
            !remoteLoading &&
            !remoteError &&
            !localError &&
            !choices.length && (
              <p>
                Vos autres projets apparaîtront ici. Créez-en un dans « Mes
                créations » pour l’importer.
              </p>
            )}
          {authenticated && !done && !remoteError && (
            <Button
              variant="outline"
              disabled={busy || remoteLoading}
              onClick={() => void loadRemote(cursor)}
            >
              <Plus size={15} />
              Voir plus de projets
            </Button>
          )}
        </div>
        {error && (
          <p className="project-import-error" role="alert">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={!selected || busy} onClick={() => void doImport()}>
            {busy ? (
              <LoaderCircle className="animate-spin" size={16} />
            ) : (
              <Plus size={16} />
            )}
            {busy ? "Import…" : "Importer le projet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
