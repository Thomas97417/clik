import { cn } from "@/lib/utils";
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
  Plus,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CSSProperties } from "react";
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
const cameraViews = [
  { value: "perspective", label: "Perspective" },
  { value: "top", label: "Dessus" },
  { value: "front", label: "Face" },
  { value: "right", label: "Droite" },
] as const;
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
    <label className="project-title-field inline-grid grid-cols-[minmax(0,max-content)] flex-[0_1_auto] max-w-full min-w-0 text-sm font-semibold leading-5">
      <span className="sr-only">Nom de la création</span>
      <span
        className="project-title-measure px-0.5 py-1.25 overflow-hidden border border-solid border-transparent [grid-area:1/1] invisible whitespace-pre pointer-events-none"
        aria-hidden="true"
      >
        {value || "Nom de la création"}
      </span>
      <input
        className="outline-offset-3 project-title px-0.5 py-1.25 border border-solid border-transparent [grid-area:1/1] w-full min-w-0 h-8 rounded-none bg-transparent [box-shadow:none] outline-none [font:inherit] text-[#26344c] text-ellipsis cursor-text hover:enabled:border-b-[#c4cddd] focus:bg-transparent focus:border-t-transparent focus:border-r-transparent focus:border-b-[#9aa6b6] focus:border-l-transparent focus:[box-shadow:none] focus:outline-none disabled:opacity-50 disabled:cursor-default"
        aria-label="Nom du projet"
        title={value}
        placeholder="Nom de la création"
        autoComplete="off"
        value={value}
        size={1}
        disabled={disabled}
        maxLength={100}
        onChange={(e) => setValue(e.currentTarget.value)}
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
      className="outline-offset-3 py-1.75 m-0 border border-solid border-[#e2e7ef] rounded-[5px] w-full pr-0.5 pl-4.5 text-sm! leading-[inherit]! [appearance:textfield] [&::-webkit-inner-spin-button]:hidden"
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
  onNewCreation,
}: {
  projectId?: string;
  draftId?: string;
  onNewCreation?: () => Promise<void>;
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
  const startCreation = async () => {
    if (!onNewCreation || busy) return;
    setBusy(true);
    try {
      await project.flush();
      await onNewCreation();
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
            className={cn(
              "tree-row gap-1.25 flex items-center h-10 pr-3 touch-none select-none [&[class~='group/selected']]:bg-[#edf3ff] [&[class~='group/selected']]:text-[#356ae6] [&[class~='group/contains-selection']:not([class~='group/selected'])]:bg-[#f4f7fe] [&[class~='group/contains-selection']:not([class~='group/selected'])]:[box-shadow:inset_2px_0_#356ae6] data-drag-source:bg-[#edf3ff] data-drag-source:[outline:1px_dashed_#779bec] data-drag-source:-outline-offset-2 data-drag-source:text-[#356ae6] data-drag-source:opacity-65 data-drop-inside:bg-[#e7efff] data-drop-inside:[box-shadow:inset_3px_0_#356ae6]",
              s.selection.includes(n.id) ? "selected group/selected" : "",
              containsSelection
                ? "contains-selection group/contains-selection"
                : "",
            )}
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
                className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 tree-toggle group/tree-toggle hover:bg-[#dfe9fb] [&:not([class~='group/tree-name'])]:text-[#9aa5b6] [&:not([class~='group/tree-name'])]:opacity-85 flex-[0_0_22px] w-5.5 h-7 grid place-items-center text-[#68788e] opacity-100 rounded-[5px] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-2 focus-visible:rounded-[4px]"
                aria-label={`${collapsed ? "Déplier" : "Replier"} ${n.name}`}
                title={`${collapsed ? "Déplier" : "Replier"} ${n.name}`}
                aria-expanded={!collapsed}
                aria-controls={childrenId}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => toggleGroup(n.id)}
              >
                <ChevronRight
                  className="shrink-0 group-aria-expanded/tree-toggle:transform-[rotate(90deg)]"
                  size={14}
                  aria-hidden="true"
                />
              </button>
            ) : (
              <span
                className="tree-toggle-spacer flex-[0_0_22px] w-5.5 h-7"
                aria-hidden="true"
              />
            )}
            <button
              className="disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 tree-name group/tree-name gap-2 flex items-center flex-1 min-w-0 text-sm! leading-[inherit]! text-left [&:not([class~='group/tree-name'])]:text-[#9aa5b6] [&:not([class~='group/tree-name'])]:opacity-85 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-2 focus-visible:rounded-[4px] cursor-grab group-data-[dragging]/tree:cursor-grabbing"
              title={n.name}
              aria-pressed={s.selection.includes(n.id)}
              onClick={(e) => s.select(n.id, e.shiftKey)}
            >
              {isGroup ? (
                <Layers className="shrink-0" size={15} aria-hidden="true" />
              ) : (
                <span
                  className="part-dot border border-solid border-[#0001] rounded-[3px] shrink-0 size-2.75 last:overflow-hidden last:text-ellipsis last:whitespace-nowrap"
                  style={{ background: n.color }}
                />
              )}
              <span className="last:overflow-hidden last:text-ellipsis last:whitespace-nowrap">
                {n.name}
              </span>
            </button>
            {isGroup && (
              <span
                className="tree-count px-1.25 py-px gap-1 inline-flex items-center shrink-0 rounded-[5px] text-[#68788e] bg-[#f0f3f8] text-[11px] tabular-nums"
                title={`${countLabel} dans ce groupe${containsSelection ? " · contient la sélection" : ""}`}
                aria-label={`${countLabel}${containsSelection ? ", contient la sélection" : ""}`}
              >
                {containsSelection && (
                  <span
                    className="tree-selection-dot rounded-full bg-[#356ae6] size-1.25"
                    aria-hidden="true"
                  />
                )}
                {partCount}
              </span>
            )}
            <button
              className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 [&:not([class~='group/tree-name'])]:text-[#9aa5b6] [&:not([class~='group/tree-name'])]:opacity-85 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-2 focus-visible:rounded-[4px]"
              title={n.hidden ? "Afficher" : "Masquer"}
              onClick={() => safe(() => s.patch(n.id, { hidden: !n.hidden }))}
            >
              {n.hidden ? (
                <EyeOff className="shrink-0" size={14} />
              ) : (
                <Eye className="shrink-0" size={14} />
              )}
            </button>
            <button
              className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 [&:not([class~='group/tree-name'])]:text-[#9aa5b6] [&:not([class~='group/tree-name'])]:opacity-85 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-2 focus-visible:rounded-[4px]"
              title={n.locked ? "Déverrouiller" : "Verrouiller"}
              onClick={() => safe(() => s.patch(n.id, { locked: !n.locked }))}
            >
              {n.locked ? (
                <LockKeyhole className="shrink-0" size={14} />
              ) : (
                <UnlockKeyhole className="shrink-0" size={14} />
              )}
            </button>
          </div>
          {isGroup && (
            <ul
              id={childrenId}
              className="tree-branch p-0 m-0 list-none"
              hidden={collapsed}
            >
              {!collapsed && tree(n.id, depth + 1)}
            </ul>
          )}
        </li>
      );
    });
  if (projectId && !project.isLoading && !project.isAuthenticated)
    return (
      <div className="empty-state px-6.25 py-17.5 gap-5 min-h-75 flex flex-col items-center justify-center text-center text-[#7d8ba0]">
        <h1 className="text-[#32445f] text-2xl leading-[inherit] font-bold">
          Retrouvez votre atelier
        </h1>
        <p className="max-w-127.5 leading-[1.8]">
          Connectez-vous pour ouvrir ce projet privé.
        </p>
        <Link
          to="/sign-in"
          onClick={() =>
            sessionStorage.setItem(
              "clik-return-to",
              window.location.pathname + window.location.search,
            )
          }
          className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 primary-link group/primary-link px-4.75 py-3 gap-2.5 inline-flex items-center justify-center bg-[#356ae6] text-white rounded-[9px] text-sm font-[650] whitespace-nowrap hover:bg-[#2458ce] leading-normal"
        >
          Se connecter
        </Link>
      </div>
    );
  return (
    <>
      <div className="mobile-editor empty-state px-6.25 py-17.5 gap-5 min-h-75 flex-col items-center justify-center text-center text-[#7d8ba0] hidden max-lg-narrow:flex">
        <Box size={40} />
        <h1 className="text-[#32445f] text-2xl leading-[inherit] font-bold">
          Un peu plus de place pour construire
        </h1>
        <p className="max-w-127.5 leading-[1.8]">
          L’atelier est disponible sur ordinateur. Explorez les créations depuis
          votre téléphone.
        </p>
        <Link
          to="/gallery"
          className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 primary-link group/primary-link px-4.75 py-3 gap-2.5 inline-flex items-center justify-center bg-[#356ae6] text-white rounded-[9px] text-sm font-[650] whitespace-nowrap hover:bg-[#2458ce] leading-normal"
        >
          Voir la galerie
        </Link>
      </div>
      <main className="editor h-full min-h-150 flex flex-col bg-white max-lg-narrow:hidden">
        <header
          className="editor-top px-4.5 py-2 gap-4 min-h-13 flex items-center border-b border-solid border-b-[#ebeff5] shrink-0 bg-white max-xl-narrow:px-4 max-xl-narrow:gap-3"
          aria-label="Projet et sauvegarde"
        >
          <div className="editor-project gap-3 flex items-center flex-1 min-w-0">
            <ProjectTitle
              key={`${projectId}-${project.ready}-${s.title}`}
              title={s.title}
              disabled={!project.ready || closed || busy}
              onCommit={(title) => s.commit(s.scene, title)}
            />
            <div className="project-metadata gap-2 flex items-center min-w-0 shrink-0 pl-2.5 border-l border-solid border-l-[#e9edf4] text-[10px] leading-4 whitespace-nowrap">
              <span
                className="project-visibility gap-1.25 inline-flex items-center shrink-0 text-[#68788e]"
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
                <span className="assembly-badge group/assembly-badge border border-solid border-[#c7dfdf] inline-flex w-fit items-center rounded-[6px] bg-[#edf7f5] text-[#37786b] font-[650] whitespace-nowrap px-1.5 py-0.5 text-[9px] leading-3.5">
                  Assemblage
                </span>
              )}
              <ProjectSources sources={projectSources(s.provenance)} />
            </div>
          </div>
          <div className="editor-project-actions gap-3.5 flex items-center shrink-0 pl-4 border-l border-solid border-l-[#e9edf4] max-xl-narrow:gap-2.5 max-xl-narrow:pl-3">
            {onNewCreation && (
              <Button
                className="editor-new-action group/editor-new-action px-2.25 py-0 gap-1.5 border border-solid border-transparent h-8 rounded-[6px] bg-transparent [box-shadow:none] text-[#536888] text-[11px] max-xl-narrow:px-0 max-xl-narrow:w-8 hover:enabled:border-[#e5ebf5] hover:enabled:bg-[#f3f6fb] hover:enabled:text-[#356ae6] leading-(--text-xs--line-height)"
                variant="outline"
                aria-label="Nouvelle création"
                title="Démarrer une nouvelle création"
                disabled={
                  !project.ready ||
                  !!s.gesture ||
                  !!s.pending ||
                  !!s.libraryPointer ||
                  project.conflict ||
                  busy ||
                  publishing
                }
                onClick={() => safe(startCreation)}
              >
                <Plus
                  className="size-4 pointer-events-none shrink-0"
                  size={16}
                  aria-hidden="true"
                />
                <span className="max-xl-narrow:hidden">Nouvelle création</span>
              </Button>
            )}
            <Button
              className="editor-import-action group/editor-import-action px-2.25 py-0 gap-1.5 border border-solid border-transparent h-8 rounded-[6px] bg-transparent [box-shadow:none] text-[#536888] text-[11px] max-xl-narrow:px-0 max-xl-narrow:w-8 hover:enabled:border-[#e5ebf5] hover:enabled:bg-[#f3f6fb] hover:enabled:text-[#356ae6] leading-(--text-xs--line-height)"
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
              <Import
                className="size-4 pointer-events-none shrink-0"
                size={16}
                aria-hidden="true"
              />
              <span className="max-xl-narrow:hidden">Importer</span>
            </Button>
            <div
              className="save-status gap-1.5 flex items-center text-[#68788e] text-xs max-w-57.5 leading-[1.4] data-[state=offline]:text-[#9b660c] data-[state=conflict]:text-[#9b660c] data-[state=error]:text-[#c33e42] group/save-status"
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
              <SaveIcon
                className="shrink-0 group-data-[state=saved]/save-status:text-[#34906c] group-data-[state=saving]/save-status:text-[#356ae6] group-data-[state=saving]/save-status:animate-[spin_1.5s_linear_infinite] motion-reduce:group-data-[state=saving]/save-status:animate-none"
                size={14}
                aria-hidden="true"
              />
              <span>
                {project.conflict ? "Conflit à résoudre" : project.status}
              </span>
            </div>
            {projectId ? (
              <Button
                className="editor-primary-action group/editor-primary-action focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-3 px-2.75 py-0 gap-1.5 inline-flex items-center justify-center text-[11px] h-8 rounded-[6px] whitespace-nowrap [box-shadow:none] leading-(--text-xs--line-height)"
                disabled={
                  !project.ready || !!s.gesture || project.conflict || closed
                }
                onClick={() => {
                  setPubTitle(s.title);
                  setPublishing(true);
                }}
              >
                <Upload
                  className="size-4 pointer-events-none shrink-0"
                  size={15}
                  aria-hidden="true"
                />{" "}
                {project.challenge
                  ? project.publicationId
                    ? "Mettre à jour ma participation"
                    : "Proposer au défi"
                  : "Publier"}
              </Button>
            ) : project.isAuthenticated ? (
              <Button
                className="editor-primary-action group/editor-primary-action focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-3 px-2.75 py-0 gap-1.5 inline-flex items-center justify-center text-[11px] h-8 rounded-[6px] whitespace-nowrap [box-shadow:none] leading-(--text-xs--line-height)"
                disabled={!project.ready || !!s.gesture || busy}
                onClick={() => safe(preserve)}
              >
                {busy ? (
                  <LoaderCircle
                    size={16}
                    aria-hidden="true"
                    className="size-4 pointer-events-none shrink-0 animate-spin"
                  />
                ) : (
                  <CloudUpload
                    className="size-4 pointer-events-none shrink-0"
                    size={16}
                    aria-hidden="true"
                  />
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
                className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 primary-link editor-primary-action group/editor-primary-action focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-3 group/primary-link bg-[#356ae6] text-white font-[650] hover:bg-[#2458ce] px-2.75 py-0 gap-1.5 inline-flex items-center justify-center text-[11px] h-8 rounded-[6px] whitespace-nowrap [box-shadow:none]"
                aria-label="Se connecter pour sauvegarder"
                title="Se connecter pour retrouver ce projet sur vos autres appareils"
              >
                <CloudUpload size={16} aria-hidden="true" /> Se connecter
              </Link>
            )}
          </div>
        </header>
        {project.challenge && (
          <div className="challenge-editor-banner px-5.5 py-2.25 flex items-center flex-wrap gap-y-2.5 gap-x-5 bg-[#edf3ff] text-[#45658f] text-xs leading-[inherit] shrink-0">
            <Link
              className="[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 font-bold text-[#356ae6]"
              to="/challenges"
              search={{ date: project.challenge.day }}
            >
              Défi du {project.challenge.day} · UTC
            </Link>
            <span>
              {closed
                ? "Participations closes · votre travail privé est conservé"
                : `Clôture dans ${Math.max(0, Math.floor((project.challenge.closesAt - now - (s.challenge?.serverOffset ?? 0)) / 3600000))} h ${Math.max(0, Math.floor((project.challenge.closesAt - now - (s.challenge?.serverOffset ?? 0)) / 60000) % 60)} min`}
            </span>
            {closed && (
              <button
                className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 ml-auto underline"
                disabled={busy}
                onClick={() => safe(preserve)}
              >
                Continuer dans une copie libre
              </button>
            )}
          </div>
        )}
        {project.conflict && (
          <div
            className="conflict px-5 py-2.5 gap-3 bg-[#fff5db] text-[#725a24] flex items-center text-[13px]"
            role="alert"
          >
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
          className="editor-body [--library-width:236px] [--inspector-width:264px] [--scene-min-width:300px] flex-1 grid grid-cols-[var(--library-width)_minmax(var(--scene-min-width),1fr)_var(--inspector-width)] min-h-0 max-xl-narrow:[--library-width:210px] max-xl-narrow:[--inspector-width:230px] max-xl-narrow:[--scene-min-width:280px] 2xl-narrow:[--library-width:260px] 2xl-narrow:[--inspector-width:285px] data-[library-collapsed=true]:[--library-width:0px] data-[inspector-collapsed=true]:[--inspector-width:0px] group/editor-body"
          inert={busy && !publishing}
          data-library-collapsed={libraryCollapsed}
          data-inspector-collapsed={inspectorCollapsed}
        >
          <div className="editor-side editor-side-left relative min-w-0 min-h-0 bg-white group/editor-side-left border-r border-solid border-r-[#e4e9f1] group-data-[library-collapsed=true]/editor-body:border-0 group-data-[library-collapsed=true]/editor-body:border-none group-data-[library-collapsed=true]/editor-body:border-current">
            <button
              className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 side-panel-toggle group/side-panel-toggle border border-solid border-[#e4e9f1] absolute top-3 right-2 z-4 grid place-items-center rounded-[7px] bg-white text-[#68788e] hover:border-[#cddcfa] hover:bg-[#edf3ff] hover:text-[#356ae6] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-2 aria-[expanded=false]:top-5 aria-[expanded=false]:[box-shadow:0_2px_8px_#23334d14] size-7.5 aria-[expanded=false]:left-3 aria-[expanded=false]:right-auto"
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
                <PanelLeftOpen
                  className="shrink-0"
                  size={17}
                  aria-hidden="true"
                />
              ) : (
                <PanelLeftClose
                  className="shrink-0"
                  size={17}
                  aria-hidden="true"
                />
              )}
            </button>
            <aside
              id={libraryId}
              className="library overflow-hidden flex flex-col min-h-0 bg-white min-w-0 h-full [&[hidden]]:hidden"
              aria-label="Bibliothèque de pièces"
              hidden={libraryCollapsed}
            >
              <div className="library-header shrink-0 border-b border-solid border-b-[#edf0f5]">
                <div className="panel-heading panel-heading-collapsible group/panel-heading-collapsible group/panel-heading flex items-center justify-between py-2.5 min-h-13.5 px-3.5 gap-2 pt-4.25 pb-3">
                  <div>
                    <h2 className="text-sm font-[750] leading-4.5">
                      Les pièces
                    </h2>
                    <span className="block mt-0.5 text-[#68788e] text-[11px] leading-3.5">
                      {visibleParts.length} modèle
                      {visibleParts.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                <div
                  className="piece-tabs group/piece-tabs px-3 gap-1.25 grid grid-cols-2 pt-0 pb-3"
                  role="group"
                  aria-label="Catégories de pièces"
                >
                  {pieceCategories.map(({ name, prefix }) => (
                    <button
                      key={name}
                      className={cn(
                        "cursor-pointer disabled:cursor-not-allowed disabled:opacity-40",
                        "[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6]",
                        "outline-offset-3",
                        name === category ? "active group/active" : "",
                        "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:-outline-offset-2 text-xs leading-[inherit] px-2 py-1.25 gap-1 border border-solid border-transparent flex items-center justify-between min-h-8 text-[#68788e] rounded-[7px] text-left hover:bg-[#f5f7fb] [&[class~='group/active']]:border-[#dce6fc] [&[class~='group/active']]:bg-[#edf2ff] [&[class~='group/active']]:text-[#356ae6] [&[class~='group/active']]:font-[650]",
                      )}
                      aria-label={name}
                      aria-pressed={name === category}
                      onClick={() => {
                        setCategory(name);
                        if (libraryScroll.current)
                          libraryScroll.current.scrollTop = 0;
                      }}
                    >
                      <span>{name}</span>
                      <span
                        className="category-count text-[10px] tabular-nums opacity-80"
                        aria-hidden="true"
                      >
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
                className="library-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:#c4cede_transparent] overscroll-contain focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:-outline-offset-2"
                ref={libraryScroll}
                role="region"
                aria-label="Modèles de pièces"
                tabIndex={0}
              >
                <div className="piece-grid p-3 gap-2 grid grid-cols-2 content-start">
                  {visibleParts.map(([id, p]) => (
                    <button
                      className={cn(
                        "cursor-pointer disabled:cursor-not-allowed disabled:opacity-40",
                        "[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6]",
                        "outline-offset-3",
                        "piece-card group/piece-card px-0.75 py-2 gap-1.25 border border-solid border-[#e7ebf1] touch-none select-none min-w-0 min-h-25 rounded-[9px] flex flex-col items-center justify-center bg-[#fbfcfe] cursor-grab 2xl-narrow:min-h-26.5 hover:border-[#8dacf1] hover:bg-[#f0f5ff] [&[class~='group/active']]:border-[#8dacf1] [&[class~='group/active']]:bg-[#f0f5ff] active:cursor-grabbing disabled:cursor-default",
                        s.pending === id ? "active group/active" : "",
                        "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:-outline-offset-2",
                      )}
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
                        <span className="piece-stock block text-[#356ae6] text-[10px] leading-[1.3] mb-0.75 last:text-[13px]! last:leading-[1.4] last:text-[#65738a] last:whitespace-normal last:max-w-full last:wrap-anywhere last:text-center">
                          {remaining(id)} restante{remaining(id) > 1 ? "s" : ""}
                        </span>
                      )}
                      <span className="piece-preview flex items-center justify-center w-full h-14 shrink-0 pointer-events-none last:text-[13px]! last:leading-[1.4] last:text-[#65738a] last:whitespace-normal last:max-w-full last:wrap-anywhere last:text-center">
                        <PartPreview type={id} color={s.color} />
                      </span>
                      <span className="piece-name last:text-[13px]! last:leading-[1.4] last:text-[#65738a] last:whitespace-normal last:max-w-full last:wrap-anywhere last:text-center">
                        {p.name.replace(/ \d.*$/, "")}
                        <span className="piece-dimensions block whitespace-nowrap text-[11px] text-[#8290a4] mt-0.5">
                          {p.name.match(/\d.*$/)?.[0]}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="library-footer shrink-0 border-t border-solid border-t-[#e7ecf3] bg-white">
                <div className="palette-section m-0">
                  <h2>
                    <button
                      className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 palette-toggle px-3 py-2.5 gap-1.5 flex items-center w-full min-h-12 text-left text-[13px] font-[650] text-[#34435c] hover:bg-[#f8faff] hover:text-[#356ae6] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:-outline-offset-2 group/palette-toggle"
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
                      <ChevronRight
                        className="shrink-0 group-aria-expanded/palette-toggle:transform-[rotate(90deg)]"
                        size={16}
                        aria-hidden="true"
                      />
                      Couleurs
                      <span className="palette-current px-1.5 py-1 gap-1.25 border border-solid border-[#e7ecf3] inline-flex items-center ml-auto rounded-[6px] bg-[#fbfcfe] text-[#68788e] text-[11px] font-medium whitespace-nowrap">
                        <span
                          className="rounded-full [box-shadow:inset_0_0_0_1px_#00000014] size-2.5"
                          style={{ background: s.color }}
                          aria-hidden="true"
                        />
                        {COLOR_NAMES[COLORS.indexOf(s.color)]}
                      </span>
                    </button>
                  </h2>
                  <div
                    id={paletteId}
                    className="palette px-3 gap-1.25 grid grid-cols-6 pt-0 pb-3 [&[hidden]]:hidden"
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
                        className={cn(
                          "cursor-pointer disabled:cursor-not-allowed disabled:opacity-40",
                          "[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6]",
                          "outline-offset-3",
                          s.color === color ? "chosen group/chosen" : "",
                          "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:-outline-offset-2 p-0.75 border border-solid border-transparent min-w-0 h-8.25 rounded-[8px] hover:border-[#d2ddef] hover:bg-[#f1f5fc] [&[class~='group/chosen']]:border-[#356ae6] [&[class~='group/chosen']]:bg-[#edf3ff] [&[class~='group/chosen']]:[box-shadow:0_0_0_1px_#356ae620]",
                        )}
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
                          className="palette-swatch grid place-items-center rounded-[5px] [box-shadow:inset_0_0_0_1px_#00000014] size-full"
                          style={{
                            background: color,
                            color: [2, 3, 4, 7, 9, 10].includes(i)
                              ? "#fff"
                              : "#25354e",
                          }}
                        >
                          {s.color === color && (
                            <Check
                              className="shrink-0"
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
                <div className="library-tip group/library-tip px-3.5 gap-2 pt-2 pb-3 flex items-center text-[#68788e] bg-[#f8faff]">
                  <Grip className="shrink-0" size={16} aria-hidden="true" />
                  <p className="text-[11px] leading-[1.6]">
                    Clic : ajouter une pièce.
                    <br />
                    Glisser : choisir sa place.
                  </p>
                </div>
              </div>
            </aside>
          </div>
          <section className="viewport overflow-hidden relative bg-[#edf1f7] min-w-0">
            <div className="scene-toolbar p-1.25 gap-0.75 border border-solid border-white absolute top-5 left-1/2 transform-[translateX(-50%)] z-3 flex items-center bg-[#ffffffed] [box-shadow:0_4px_15px_#53668114] rounded-[10px]">
              <div className="tool-group flex border-r border-solid border-r-[#e7ecf2] pr-1 mr-0.5">
                <button
                  className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 px-1.75 py-0 gap-1.5 h-8.25 min-w-8.5 flex items-center justify-center rounded-[6px] text-[#7a879d] hover:bg-[#f0f4fa]"
                  title="Annuler (⌘/Ctrl Z)"
                  disabled={!s.past.length}
                  onClick={s.undo}
                >
                  <Undo2 className="shrink-0" size={18} />
                </button>
                <button
                  className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 px-1.75 py-0 gap-1.5 h-8.25 min-w-8.5 flex items-center justify-center rounded-[6px] text-[#7a879d] hover:bg-[#f0f4fa]"
                  title="Rétablir"
                  disabled={!s.future.length}
                  onClick={s.redo}
                >
                  <Redo2 className="shrink-0" size={18} />
                </button>
              </div>
              <div className="tool-group flex border-r border-solid border-r-[#e7ecf2] pr-1 mr-0.5">
                <button
                  title="Déplacer"
                  className={cn(
                    "cursor-pointer disabled:cursor-not-allowed disabled:opacity-40",
                    "[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6]",
                    "outline-offset-3",
                    s.tool === "translate" ? "active group/active" : "",
                    "px-1.75 py-0 gap-1.5 h-8.25 min-w-8.5 flex items-center justify-center rounded-[6px] text-[#7a879d] [&[class~='group/active']]:bg-[#eaf0ff] [&[class~='group/active']]:text-[#356ae6] hover:bg-[#f0f4fa]",
                  )}
                  onClick={() => useEditor.setState({ tool: "translate" })}
                >
                  <Move3D className="shrink-0" size={19} />
                </button>
                <button
                  title="Tourner"
                  className={cn(
                    "cursor-pointer disabled:cursor-not-allowed disabled:opacity-40",
                    "[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6]",
                    "outline-offset-3",
                    s.tool === "rotate" ? "active group/active" : "",
                    "px-1.75 py-0 gap-1.5 h-8.25 min-w-8.5 flex items-center justify-center rounded-[6px] text-[#7a879d] [&[class~='group/active']]:bg-[#eaf0ff] [&[class~='group/active']]:text-[#356ae6] hover:bg-[#f0f4fa]",
                  )}
                  onClick={() => useEditor.setState({ tool: "rotate" })}
                >
                  <Rotate3D className="shrink-0" size={19} />
                </button>
              </div>
              <button
                title="Aimantation"
                aria-pressed={s.snap}
                className={cn(
                  "cursor-pointer disabled:cursor-not-allowed disabled:opacity-40",
                  "[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6]",
                  "outline-offset-3",
                  s.snap ? "active group/active" : "",
                  "px-1.75 py-0 gap-1.5 h-8.25 min-w-8.5 flex items-center justify-center rounded-[6px] text-[#7a879d] [&[class~='group/active']]:bg-[#eaf0ff] [&[class~='group/active']]:text-[#356ae6] hover:bg-[#f0f4fa]",
                )}
                onClick={() => useEditor.setState({ snap: !s.snap })}
              >
                <Magnet className="shrink-0" size={18} />
                <span className="text-sm! leading-[inherit]! whitespace-nowrap max-xl-narrow:hidden">
                  Aimantation
                </span>
              </button>
              <button
                title={s.showGrid ? "Masquer la grille" : "Afficher la grille"}
                aria-label="Grille"
                aria-pressed={s.showGrid}
                className={cn(
                  "cursor-pointer disabled:cursor-not-allowed disabled:opacity-40",
                  "[transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6]",
                  "outline-offset-3",
                  s.showGrid ? "active group/active" : "",
                  "px-1.75 py-0 gap-1.5 h-8.25 min-w-8.5 flex items-center justify-center rounded-[6px] text-[#7a879d] [&[class~='group/active']]:bg-[#eaf0ff] [&[class~='group/active']]:text-[#356ae6] hover:bg-[#f0f4fa]",
                )}
                onClick={() => useEditor.setState({ showGrid: !s.showGrid })}
              >
                <Grid2X2 className="shrink-0" size={18} />
                <span className="text-sm! leading-[inherit]! whitespace-nowrap max-xl-narrow:hidden">
                  Grille
                </span>
              </button>
              <button
                className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 px-1.75 py-0 gap-1.5 h-8.25 min-w-8.5 flex items-center justify-center rounded-[6px] text-[#7a879d] hover:bg-[#f0f4fa]"
                title="Cadrer la sélection (F)"
                onClick={() => useEditor.setState({ frame: s.frame + 1 })}
              >
                <Scan className="shrink-0" size={18} />
              </button>
            </div>
            {project.ready ? (
              <ClientScene scene={s.scene} editable={!closed} />
            ) : (
              <div className="empty-state px-6.25 py-17.5 gap-5 min-h-75 flex flex-col items-center justify-center text-center text-[#7d8ba0]">
                Chargement de la création…
              </div>
            )}
            {project.ready && !count && !s.pending && (
              <div className="canvas-empty absolute left-1/2 top-[46%] transform-[translate(-50%,-50%)] pointer-events-none text-center w-full text-[#8291a9]">
                <span className="font-bold text-[26px] tracking-[-0.7px] leading-[1.4]">
                  Une idée commence
                  <br />
                  par une brique.
                </span>
                <p className="text-xs leading-[inherit] mt-3">
                  Choisissez votre première pièce à gauche.
                </p>
              </div>
            )}
            <div className="viewport-bottom gap-2 absolute left-4.5 bottom-3.75 right-4.5 z-3 flex items-center flex-wrap pointer-events-none text-xs leading-[inherit] text-[#8591a3]">
              <span className="first:px-2.25 first:py-1.5 first:border first:border-solid first:border-[#dce3ed] first:rounded-[6px] first:bg-[#ffffff91] first:text-[#6e7f96]">
                {count} /{" "}
                {stock
                  ? stock.reduce((sum, item) => sum + item.quantity, 0)
                  : 500}{" "}
                pièces
              </span>
              {overlap && (
                <span className="overlap group/overlap first:px-2.25 first:py-1.5 first:border first:border-solid first:border-[#dce3ed] first:rounded-[6px] first:bg-[#ffffff91] first:text-[#6e7f96] text-[10px] text-[#956f21]">
                  Chevauchement existant à corriger
                </span>
              )}
              <div className="view-select gap-2 ml-auto max-w-full flex items-center justify-end flex-wrap pointer-events-none">
                <Select
                  items={cameraViews}
                  value={s.view}
                  onValueChange={(view) => {
                    if (
                      view === "perspective" ||
                      view === "top" ||
                      view === "front" ||
                      view === "right"
                    )
                      useEditor.setState({ view });
                  }}
                >
                  <SelectTrigger
                    className="scene-view-trigger group/scene-view-trigger pointer-events-auto hover:border-[#b9cbed] hover:bg-white hover:text-[#356ae6] aria-expanded:border-[#b9cbed] aria-expanded:bg-white aria-expanded:text-[#356ae6] px-2.5 py-0 border border-solid border-[#dce5f0] h-9.5 w-33 text-xs bg-[#fffffff0] rounded-[8px] [box-shadow:0_2px_8px_#53668108] text-[#64758d] data-[size=default]:h-9.5"
                    aria-label="Vue de la caméra"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    className="scene-view-menu p-1.25 min-w-38 rounded-[10px] bg-white [box-shadow:0_8px_24px_#33476b24]"
                    side="top"
                    align="end"
                    sideOffset={8}
                    alignItemWithTrigger={false}
                  >
                    {cameraViews.map((view) => (
                      <SelectItem
                        className="py-1.75 min-h-8 pr-7.5 pl-2.5 rounded-[6px] text-[#536580] text-xs cursor-pointer data-highlighted:bg-[#eef3ff] data-highlighted:text-[#356ae6] data-selected:bg-[#eef3ff] data-selected:text-[#356ae6]"
                        key={view.value}
                        value={view.value}
                      >
                        {view.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div
                  className="scene-light-control py-0.75 gap-2.5 border border-solid border-[#dce5f0] flex items-center h-9.5 pr-2 pl-0.75 rounded-[8px] bg-[#fffffff0] text-[#64758d] [box-shadow:0_2px_8px_#53668108] whitespace-nowrap pointer-events-auto"
                  role="group"
                  aria-label="Éclairage"
                >
                  <button
                    type="button"
                    className="disabled:cursor-not-allowed disabled:opacity-40 outline-offset-3 scene-light-icon px-2.5 py-0 gap-1.75 border border-solid border-[#dce6fc] inline-flex items-center justify-center h-7.5 shrink-0 rounded-[5px] bg-[#edf2ff] text-[#356ae6] text-[11px] font-semibold cursor-pointer [transition:background_150ms,color_150ms,border-color_150ms] hover:border-[#b8ccfc] hover:bg-[#dfe9ff] aria-pressed:border-[#356ae6] aria-pressed:bg-[#356ae6] aria-pressed:text-white [&[aria-pressed='true']:hover]:border-[#2858c9] [&[aria-pressed='true']:hover]:bg-[#2858c9] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-3"
                    aria-label="Tout éclairer"
                    aria-pressed={s.uniformLighting}
                    title={
                      s.uniformLighting
                        ? "Revenir à la lumière orientable"
                        : "Éclairer les pièces de tous les côtés"
                    }
                    onClick={() =>
                      useEditor.setState({
                        uniformLighting: !s.uniformLighting,
                      })
                    }
                  >
                    <Sun className="shrink-0" size={16} aria-hidden="true" />
                    <span>Tout éclairer</span>
                  </button>
                  <div
                    className="scene-light-direction gap-1.75 flex items-center pl-2.5 border-l border-solid border-l-[#e6ebf3] data-[disabled=true]:opacity-35"
                    data-disabled={s.uniformLighting}
                  >
                    <input
                      className="outline-offset-3 p-0 m-0 border-0 border-none border-current appearance-none [-webkit-appearance:none] w-23 h-6.5 rounded-none [background-image:repeating-linear-gradient(to_right,#cad4e3_0_1px,transparent_1px_25%)] bg-size-[calc(100%-1px)_2px] bg-no-repeat bg-position-[center_bottom_2px] cursor-ew-resize [&::-webkit-slider-runnable-track]:h-0.5 [&::-webkit-slider-runnable-track]:rounded-[1px] [&::-webkit-slider-runnable-track]:[background:linear-gradient(to_right,#356ae6_var(--light-progress),#dce3ef_var(--light-progress))] [&::-moz-range-track]:h-0.5 [&::-moz-range-track]:rounded-[1px] [&::-moz-range-track]:bg-[#dce3ef] [&::-moz-range-progress]:h-0.5 [&::-moz-range-progress]:bg-[#356ae6] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:[-webkit-appearance:none] [&::-webkit-slider-thumb]:box-border [&::-webkit-slider-thumb]:w-2.25 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:rounded-[3px] [&::-webkit-slider-thumb]:bg-[#356ae6] [&::-webkit-slider-thumb]:[box-shadow:0_0_0_1px_#b9cbed] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:w-2.25 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-[3px] [&::-moz-range-thumb]:bg-[#356ae6] [&::-moz-range-thumb]:[box-shadow:0_0_0_1px_#b9cbed] [&:enabled:hover::-webkit-slider-thumb]:[box-shadow:0_0_0_1px_#356ae6] [&:enabled:hover::-moz-range-thumb]:[box-shadow:0_0_0_1px_#356ae6] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-3 focus-visible:rounded-[3px] disabled:cursor-not-allowed"
                      type="range"
                      aria-label="Angle de l’éclairage"
                      aria-valuetext={`${s.lightAngle} degrés`}
                      title={
                        s.uniformLighting
                          ? "Réactivez la lumière orientable pour régler son angle"
                          : "Tourner la lumière autour de la construction"
                      }
                      disabled={s.uniformLighting}
                      min={0}
                      max={360}
                      step={5}
                      value={s.lightAngle}
                      style={
                        {
                          "--light-progress": `${(s.lightAngle / 360) * 100}%`,
                        } as CSSProperties
                      }
                      onChange={(e) =>
                        useEditor.setState({
                          lightAngle: Number(e.target.value),
                        })
                      }
                    />
                    <output
                      className="scene-light-angle min-w-7.75 text-[#64758d] text-[10px] text-right tabular-nums"
                      aria-hidden="true"
                    >
                      {s.uniformLighting ? "—" : `${s.lightAngle}°`}
                    </output>
                  </div>
                </div>
              </div>
            </div>
          </section>
          <div className="editor-side editor-side-right relative min-w-0 min-h-0 bg-white group/editor-side-right border-l border-solid border-l-[#e4e9f1] group-data-[inspector-collapsed=true]/editor-body:border-0 group-data-[inspector-collapsed=true]/editor-body:border-none group-data-[inspector-collapsed=true]/editor-body:border-current">
            <button
              className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 side-panel-toggle group/side-panel-toggle border border-solid border-[#e4e9f1] absolute top-3 right-2 z-4 grid place-items-center rounded-[7px] bg-white text-[#68788e] hover:border-[#cddcfa] hover:bg-[#edf3ff] hover:text-[#356ae6] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-2 aria-[expanded=false]:top-5 aria-[expanded=false]:right-3 aria-[expanded=false]:[box-shadow:0_2px_8px_#23334d14] size-7.5"
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
                <PanelRightOpen
                  className="shrink-0"
                  size={17}
                  aria-hidden="true"
                />
              ) : (
                <PanelRightClose
                  className="shrink-0"
                  size={17}
                  aria-hidden="true"
                />
              )}
            </button>
            <aside
              id={inspectorId}
              className="inspector overflow-auto flex flex-col min-h-0 bg-white [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:#c4cede_transparent] overscroll-contain h-full [&[hidden]]:hidden"
              aria-label="Construction et propriétés"
              hidden={inspectorCollapsed}
            >
              <div className="panel-heading panel-heading-collapsible group/panel-heading-collapsible group/panel-heading px-4.5 flex items-center justify-between py-2.5 pr-11.5 pl-3.5 min-h-13.5">
                <div>
                  <h2 className="text-sm font-[750] leading-4.5">
                    Construction
                  </h2>
                  <span className="block mt-0.5 text-[#68788e] text-[11px] leading-3.5">
                    {count} pièces
                  </span>
                </div>
              </div>
              <div className="tree-actions px-2 gap-0.75 flex pt-0 pb-3 border-b border-solid border-b-[#edf0f5]">
                <button
                  className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 p-0 gap-1.5 h-8.25 min-w-0 flex items-center justify-center rounded-[6px] text-[#7a879d] flex-[0_1_30px] hover:bg-[#f0f4fa] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-2 focus-visible:rounded-[4px]"
                  title="Tout sélectionner"
                  aria-label="Tout sélectionner"
                  disabled={!s.scene.nodes.length}
                  onClick={s.selectAll}
                >
                  <ListChecks
                    className="shrink-0"
                    size={17}
                    aria-hidden="true"
                  />
                </button>
                <button
                  className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 p-0 gap-1.5 h-8.25 min-w-0 flex items-center justify-center rounded-[6px] text-[#7a879d] flex-[0_1_30px] hover:bg-[#f0f4fa] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-2 focus-visible:rounded-[4px]"
                  title={s.selection.length ? "Grouper" : "Nouveau groupe"}
                  onClick={() => safe(s.group)}
                  disabled={
                    !project.ready || closed || !!s.gesture || !!s.pending
                  }
                >
                  <FolderPlus className="shrink-0" size={17} />
                </button>
                <button
                  className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 p-0 gap-1.5 h-8.25 min-w-0 flex items-center justify-center rounded-[6px] text-[#7a879d] flex-[0_1_30px] hover:bg-[#f0f4fa] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-2 focus-visible:rounded-[4px]"
                  title="Dissocier"
                  onClick={() => safe(s.ungroup)}
                  disabled={selected?.kind !== "group"}
                >
                  <Ungroup className="shrink-0" size={17} />
                </button>
                <button
                  className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 p-0 gap-1.5 h-8.25 min-w-0 flex items-center justify-center rounded-[6px] text-[#7a879d] flex-[0_1_30px] hover:bg-[#f0f4fa] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-2 focus-visible:rounded-[4px]"
                  title="Dupliquer (D)"
                  aria-label="Dupliquer"
                  aria-keyshortcuts="d Control+d Meta+d"
                  onClick={() => safe(s.duplicate)}
                  disabled={!s.selection.length}
                >
                  <Copy className="shrink-0" size={17} />
                </button>
                <button
                  className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 p-0 gap-1.5 h-8.25 min-w-0 flex items-center justify-center rounded-[6px] text-[#7a879d] flex-[0_1_30px] hover:bg-[#f0f4fa] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-2 focus-visible:rounded-[4px]"
                  title="Supprimer"
                  onClick={() => safe(s.remove)}
                  disabled={!s.selection.length}
                >
                  <Trash2 className="shrink-0" size={17} />
                </button>
                <span className="tree-actions-spacer flex-1" />
                <button
                  className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 p-0 gap-1.5 h-8.25 min-w-0 flex items-center justify-center rounded-[6px] text-[#7a879d] flex-[0_1_30px] hover:bg-[#f0f4fa] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-2 focus-visible:rounded-[4px]"
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
                  <ChevronsDownUp className="shrink-0" size={17} />
                </button>
                <button
                  className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 p-0 gap-1.5 h-8.25 min-w-0 flex items-center justify-center rounded-[6px] text-[#7a879d] flex-[0_1_30px] hover:bg-[#f0f4fa] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-2 focus-visible:rounded-[4px]"
                  title="Tout déplier"
                  aria-label="Tout déplier"
                  disabled={
                    !hierarchy.groups.some((n) => collapsedGroups.has(n.id))
                  }
                  onClick={() => setCollapsedGroups(new Set())}
                >
                  <ChevronsUpDown className="shrink-0" size={17} />
                </button>
              </div>
              <div
                ref={treeDrag.container}
                className="tree px-0 py-1.75 overflow-auto [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:#c4cede_transparent] overscroll-contain flex-1 min-h-42.5 data-dragging:[overflow-anchor:none] data-dragging:cursor-grabbing group/tree"
                data-dragging={treeDrag.active || undefined}
                onPointerDown={treeDrag.onPointerDown}
                onDragStart={(event) => event.preventDefault()}
              >
                {s.scene.nodes.length ? (
                  <ul
                    className="tree-branch p-0 m-0 list-none"
                    aria-label="Pièces et groupes"
                  >
                    {tree(null)}
                  </ul>
                ) : (
                  <div className="tree-empty px-2.5 py-10 gap-2.5 flex items-center justify-center flex-col text-[#a5afbd] text-center text-xs leading-[inherit]">
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
              <div className="properties px-4.25 py-0 border-t border-solid border-t-[#e9edf3] shrink-0">
                <div className="panel-heading group/panel-heading flex items-center justify-between px-0 py-4.75">
                  <h2 className="text-sm font-[750] leading-normal">
                    <button
                      className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] outline-offset-3 properties-toggle gap-1.5 text-[13px] font-[650] text-[#34435c] flex items-center rounded-[4px] hover:text-[#356ae6] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-4 group/properties-toggle"
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
                      <ChevronRight
                        className="shrink-0 group-aria-expanded/properties-toggle:transform-[rotate(90deg)]"
                        size={16}
                        aria-hidden="true"
                      />
                      Propriétés
                    </button>
                  </h2>
                  <span className="text-xs leading-[inherit] text-[#68788e]">
                    {s.selection.length > 1
                      ? `${s.selection.length} éléments`
                      : ""}
                  </span>
                </div>
                <div
                  id={propertiesId}
                  className="properties-content pb-5"
                  hidden={propertiesCollapsed}
                >
                  {selected ? (
                    <>
                      <label className="text-sm! leading-[inherit]! text-[#7c899d] block mb-3">
                        Nom
                        <Input
                          className="mt-1.25 text-sm! min-w-0"
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
                      <label className="text-sm! leading-[inherit]! text-[#7c899d] block mb-3">
                        Groupe parent
                        <select
                          className="outline-offset-3 p-1.75 border border-solid border-[#e1e6ee] block rounded-[6px] text-sm! leading-[inherit]! mt-1.25 w-full"
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
                        <div
                          className="transform-fields mt-4.25 text-sm! leading-[inherit]! text-[#7c899d]"
                          key={field}
                        >
                          <label>
                            {field === "position"
                              ? "Position"
                              : "Rotation · degrés"}
                          </label>
                          <div className="gap-1.5 grid grid-cols-3 mt-1.75">
                            {["X", "Y", "Z"].map((axis, i) => (
                              <label className="relative" key={axis}>
                                <span
                                  className={cn(
                                    axis === "X" && "axis-X text-[#d66d76]",
                                    axis === "Y" && "axis-Y text-[#62a27d]",
                                    axis === "Z" && "axis-Z text-[#5b8dce]",
                                    "absolute top-2.25 left-1.5 text-[10px]",
                                  )}
                                >
                                  {axis}
                                </span>
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
                      <p className="property-hint text-[#68788e] text-xs leading-[1.8] mt-2">
                        {s.selection.length > 1
                          ? "Le groupe parent s’applique à toute la sélection. Le nom, la position et la rotation concernent le premier élément."
                          : "Dimensions fixes · positions relatives au groupe"}
                      </p>
                    </>
                  ) : (
                    <p className="property-hint text-[#68788e] text-xs leading-[1.8] mt-2">
                      Sélectionnez une pièce pour la modifier. Maintenez Maj
                      pour en sélectionner plusieurs.
                    </p>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
        <footer className="editor-footer px-4.75 py-1.5 gap-2 min-h-8.25 border-t border-solid border-t-[#e5e9f0] flex items-center justify-between flex-wrap shrink-0 text-xs leading-[inherit] text-[#98a2b2]">
          <span className="flex items-center gap-y-1.5 gap-x-3 flex-wrap">
            <span className="brand-mini text-[17px] tracking-[-1px] font-extrabold text-[#8998ad]">
              clik
            </span>{" "}
            L’atelier des possibles
          </span>
          <span className="flex items-center gap-y-1.5 gap-x-3 flex-wrap">
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
