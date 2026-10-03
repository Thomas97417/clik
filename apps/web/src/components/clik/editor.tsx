import { useEffect, useMemo, useRef, useState, useId } from "react";
import { useTreeDrag } from "./use-tree-drag";
import PublishDialog from "./publish-dialog";
import ImportProjectDialog from "./import-project-dialog";
import ProjectSources from "./project-sources";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAction, useMutation } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import {
  CATALOG,
  countStock,
  COLORS,
  COLOR_NAMES,
  inherited,
  ancestors,
  descendants,
  roots,
  hasOverlappingParts,
  type SceneNode,
  type PartType,
  type Vec3,
  projectSources,
} from "@clik/scene";
import {
  AlertCircle,
  Box,
  CloudCheck,
  CloudUpload,
  Check,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  Eye,
  EyeOff,
  FolderPlus,
  Grid2X2,
  Grip,
  HardDrive,
  Layers,
  ListChecks,
  LockKeyhole,
  LoaderCircle,
  Magnet,
  Move3D,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Redo2,
  Rotate3D,
  Scan,
  Sun,
  Trash2,
  Undo2,
  Ungroup,
  UnlockKeyhole,
  Upload,
  Import,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEditor } from "@/lib/clik/store";
import { useProject } from "@/lib/clik/use-project";
import ClientScene from "./client-scene";
import PartPreview from "./part-preview";
const catalog = Object.entries(CATALOG) as [
  PartType,
  (typeof CATALOG)[PartType],
][];
const pieceCategories = [
  { name: "Toutes", prefix: "" },
  { name: "Briques", prefix: "brick" },
  { name: "Plaques", prefix: "plate" },
  { name: "Pentes", prefix: "slope" },
  { name: "Tuiles", prefix: "tile" },
  { name: "Rondes", prefix: "round" },
  { name: "Angles", prefix: "corner" },
  { name: "Arches", prefix: "arch" },
];
const safe = (fn: () => unknown) => {
  try {
    const value = fn();
    if (value instanceof Promise) value.catch((e) => toast.error(String(e)));
  } catch (e) {
    toast.error(String(e));
  }
};
function ProjectTitle({
  title,
  disabled,
  onCommit,
}: {
  title: string;
  disabled: boolean;
  onCommit: (title: string) => void;
}) {
  const [value, setValue] = useState(title);
  return (
    <label className="project-title-field">
      <span className="sr-only">Nom de la création</span>
      <span className="project-title-measure" aria-hidden="true">
        {value || "Nom de la création"}
      </span>
      <Input
        className="project-title"
        aria-label="Nom du projet"
        title={value}
        placeholder="Nom de la création"
        autoComplete="off"
        value={value}
        size={1}
        disabled={disabled}
        maxLength={100}
        onChange={(e) => setValue(e.currentTarget.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={(e) => {
          const next = e.currentTarget.value.trim() || "Sans titre";
          setValue(next);
          if (next !== title) safe(() => onCommit(next));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            e.stopPropagation();
            e.currentTarget.value = title;
            setValue(title);
            e.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}
function Numeric({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <input
      aria-label={label}
      type="number"
      step="0.1"
      key={value}
      defaultValue={+value.toFixed(3)}
      onBlur={(e) => {
        const n = Number(e.target.value);
        if (Number.isFinite(n) && n !== value) safe(() => onChange(n));
        // A collision may resolve back to the same value, without a React remount.
        e.currentTarget.value = String(+value.toFixed(3));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}
export default function Editor({
  projectId,
  draftId,
}: {
  projectId?: string;
  draftId?: string;
}) {
  // The canvas subscribes to live transforms. Keep the tree and inspector stable
  // during a gesture so a 500-part document does not rebuild its UI each frame.
  const s = useEditor(
      useShallow((state) => ({
        ...state,
        scene: state.gesture?.scene ?? state.scene,
        snapPreview: null,
      })),
    ),
    project = useProject(projectId, draftId),
    navigate = useNavigate();
  const [category, setCategory] = useState("Toutes"),
    [publishing, setPublishing] = useState(false),
    [busy, setBusy] = useState(false),
    [pubTitle, setPubTitle] = useState(""),
    [description, setDescription] = useState("");
  const [importing, setImporting] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!s.challenge) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [s.challenge]);
  const closed =
    !!s.challenge && now + s.challenge.serverOffset >= s.challenge.closesAt;
  useEffect(() => {
    if (closed) {
      useEditor.getState().cancel();
      setPublishing(false);
    }
  }, [closed]);
  const stock = s.challenge?.stock;
  const used = countStock(s.scene);
  const availableCatalog = useMemo(
    () =>
      catalog.filter(
        ([id]) => !stock || stock.some((item) => item.type === id),
      ),
    [stock],
  );
  const remaining = (type: PartType) =>
    stock
      ? (stock.find((item) => item.type === type)?.quantity ?? 0) -
        (used[type] ?? 0)
      : 500;
  const visibleParts = useMemo(() => {
    const prefix =
      pieceCategories.find((c) => c.name === category)?.prefix ?? "";
    return availableCatalog.filter(([id]) => id.startsWith(prefix));
  }, [category, availableCatalog]);
  const libraryScroll = useRef<HTMLDivElement>(null);
  // Presentation state only: folding never changes the scene or its history.
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const treeId = useId();
  const propertiesId = useId();
  const [propertiesCollapsed, setPropertiesCollapsed] = useState(false);
  const paletteId = useId();
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  const [libraryCollapsed, setLibraryCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const libraryId = useId();
  const inspectorId = useId();
  const treeDrag = useTreeDrag({
    scene: s.scene,
    selection: s.selection,
    disabled:
      !project.ready ||
      closed ||
      publishing ||
      busy ||
      inspectorCollapsed ||
      !!s.gesture,
    collapsed: collapsedGroups,
    expand: (id) =>
      setCollapsedGroups((previous) => {
        if (!previous.has(id)) return previous;
        const next = new Set(previous);
        next.delete(id);
        return next;
      }),
  });
  const treeScene = treeDrag.scene;
  const hierarchy = useMemo(() => {
    const children = new Map<string | null, SceneNode[]>();
    const groups = treeScene.nodes.filter((n) => n.kind === "group");
    for (const node of treeScene.nodes) {
      const siblings = children.get(node.parentId) ?? [];
      siblings.push(node);
      children.set(node.parentId, siblings);
    }
    const counts = new Map<string, number>();
    const countParts = (node: SceneNode): number => {
      const count =
        node.kind === "part"
          ? 1
          : (children.get(node.id) ?? []).reduce(
              (sum, child) => sum + countParts(child),
              0,
            );
      counts.set(node.id, count);
      return count;
    };
    (children.get(null) ?? []).forEach(countParts);
    return { children, groups, counts };
  }, [treeScene]);
  const selectedParents = new Set(
    s.selection.flatMap((id) => ancestors(s.scene, id)),
  );
  const selectedParentsKey = JSON.stringify([...selectedParents]);
  useEffect(() => {
    setCollapsedGroups(new Set());
  }, [projectId, draftId]);
  useEffect(() => {
    // Reveal selections made in the canvas or moved into another parent, but
    // allow users to fold a branch while keeping its children selected.
    const parents = JSON.parse(selectedParentsKey) as string[];
    setCollapsedGroups((previous) => {
      if (!parents.some((id) => previous.has(id))) return previous;
      const next = new Set(previous);
      parents.forEach((id) => next.delete(id));
      return next;
    });
  }, [s.selection, selectedParentsKey]);
  const toggleGroup = (id: string) =>
    setCollapsedGroups((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const upload = useAction(api.projects.uploadThumbnail),
    publish = useMutation(api.projects.publish);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        publishing ||
        busy ||
        e.defaultPrevented ||
        e.isComposing ||
        document.querySelector(
          'dialog[open],[role="dialog"],[role="alertdialog"]',
        )
      )
        return;
      if (
        (e.target as HTMLElement)?.closest(
          'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]',
        )
      )
        return;
      const state = useEditor.getState(),
        mod = e.ctrlKey || e.metaKey;
      if (e.key === "Escape") {
        state.cancel();
        return;
      }
      if (state.gesture || state.pending) return;
      if (e.key.toLowerCase() === "r" && !mod && !e.altKey) {
        const target = e.target instanceof HTMLElement ? e.target : null;
        if (
          !project.ready ||
          closed ||
          e.repeat ||
          !state.selection.length ||
          (target && target !== document.body && !target.closest(".editor")) ||
          target?.closest('[role="menu"],[role="listbox"],[role="combobox"]')
        )
          return;
        e.preventDefault();
        safe(() => state.rotate(e.shiftKey ? -1 : 1));
      } else if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
      ) {
        const target = e.target instanceof HTMLElement ? e.target : null;
        if (
          !project.ready ||
          closed ||
          mod ||
          e.altKey ||
          !state.selection.length ||
          (target && target !== document.body && !target.closest(".editor")) ||
          target?.closest(
            '[role="menu"],[role="listbox"],[role="combobox"],[role="slider"],[role="spinbutton"],[role="tablist"],[role="radiogroup"]',
          ) ||
          (e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowRight"))
        )
          return;
        const direction = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
        const delta: Vec3 = e.shiftKey
          ? [0, -direction * 1.2, 0]
          : e.key === "ArrowLeft" || e.key === "ArrowRight"
            ? [direction, 0, 0]
            : [0, 0, direction];
        e.preventDefault();
        safe(() => state.nudge(delta));
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        safe(state.remove);
      } else if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        safe(e.shiftKey ? state.redo : state.undo);
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        safe(state.redo);
      } else if (mod && e.key.toLowerCase() === "c") {
        e.preventDefault();
        safe(state.copy);
      } else if (mod && e.key.toLowerCase() === "v") {
        e.preventDefault();
        safe(state.paste);
      } else if (e.key.toLowerCase() === "d" && !e.altKey) {
        const target = e.target instanceof HTMLElement ? e.target : null;
        if (
          !project.ready ||
          closed ||
          e.repeat ||
          !state.selection.length ||
          (target && target !== document.body && !target.closest(".editor")) ||
          target?.closest('[role="menu"],[role="listbox"],[role="combobox"]')
        )
          return;
        e.preventDefault();
        safe(state.duplicate);
      } else if (mod && e.key.toLowerCase() === "g") {
        e.preventDefault();
        safe(e.shiftKey ? state.ungroup : state.group);
      } else if (e.key.toLowerCase() === "f")
        useEditor.setState({ frame: state.frame + 1 });
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [publishing, busy, project.ready, closed]);
  const selected = s.scene.nodes.find((n) => n.id === s.selection[0]);
  const selectionRoots = roots(s.scene, s.selection);
  const selectionParents = new Set(
    selectionRoots.map(
      (id) => s.scene.nodes.find((n) => n.id === id)!.parentId,
    ),
  );
  const selectionBranches = new Set(descendants(s.scene, selectionRoots));
  const count = s.scene.nodes.filter((n) => n.kind === "part").length;
  const overlap = useMemo(
    () => hasOverlappingParts(s.scene),
    [s.gesture ? null : s.scene],
  );
  const saveState = project.conflict
    ? "conflict"
    : project.status.includes("impossible") ||
        project.status.includes("indisponible")
      ? "error"
      : project.status === "Hors ligne"
        ? "offline"
        : project.status === "Enregistré"
          ? "saved"
          : "saving";
  const SaveIcon =
    saveState === "error" || saveState === "conflict"
      ? AlertCircle
      : saveState === "offline"
        ? WifiOff
        : saveState === "saving"
          ? LoaderCircle
          : projectId
            ? CloudCheck
            : HardDrive;
  const preserve = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const id = await project.copy();
      await navigate({ to: "/editor/$projectId", params: { projectId: id } });
    } finally {
      setBusy(false);
    }
  };
  const doPublish = async () => {
    if (!projectId || busy) return;
    setBusy(true);
    try {
      const revision = await project.flush();
      const { publicationThumbnail } = await import("@/lib/clik/thumbnail");
      const bytes = await publicationThumbnail(
        useEditor.getState().scene,
        `publication:${projectId}:${revision}`,
      );
      const thumbnail = await upload({
        projectId: projectId as Id<"projects">,
        bytes,
      });
      const id = await publish({
        id: projectId as Id<"projects">,
        title: pubTitle,
        description,
        thumbnail,
        revision,
      });
      setPublishing(false);
      toast.success("Votre création est publiée.");
      await navigate({
        to: "/creations/$publicationId",
        params: { publicationId: id },
      });
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusy(false);
    }
  };
  const tree = (parent: string | null, depth = 0): React.ReactNode =>
    (hierarchy.children.get(parent) ?? []).map((n) => {
      const isGroup = n.kind === "group";
      const collapsed =
        isGroup && (collapsedGroups.has(n.id) || treeDrag.ids.includes(n.id));
      const containsSelection = collapsed && selectedParents.has(n.id);
      const childrenId = `${treeId}-${encodeURIComponent(n.id)}`;
      const partCount = hierarchy.counts.get(n.id) ?? 0;
      const countLabel = `${partCount} pièce${partCount === 1 ? "" : "s"}`;
      return (
        <li key={n.id}>
          <div
            data-node-id={n.id}
            className={`tree-row ${s.selection.includes(n.id) ? "selected" : ""} ${containsSelection ? "contains-selection" : ""}`}
            style={{ paddingLeft: 8 + depth * 14 }}
            draggable={false}
            data-drag-source={treeDrag.ids.includes(n.id) || undefined}
            data-drop-inside={
              (treeDrag.target?.mode === "inside" &&
                treeDrag.target.parentId === n.id) ||
              undefined
            }
          >
            {isGroup ? (
              <button
                className="tree-toggle"
                aria-label={`${collapsed ? "Déplier" : "Replier"} ${n.name}`}
                title={`${collapsed ? "Déplier" : "Replier"} ${n.name}`}
                aria-expanded={!collapsed}
                aria-controls={childrenId}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => toggleGroup(n.id)}
              >
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            ) : (
              <span className="tree-toggle-spacer" aria-hidden="true" />
            )}
            <button
              className="tree-name"
              title={n.name}
              aria-pressed={s.selection.includes(n.id)}
              onClick={(e) => s.select(n.id, e.shiftKey)}
            >
              {isGroup ? (
                <Layers size={15} aria-hidden="true" />
              ) : (
                <span className="part-dot" style={{ background: n.color }} />
              )}
              <span>{n.name}</span>
            </button>
            {isGroup && (
              <span
                className="tree-count"
                title={`${countLabel} dans ce groupe${containsSelection ? " · contient la sélection" : ""}`}
                aria-label={`${countLabel}${containsSelection ? ", contient la sélection" : ""}`}
              >
                {containsSelection && (
                  <span className="tree-selection-dot" aria-hidden="true" />
                )}
                {partCount}
              </span>
            )}
            <button
              title={n.hidden ? "Afficher" : "Masquer"}
              onClick={() => safe(() => s.patch(n.id, { hidden: !n.hidden }))}
            >
              {n.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button
              title={n.locked ? "Déverrouiller" : "Verrouiller"}
              onClick={() => safe(() => s.patch(n.id, { locked: !n.locked }))}
            >
              {n.locked ? (
                <LockKeyhole size={14} />
              ) : (
                <UnlockKeyhole size={14} />
              )}
            </button>
          </div>
          {isGroup && (
            <ul id={childrenId} className="tree-branch" hidden={collapsed}>
              {!collapsed && tree(n.id, depth + 1)}
            </ul>
          )}
        </li>
      );
    });
  if (projectId && !project.isLoading && !project.isAuthenticated)
    return (
      <div className="empty-state">
        <h1>Retrouvez votre atelier</h1>
        <p>Connectez-vous pour ouvrir ce projet privé.</p>
        <Link
          to="/sign-in"
          onClick={() =>
            sessionStorage.setItem(
              "clik-return-to",
              window.location.pathname + window.location.search,
            )
          }
          className="primary-link"
        >
          Se connecter
        </Link>
      </div>
    );
  return (
    <>
      <div className="mobile-editor empty-state">
        <Box size={40} />
        <h1>Un peu plus de place pour construire</h1>
        <p>
          L’atelier est disponible sur ordinateur. Explorez les créations depuis
          votre téléphone.
        </p>
        <Link to="/gallery" className="primary-link">
          Voir la galerie
        </Link>
      </div>
      <main className="editor">
        <header className="editor-top" aria-label="Projet et sauvegarde">
          <div className="editor-project">
            <ProjectTitle
              key={`${projectId}-${project.ready}-${s.title}`}
              title={s.title}
              disabled={!project.ready || closed || busy}
              onCommit={(title) => s.commit(s.scene, title)}
            />
            <div className="project-metadata">
              <span
                className="project-visibility"
                title={
                  projectId
                    ? "Ce projet reste privé jusqu’à sa publication."
                    : "Cette création est conservée dans ce navigateur."
                }
              >
                {projectId ? (
                  <LockKeyhole size={11} aria-hidden="true" />
                ) : (
                  <HardDrive size={11} aria-hidden="true" />
                )}
                {projectId ? "Projet privé" : "Création locale"}
              </span>
              {!!s.provenance.imports.length && (
                <span className="assembly-badge">Assemblage</span>
              )}
              <ProjectSources sources={projectSources(s.provenance)} />
            </div>
          </div>
          <div className="editor-project-actions">
            <Button
              className="editor-import-action"
              variant="outline"
              title={
                s.challenge
                  ? "L’import est réservé à l’atelier libre"
                  : "Importer un de vos projets"
              }
              disabled={
                !project.ready ||
                !!s.challenge ||
                !!s.gesture ||
                !!s.pending ||
                !!s.libraryPointer ||
                project.conflict ||
                busy ||
                publishing
              }
              aria-label="Importer un projet"
              onClick={() => setImporting(true)}
            >
              <Import size={16} aria-hidden="true" />
              <span>Importer</span>
            </Button>
            <div
              className="save-status"
              data-state={saveState}
              role="status"
              aria-live="polite"
              aria-atomic="true"
              title={
                saveState === "conflict" || saveState === "error"
                  ? "Sauvegarde interrompue"
                  : projectId
                    ? "Sauvegarde automatique"
                    : "Sauvegarde sur cet appareil"
              }
            >
              <SaveIcon size={14} aria-hidden="true" />
              <span>
                {project.conflict ? "Conflit à résoudre" : project.status}
              </span>
            </div>
            {projectId ? (
              <Button
                className="editor-primary-action"
                disabled={
                  !project.ready || !!s.gesture || project.conflict || closed
                }
                onClick={() => {
                  setPubTitle(s.title);
                  setPublishing(true);
                }}
              >
                <Upload size={15} aria-hidden="true" />{" "}
                {project.challenge
                  ? project.publicationId
                    ? "Mettre à jour ma participation"
                    : "Proposer au défi"
                  : "Publier"}
              </Button>
            ) : project.isAuthenticated ? (
              <Button
                className="editor-primary-action"
                disabled={!project.ready || !!s.gesture || busy}
                onClick={() => safe(preserve)}
              >
                {busy ? (
                  <LoaderCircle
                    size={16}
                    aria-hidden="true"
                    className="animate-spin"
                  />
                ) : (
                  <CloudUpload size={16} aria-hidden="true" />
                )}
                {busy ? "Enregistrement…" : "Conserver le projet"}
              </Button>
            ) : (
              <Link
                to="/sign-in"
                onClick={() =>
                  sessionStorage.setItem(
                    "clik-return-to",
                    window.location.pathname + window.location.search,
                  )
                }
                className="primary-link editor-primary-action"
                aria-label="Se connecter pour sauvegarder"
                title="Se connecter pour retrouver ce projet sur vos autres appareils"
              >
                <CloudUpload size={16} aria-hidden="true" /> Se connecter
              </Link>
            )}
          </div>
        </header>
        {project.challenge && (
          <div className="challenge-editor-banner">
            <Link to="/challenges" search={{ date: project.challenge.day }}>
              Défi du {project.challenge.day} · UTC
            </Link>
            <span>
              {closed
                ? "Participations closes · votre travail privé est conservé"
                : `Clôture dans ${Math.max(0, Math.floor((project.challenge.closesAt - now - (s.challenge?.serverOffset ?? 0)) / 3600000))} h ${Math.max(0, Math.floor((project.challenge.closesAt - now - (s.challenge?.serverOffset ?? 0)) / 60000) % 60)} min`}
            </span>
            {closed && (
              <button disabled={busy} onClick={() => safe(preserve)}>
                Continuer dans une copie libre
              </button>
            )}
          </div>
        )}
        {project.conflict && (
          <div className="conflict" role="alert">
            Cette création a changé dans un autre onglet.{" "}
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => safe(project.reload)}
            >
              Recharger
            </Button>
            {project.isAuthenticated ? (
              <Button disabled={busy} onClick={() => safe(preserve)}>
                Sauvegarder une copie
              </Button>
            ) : (
              <Button
                onClick={() =>
                  safe(async () => {
                    const draft = await project.copyLocal();
                    await navigate({ to: "/editor", search: { draft } });
                  })
                }
              >
                Sauvegarder une copie locale
              </Button>
            )}
          </div>
        )}
        <div
          className="editor-body"
          inert={busy && !publishing}
          data-library-collapsed={libraryCollapsed}
          data-inspector-collapsed={inspectorCollapsed}
        >
          <div className="editor-side editor-side-left">
            <button
              className="side-panel-toggle"
              aria-label={
                libraryCollapsed
                  ? "Déplier la bibliothèque"
                  : "Replier la bibliothèque"
              }
              title={
                libraryCollapsed
                  ? "Déplier la bibliothèque"
                  : "Replier la bibliothèque"
              }
              aria-expanded={!libraryCollapsed}
              aria-controls={libraryId}
              onClick={() => setLibraryCollapsed((collapsed) => !collapsed)}
            >
              {libraryCollapsed ? (
                <PanelLeftOpen size={17} aria-hidden="true" />
              ) : (
                <PanelLeftClose size={17} aria-hidden="true" />
              )}
            </button>
            <aside
              id={libraryId}
              className="library"
              aria-label="Bibliothèque de pièces"
              hidden={libraryCollapsed}
            >
              <div className="library-header">
                <div className="panel-heading panel-heading-collapsible">
                  <div>
                    <h2>Les pièces</h2>
                    <span>
                      {visibleParts.length} modèle
                      {visibleParts.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                <div
                  className="piece-tabs"
                  role="group"
                  aria-label="Catégories de pièces"
                >
                  {pieceCategories.map(({ name, prefix }) => (
                    <button
                      key={name}
                      className={name === category ? "active" : ""}
                      aria-label={name}
                      aria-pressed={name === category}
                      onClick={() => {
                        setCategory(name);
                        if (libraryScroll.current)
                          libraryScroll.current.scrollTop = 0;
                      }}
                    >
                      <span>{name}</span>
                      <span className="category-count" aria-hidden="true">
                        {
                          availableCatalog.filter(([id]) =>
                            id.startsWith(prefix),
                          ).length
                        }
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div
                className="library-scroll"
                ref={libraryScroll}
                role="region"
                aria-label="Modèles de pièces"
                tabIndex={0}
              >
                <div className="piece-grid">
                  {visibleParts.map(([id, p]) => (
                    <button
                      className={`piece-card ${s.pending === id ? "active" : ""}`}
                      key={id}
                      draggable={false}
                      disabled={
                        !project.ready ||
                        closed ||
                        count >= 500 ||
                        remaining(id) <= 0
                      }
                      aria-label={p.name}
                      title={`${p.name} — glisser dans la scène ou cliquer pour ajouter`}
                      onDragStart={(e) => e.preventDefault()}
                      onPointerDown={(e) => {
                        if (e.button !== 0 || !e.isPrimary) return;
                        e.currentTarget.setPointerCapture(e.pointerId);
                        useEditor.setState({
                          pending: null,
                          libraryPointer: {
                            id: e.pointerId,
                            type: id,
                            x: e.clientX,
                            y: e.clientY,
                          },
                          libraryClickSuppressed: false,
                        });
                      }}
                      onClick={(e) => {
                        if (
                          e.detail === 0 ||
                          !useEditor.getState().libraryClickSuppressed
                        )
                          safe(() => s.add(id));
                      }}
                    >
                      {stock && (
                        <span className="piece-stock">
                          {remaining(id)} restante{remaining(id) > 1 ? "s" : ""}
                        </span>
                      )}
                      <span className="piece-preview">
                        <PartPreview type={id} color={s.color} />
                      </span>
                      <span className="piece-name">
                        {p.name.replace(/ \d.*$/, "")}
                        <span className="piece-dimensions">
                          {p.name.match(/\d.*$/)?.[0]}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="library-footer">
                <div className="palette-section">
                  <h2>
                    <button
                      className="palette-toggle"
                      aria-label={
                        paletteCollapsed
                          ? "Déplier les couleurs"
                          : "Replier les couleurs"
                      }
                      aria-expanded={!paletteCollapsed}
                      aria-controls={paletteId}
                      onClick={() =>
                        setPaletteCollapsed((collapsed) => !collapsed)
                      }
                    >
                      <ChevronRight size={16} aria-hidden="true" />
                      Couleurs
                      <span className="palette-current">
                        <span
                          style={{ background: s.color }}
                          aria-hidden="true"
                        />
                        {COLOR_NAMES[COLORS.indexOf(s.color)]}
                      </span>
                    </button>
                  </h2>
                  <div
                    id={paletteId}
                    className="palette"
                    hidden={paletteCollapsed}
                    role="group"
                    aria-label="Choisir une couleur"
                  >
                    {COLORS.map((color, i) => (
                      <button
                        key={color}
                        title={COLOR_NAMES[i]}
                        aria-label={COLOR_NAMES[i]}
                        aria-pressed={s.color === color}
                        className={s.color === color ? "chosen" : ""}
                        onClick={() => {
                          useEditor.setState({ color });
                          const ids = new Set(
                            s.selection.flatMap((id) => [
                              id,
                              ...s.scene.nodes
                                .filter((n) => {
                                  let p = n.parentId;
                                  while (p) {
                                    if (p === id) return true;
                                    p =
                                      s.scene.nodes.find((x) => x.id === p)
                                        ?.parentId ?? null;
                                  }
                                  return false;
                                })
                                .map((n) => n.id),
                            ]),
                          );
                          safe(() =>
                            s.commit({
                              ...s.scene,
                              nodes: s.scene.nodes.map((n) =>
                                n.kind === "part" &&
                                ids.has(n.id) &&
                                !inherited(s.scene, n.id, "locked")
                                  ? { ...n, color }
                                  : n,
                              ),
                            }),
                          );
                        }}
                      >
                        <span
                          className="palette-swatch"
                          style={{
                            background: color,
                            color: [2, 3, 4, 7, 9, 10].includes(i)
                              ? "#fff"
                              : "#25354e",
                          }}
                        >
                          {s.color === color && (
                            <Check
                              size={15}
                              strokeWidth={3}
                              aria-hidden="true"
                            />
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="library-tip">
                  <Grip size={16} aria-hidden="true" />
                  <p>
                    Clic : ajouter une pièce.
                    <br />
                    Glisser : choisir sa place.
                  </p>
                </div>
              </div>
            </aside>
          </div>
          <section className="viewport">
            <div className="scene-toolbar">
              <div className="tool-group">
                <button
                  title="Annuler (⌘/Ctrl Z)"
                  disabled={!s.past.length}
                  onClick={s.undo}
                >
                  <Undo2 size={18} />
                </button>
                <button
                  title="Rétablir"
                  disabled={!s.future.length}
                  onClick={s.redo}
                >
                  <Redo2 size={18} />
                </button>
              </div>
              <div className="tool-group">
                <button
                  title="Déplacer"
                  className={s.tool === "translate" ? "active" : ""}
                  onClick={() => useEditor.setState({ tool: "translate" })}
                >
                  <Move3D size={19} />
                </button>
                <button
                  title="Tourner"
                  className={s.tool === "rotate" ? "active" : ""}
                  onClick={() => useEditor.setState({ tool: "rotate" })}
                >
                  <Rotate3D size={19} />
                </button>
              </div>
              <button
                title="Aimantation"
                aria-pressed={s.snap}
                className={s.snap ? "active" : ""}
                onClick={() => useEditor.setState({ snap: !s.snap })}
              >
                <Magnet size={18} />
                <span>Aimantation</span>
              </button>
              <button
                title={s.showGrid ? "Masquer la grille" : "Afficher la grille"}
                aria-label="Grille"
                aria-pressed={s.showGrid}
                className={s.showGrid ? "active" : ""}
                onClick={() => useEditor.setState({ showGrid: !s.showGrid })}
              >
                <Grid2X2 size={18} />
                <span>Grille</span>
              </button>
              <button
                title="Cadrer la sélection (F)"
                onClick={() => useEditor.setState({ frame: s.frame + 1 })}
              >
                <Scan size={18} />
              </button>
            </div>
            {project.ready ? (
              <ClientScene scene={s.scene} editable={!closed} />
            ) : (
              <div className="empty-state">Chargement de la création…</div>
            )}
            {project.ready && !count && !s.pending && (
              <div className="canvas-empty">
                <span>
                  Une idée commence
                  <br />
                  par une brique.
                </span>
                <p>Choisissez votre première pièce à gauche.</p>
              </div>
            )}
            <div className="viewport-bottom">
              <span>
                {count} /{" "}
                {stock
                  ? stock.reduce((sum, item) => sum + item.quantity, 0)
                  : 500}{" "}
                pièces
              </span>
              {overlap && (
                <span className="overlap">
                  Chevauchement existant à corriger
                </span>
              )}
              <div className="view-select">
                <select
                  aria-label="Vue de la caméra"
                  value={s.view}
                  onChange={(e) =>
                    useEditor.setState({
                      view: e.target.value as typeof s.view,
                    })
                  }
                >
                  <option value="perspective">Perspective</option>
                  <option value="top">Dessus</option>
                  <option value="front">Face</option>
                  <option value="right">Droite</option>
                </select>
                <label className="scene-light-control">
                  <Sun size={16} aria-hidden="true" />
                  <span>Éclairage</span>
                  <input
                    type="range"
                    aria-label="Angle de l’éclairage"
                    aria-valuetext={`${s.lightAngle} degrés`}
                    title="Tourner la lumière autour de la construction"
                    min={0}
                    max={360}
                    step={5}
                    value={s.lightAngle}
                    onChange={(e) =>
                      useEditor.setState({ lightAngle: Number(e.target.value) })
                    }
                  />
                  <span className="scene-light-angle" aria-hidden="true">
                    {s.lightAngle}°
                  </span>
                </label>
              </div>
            </div>
          </section>
          <div className="editor-side editor-side-right">
            <button
              className="side-panel-toggle"
              aria-label={
                inspectorCollapsed
                  ? "Déplier le panneau de construction"
                  : "Replier le panneau de construction"
              }
              title={
                inspectorCollapsed
                  ? "Déplier le panneau de construction"
                  : "Replier le panneau de construction"
              }
              aria-expanded={!inspectorCollapsed}
              aria-controls={inspectorId}
              onClick={() => setInspectorCollapsed((collapsed) => !collapsed)}
            >
              {inspectorCollapsed ? (
                <PanelRightOpen size={17} aria-hidden="true" />
              ) : (
                <PanelRightClose size={17} aria-hidden="true" />
              )}
            </button>
            <aside
              id={inspectorId}
              className="inspector"
              aria-label="Construction et propriétés"
              hidden={inspectorCollapsed}
            >
              <div className="panel-heading panel-heading-collapsible">
                <div>
                  <h2>Construction</h2>
                  <span>{count} pièces</span>
                </div>
              </div>
              <div className="tree-actions">
                <button
                  title="Tout sélectionner"
                  aria-label="Tout sélectionner"
                  disabled={!s.scene.nodes.length}
                  onClick={s.selectAll}
                >
                  <ListChecks size={17} aria-hidden="true" />
                </button>
                <button
                  title={s.selection.length ? "Grouper" : "Nouveau groupe"}
                  onClick={() => safe(s.group)}
                  disabled={
                    !project.ready || closed || !!s.gesture || !!s.pending
                  }
                >
                  <FolderPlus size={17} />
                </button>
                <button
                  title="Dissocier"
                  onClick={() => safe(s.ungroup)}
                  disabled={selected?.kind !== "group"}
                >
                  <Ungroup size={17} />
                </button>
                <button
                  title="Dupliquer (D)"
                  aria-label="Dupliquer"
                  aria-keyshortcuts="d Control+d Meta+d"
                  onClick={() => safe(s.duplicate)}
                  disabled={!s.selection.length}
                >
                  <Copy size={17} />
                </button>
                <button
                  title="Supprimer"
                  onClick={() => safe(s.remove)}
                  disabled={!s.selection.length}
                >
                  <Trash2 size={17} />
                </button>
                <span className="tree-actions-spacer" />
                <button
                  title="Tout replier"
                  aria-label="Tout replier"
                  disabled={
                    !hierarchy.groups.some((n) => !collapsedGroups.has(n.id))
                  }
                  onClick={() =>
                    setCollapsedGroups(
                      new Set(hierarchy.groups.map((n) => n.id)),
                    )
                  }
                >
                  <ChevronsDownUp size={17} />
                </button>
                <button
                  title="Tout déplier"
                  aria-label="Tout déplier"
                  disabled={
                    !hierarchy.groups.some((n) => collapsedGroups.has(n.id))
                  }
                  onClick={() => setCollapsedGroups(new Set())}
                >
                  <ChevronsUpDown size={17} />
                </button>
              </div>
              <div
                ref={treeDrag.container}
                className="tree"
                data-dragging={treeDrag.active || undefined}
                onPointerDown={treeDrag.onPointerDown}
                onDragStart={(event) => event.preventDefault()}
              >
                {s.scene.nodes.length ? (
                  <ul className="tree-branch" aria-label="Pièces et groupes">
                    {tree(null)}
                  </ul>
                ) : (
                  <div className="tree-empty">
                    <Layers size={28} />
                    <p>
                      Votre construction
                      <br />
                      prend place ici.
                    </p>
                  </div>
                )}
              </div>
              <span className="sr-only" role="status" aria-live="polite">
                {treeDrag.active ? treeDrag.target?.label : ""}
              </span>
              <div className="properties">
                <div className="panel-heading">
                  <h2>
                    <button
                      className="properties-toggle"
                      aria-label={
                        propertiesCollapsed
                          ? "Déplier les propriétés"
                          : "Replier les propriétés"
                      }
                      title={
                        propertiesCollapsed
                          ? "Déplier les propriétés"
                          : "Replier les propriétés"
                      }
                      aria-expanded={!propertiesCollapsed}
                      aria-controls={propertiesId}
                      onClick={() =>
                        setPropertiesCollapsed((collapsed) => !collapsed)
                      }
                    >
                      <ChevronRight size={16} aria-hidden="true" />
                      Propriétés
                    </button>
                  </h2>
                  <span>
                    {s.selection.length > 1
                      ? `${s.selection.length} éléments`
                      : ""}
                  </span>
                </div>
                <div
                  id={propertiesId}
                  className="properties-content"
                  hidden={propertiesCollapsed}
                >
                  {selected ? (
                    <>
                      <label>
                        Nom
                        <Input
                          key={selected.id + selected.name}
                          defaultValue={selected.name}
                          maxLength={100}
                          onBlur={(e) =>
                            safe(() =>
                              s.patch(selected.id, {
                                name: e.target.value || selected.name,
                              }),
                            )
                          }
                        />
                      </label>
                      <label>
                        Groupe parent
                        <select
                          value={
                            selectionParents.size > 1
                              ? "mixed"
                              : ([...selectionParents][0] ?? "")
                          }
                          onChange={(e) =>
                            safe(() =>
                              s.reparent(selected.id, e.target.value || null),
                            )
                          }
                        >
                          {selectionParents.size > 1 && (
                            <option value="mixed" disabled>
                              Plusieurs groupes
                            </option>
                          )}
                          <option value="">Racine</option>
                          {s.scene.nodes
                            .filter(
                              (n) => n.kind === "group" && n.id !== selected.id,
                            )
                            .map((n) => (
                              <option
                                key={n.id}
                                value={n.id}
                                disabled={
                                  selectionBranches.has(n.id) ||
                                  inherited(s.scene, n.id, "locked")
                                }
                              >
                                {n.name}
                              </option>
                            ))}
                        </select>
                      </label>
                      {(["position", "rotation"] as const).map((field) => (
                        <div className="transform-fields" key={field}>
                          <label>
                            {field === "position"
                              ? "Position"
                              : "Rotation · degrés"}
                          </label>
                          <div>
                            {["X", "Y", "Z"].map((axis, i) => (
                              <label key={axis}>
                                <span className={`axis-${axis}`}>{axis}</span>
                                <Numeric
                                  label={`${field} ${axis}`}
                                  value={
                                    selected[field][i] *
                                    (field === "rotation" ? 180 / Math.PI : 1)
                                  }
                                  onChange={(value) => {
                                    const values = [...selected[field]] as Vec3;
                                    values[i] =
                                      value /
                                      (field === "rotation"
                                        ? 180 / Math.PI
                                        : 1);
                                    s.patch(selected.id, { [field]: values });
                                  }}
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                      <p className="property-hint">
                        {s.selection.length > 1
                          ? "Le groupe parent s’applique à toute la sélection. Le nom, la position et la rotation concernent le premier élément."
                          : "Dimensions fixes · positions relatives au groupe"}
                      </p>
                    </>
                  ) : (
                    <p className="property-hint">
                      Sélectionnez une pièce pour la modifier. Maintenez Maj
                      pour en sélectionner plusieurs.
                    </p>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
        <footer className="editor-footer">
          <span>
            <span className="brand-mini">clik</span> L’atelier des possibles
          </span>
          <span>
            Glisser / flèches : déplacer · Maj + ↑ / ↓ : hauteur · Espace +
            glisser / clic droit : caméra · Maj + clic : sélection multiple{" "}
            <ChevronRight size={12} /> D : dupliquer <ChevronRight size={12} />{" "}
            F : cadrer <ChevronRight size={12} /> R / Maj + R : ±90°{" "}
            <ChevronRight size={12} /> Échap : annuler
          </span>
        </footer>
      </main>
      {publishing && (
        <PublishDialog
          title={pubTitle}
          description={description}
          onTitleChange={setPubTitle}
          onDescriptionChange={setDescription}
          onClose={() => setPublishing(false)}
          onPublish={() => void doPublish()}
          busy={busy}
          disabled={closed || (!!stock && !count)}
          challenge={!!project.challenge}
        />
      )}
      {importing && (
        <ImportProjectDialog
          projectId={projectId}
          draftId={draftId}
          authenticated={project.isAuthenticated}
          onClose={() => setImporting(false)}
        />
      )}
    </>
  );
}
