import { useEffect, useRef, useState } from "react";
import {
  useConvex,
  useConvexAuth,
  useConvexConnectionState,
  useMutation,
  useQuery,
} from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import { emptyScene, type ChallengeStock } from "@clik/scene";
import { useEditor } from "./store";
import {
  readDraft,
  writeDraft,
  removeLocalCreation,
  type Draft,
} from "./local";
import { toast } from "sonner";
import { creationMetadata, importInputs } from "./project-metadata";
import { rememberLocalDraft } from "./last-local-draft";
export function useProject(projectId?: string, draftId?: string) {
  const connection = useConvexConnectionState();
  const { isAuthenticated, isLoading } = useConvexAuth(),
    convex = useConvex();
  const remote = useQuery(
    api.projects.get,
    projectId && isAuthenticated ? { id: projectId as Id<"projects"> } : "skip",
  );
  const me = useQuery(api.auth.getCurrentUser, isAuthenticated ? {} : "skip");
  const save = useMutation(api.projects.save),
    create = useMutation(api.projects.create);
  const [ready, setReady] = useState(false),
    [status, setStatus] = useState("Chargement"),
    [conflict, setConflict] = useState(false),
    [retry, setRetry] = useState(0);
  const key = projectId
      ? `project:${me?._id ?? "pending"}:${projectId}`
      : draftId
        ? `guest:${draftId}`
        : "guest",
    serial = useEditor((s) => s.serial),
    gesture = useEditor((s) => s.gesture);
  const revision = useRef(0),
    stamp = useRef(""),
    queue = useRef(Promise.resolve()),
    busy = useRef(false),
    loaded = useRef(""),
    channel = useRef<BroadcastChannel | null>(null),
    savedSerial = useRef(0),
    transferred = useRef(false);
  const backup = async (dirty: boolean) => {
    // Queued effects from the old editor must not recreate a transferred draft.
    if (transferred.current) return;
    const s = useEditor.getState(),
      draft: Draft = {
        scene: s.gesture?.scene ?? s.scene,
        title: s.gesture?.title ?? s.title,
        revision: revision.current,
        stamp: crypto.randomUUID(),
        dirty,
        provenance: s.gesture?.provenance ?? s.provenance,
      };
    await writeDraft(key, draft, stamp.current);
    stamp.current = draft.stamp;
    channel.current?.postMessage(draft.stamp);
  };
  useEffect(() => {
    if ((projectId && (!remote || !me)) || loaded.current === key) return;
    loaded.current = key;
    let alive = true;
    setReady(false);
    readDraft(key)
      .then((local) => {
        if (!alive) return;
        revision.current = local?.dirty
          ? local.revision
          : (remote?.revision ?? 0);
        stamp.current = local?.stamp ?? "";
        const recover = local && (!projectId || local.dirty);
        useEditor.getState().load(
          recover
            ? local.scene
            : remote
              ? JSON.parse(remote.scene)
              : emptyScene(),
          recover ? local.title : (remote?.title ?? "Ma première création"),
          remote?.challenge
            ? {
                stock: remote.challenge.stock as ChallengeStock,
                closesAt: remote.challenge.closesAt,
                serverOffset: remote.serverNow - Date.now(),
              }
            : null,
          recover && local.provenance
            ? local.provenance
            : {
                origin: remote?.origin,
                originReceiptId: remote?.originReceiptId,
                originSourceProjectId:
                  remote?.origin && !remote.originReceiptId
                    ? projectId
                    : undefined,
                imports: remote?.imports ?? [],
              },
        );
        savedSerial.current = local?.dirty && projectId ? -1 : 0;
        setConflict(
          !!(local?.dirty && remote && local.revision !== remote.revision),
        );
        if (!projectId) rememberLocalDraft(draftId ?? "");
        setReady(true);
        setStatus(navigator.onLine ? "Enregistré" : "Hors ligne");
      })
      .catch((e) => {
        setStatus("Sauvegarde locale indisponible");
        toast.error(String(e));
      });
    return () => {
      alive = false;
      loaded.current = "";
    };
  }, [key, !!(projectId && remote), !!(projectId && me)]);
  useEffect(() => {
    const on = () => {
        setRetry((n) => n + 1);
        setStatus(
          useEditor.getState().serial === savedSerial.current
            ? "Enregistré"
            : "Enregistrement",
        );
      },
      off = () => setStatus("Hors ligne");
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const c = new BroadcastChannel(`clik:${key}`);
    channel.current = c;
    c.onmessage = (e) => {
      if (e.data !== stamp.current) setConflict(true);
    };
    return () => {
      c.close();
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [key]);
  useEffect(() => {
    if (!projectId || !ready) return;
    if (connection.isWebSocketConnected) {
      setRetry((n) => n + 1);
      setStatus(
        useEditor.getState().serial === savedSerial.current
          ? "Enregistré"
          : "Enregistrement",
      );
    } else setStatus("Hors ligne");
  }, [connection.isWebSocketConnected, projectId, ready]);
  const copyLocal = async () => {
    const id = crypto.randomUUID(),
      current = useEditor.getState();
    await writeDraft(`guest:${id}`, {
      scene: current.scene,
      title: `${current.title.slice(0, 90)} · copie`,
      revision: 0,
      stamp: crypto.randomUUID(),
      dirty: false,
      provenance: current.provenance,
    });
    return id;
  };
  const flush = async () => {
    if (!ready || conflict || gesture)
      throw Error("Résolvez le conflit ou terminez la manipulation.");
    if (!projectId) {
      setStatus("Enregistrement");
      queue.current = queue.current
        .catch(() => {})
        .then(async () => {
          const current = useEditor.getState();
          if (current.gesture)
            throw Error("Terminez la manipulation avant de sauvegarder.");
          await backup(false);
          savedSerial.current = current.serial;
        });
      try {
        await queue.current;
        setStatus(navigator.onLine ? "Enregistré" : "Hors ligne");
        return revision.current;
      } catch (error) {
        if (String(error).includes("LOCAL_CONFLICT")) setConflict(true);
        setStatus("Sauvegarde locale indisponible");
        throw error;
      }
    }
    await queue.current;
    if (useEditor.getState().gesture)
      throw Error("Terminez la manipulation avant de publier.");
    if (!navigator.onLine)
      throw Error("Hors ligne : votre création reste sur cet appareil.");
    if (busy.current)
      throw Error("Enregistrement en cours, réessayez dans un instant.");
    busy.current = true;
    const s = useEditor.getState(),
      sentSerial = s.serial;
    setStatus("Enregistrement");
    try {
      const rev = await save({
        id: projectId as Id<"projects">,
        scene: JSON.stringify(s.scene),
        title: s.title,
        revision: revision.current,
        imports: importInputs(s.provenance),
      });
      revision.current = rev;
      savedSerial.current = sentSerial;
      queue.current = queue.current.then(() =>
        backup(useEditor.getState().serial !== sentSerial),
      );
      await queue.current;
      setStatus("Enregistré");
      return rev;
    } catch (e) {
      if (
        String(e).includes("CONFLICT") ||
        String(e).includes("LOCAL_CONFLICT")
      )
        setConflict(true);
      setStatus(navigator.onLine ? "Enregistrement impossible" : "Hors ligne");
      throw e;
    } finally {
      busy.current = false;
      setRetry((n) => n + 1);
    }
  };
  useEffect(() => {
    if (!ready || conflict || gesture || serial === savedSerial.current) return;
    setStatus(navigator.onLine ? "Enregistrement" : "Hors ligne");
    queue.current = queue.current
      .catch(() => {})
      .then(() => backup(!!projectId))
      .then(() => {
        if (!projectId) {
          savedSerial.current = serial;
          setStatus(navigator.onLine ? "Enregistré" : "Hors ligne");
        }
      })
      .catch((e) => {
        if (String(e).includes("LOCAL_CONFLICT")) setConflict(true);
        else setStatus("Sauvegarde locale indisponible");
      });
    const timer = window.setTimeout(() => {
      if (projectId && navigator.onLine && !busy.current)
        void flush().catch((e) => toast.error(String(e)));
    }, 1000);
    return () => clearTimeout(timer);
  }, [serial, ready, conflict, gesture, retry]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (
        (projectId && useEditor.getState().serial !== savedSerial.current) ||
        busy.current
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [projectId]);
  const reload = async () => {
    await queue.current.catch(() => {});
    const local = await readDraft(key);
    stamp.current = local?.stamp ?? "";
    const p = projectId
      ? await convex.query(api.projects.get, {
          id: projectId as Id<"projects">,
        })
      : null;
    useEditor.getState().load(
      p ? JSON.parse(p.scene) : (local?.scene ?? emptyScene()),
      p?.title ?? local?.title ?? "Ma création",
      p?.challenge
        ? {
            stock: p.challenge.stock as ChallengeStock,
            closesAt: p.challenge.closesAt,
            serverOffset: p.serverNow - Date.now(),
          }
        : null,
      p
        ? {
            origin: p.origin,
            originReceiptId: p.originReceiptId,
            originSourceProjectId:
              p.origin && !p.originReceiptId ? projectId : undefined,
            imports: p.imports ?? [],
          }
        : local?.provenance,
    );
    revision.current = p?.revision ?? 0;
    savedSerial.current = 0;
    setConflict(false);
    await backup(false);
    setStatus("Enregistré");
  };
  const copy = async () => {
    if (busy.current)
      throw Error("Enregistrement en cours, réessayez dans un instant.");
    if (useEditor.getState().gesture)
      throw Error("Terminez la manipulation avant de conserver le projet.");
    busy.current = true;
    try {
      await queue.current.catch(() => {});
      if (!projectId && !stamp.current) await backup(false);
      const s = useEditor.getState(),
        sourceStamp = stamp.current;
      const id = await create({
        title: projectId ? `${s.title.slice(0, 90)} · copie` : s.title,
        scene: JSON.stringify(s.scene),
        ...creationMetadata(s.provenance),
        ...(projectId ? { copyFrom: projectId as Id<"projects"> } : {}),
        ...(!projectId ? { localSourceId: `local:${key}:${sourceStamp}` } : {}),
      });
      if (!projectId) {
        try {
          await queue.current;
          // Preserve unsent edits if the scene changed during the request.
          if (useEditor.getState().serial !== s.serial)
            throw Error("La création a changé pendant l’enregistrement.");
          transferred.current = true;
          await removeLocalCreation(key, sourceStamp);
          channel.current?.postMessage("transferred");
        } catch {
          transferred.current = false;
          toast.info(
            "Le projet est enregistré en ligne. La copie locale a été conservée car elle a changé ou n’a pas pu être retirée.",
          );
        }
      }
      return id;
    } finally {
      busy.current = false;
    }
  };
  return {
    ready,
    status,
    conflict,
    reload,
    copy,
    copyLocal,
    flush,
    isAuthenticated,
    isLoading,
    revision: revision.current,
    origin: useEditor.getState().provenance.origin,
    challenge: remote?.challenge,
    publicationId: remote?.publicationId,
  };
}
