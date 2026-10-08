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
    <label
      className={cn(
        "project-title-field [display:inline-grid] grid-cols-[minmax(0,_max-content)] flex-[0_1_auto] max-w-[100%] min-w-[0] [font-size:14px] font-[600] leading-[20px]",
      )}
    >
      <span className="sr-only">Nom de la création</span>
      <span
        className={cn(
          "project-title-measure px-[2px] py-[5px] overflow-hidden border-[length:1px] border-solid border-[color:transparent] [grid-area:1_/_1] invisible [white-space:pre] pointer-events-none",
        )}
        aria-hidden="true"
      >
        {value || "Nom de la création"}
      </span>
      <input
        className={cn(
          "project-title px-[2px] py-[5px] border-[length:1px] border-solid border-[color:transparent] [grid-area:1_/_1] w-[100%] min-w-[0] h-[32px] rounded-[0] bg-[transparent] [box-shadow:none] [outline:none] [font:inherit] text-[color:#26344c] text-ellipsis cursor-[text] [&:hover:not(:disabled)]:[border-bottom-color:#c4cddd] [&:focus]:bg-[transparent] [&:focus]:[border-top-color:transparent] [&:focus]:[border-right-color:transparent] [&:focus]:[border-bottom-color:#9aa6b6] [&:focus]:[border-left-color:transparent] [&:focus]:[box-shadow:none] [&:focus]:[outline:none] [&:disabled]:opacity-[0.5] [&:disabled]:cursor-[default]",
        )}
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
              cn(
                "tree-row gap-[5px] flex items-center h-[40px] pr-[12px] [touch-action:none] select-none [&[class~='group/selected']]:bg-[#edf3ff] [&[class~='group/selected']]:text-[color:#356ae6] [&_>_button:not([class~='group/tree-name'])]:text-[color:#9aa5b6] [&_>_button:not([class~='group/tree-name'])]:opacity-[0.85] [&_>_button[class~='group/tree-toggle']]:flex-[0_0_22px] [&_>_button[class~='group/tree-toggle']]:w-[22px] [&_>_button[class~='group/tree-toggle']]:h-[28px] [&_>_button[class~='group/tree-toggle']]:grid [&_>_button[class~='group/tree-toggle']]:[place-items:center] [&_>_button[class~='group/tree-toggle']]:text-[color:#68788e] [&_>_button[class~='group/tree-toggle']]:opacity-[1] [&_>_button[class~='group/tree-toggle']]:rounded-[5px] [&_button:focus-visible]:[outline:2px_solid_#356ae6] [&_button:focus-visible]:[outline-offset:2px] [&_button:focus-visible]:rounded-[4px] [&[class~='group/contains-selection']:not([class~='group/selected'])]:bg-[#f4f7fe] [&[class~='group/contains-selection']:not([class~='group/selected'])]:[box-shadow:inset_2px_0_#356ae6] [&_[class~='group/tree-name']]:cursor-[grab] [&[data-drag-source]]:bg-[#edf3ff] [&[data-drag-source]]:[outline:1px_dashed_#779bec] [&[data-drag-source]]:[outline-offset:-2px] [&[data-drag-source]]:text-[color:#356ae6] [&[data-drag-source]]:opacity-[0.65] [&[data-drop-inside]]:bg-[#e7efff] [&[data-drop-inside]]:[box-shadow:inset_3px_0_#356ae6]",
                s.selection.includes(n.id) ? "selected group/selected" : "",
                containsSelection
                  ? "contains-selection group/contains-selection"
                  : "",
              ),
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
                className={cn(
                  "tree-toggle group/tree-toggle [&[aria-expanded='true']_svg]:[transform:rotate(90deg)] [&:hover]:bg-[#dfe9fb]",
                )}
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
              <span
                className={cn(
                  "tree-toggle-spacer flex-[0_0_22px] w-[22px] h-[28px]",
                )}
                aria-hidden="true"
              />
            )}
            <button
              className={cn(
                "tree-name group/tree-name gap-[8px] flex items-center flex-[1] min-w-[0] [font-size:14px]! text-left [&_>_span:last-child]:overflow-hidden [&_>_span:last-child]:text-ellipsis [&_>_span:last-child]:whitespace-nowrap [&_>_svg]:shrink-[0]",
              )}
              title={n.name}
              aria-pressed={s.selection.includes(n.id)}
              onClick={(e) => s.select(n.id, e.shiftKey)}
            >
              {isGroup ? (
                <Layers size={15} aria-hidden="true" />
              ) : (
                <span
                  className={cn(
                    "part-dot border-[length:1px] border-solid border-[color:#0001] w-[11px] h-[11px] rounded-[3px] shrink-[0]",
                  )}
                  style={{ background: n.color }}
                />
              )}
              <span>{n.name}</span>
            </button>
            {isGroup && (
              <span
                className={cn(
                  "tree-count px-[5px] py-[1px] gap-[4px] inline-flex items-center shrink-[0] rounded-[5px] text-[color:#68788e] bg-[#f0f3f8] [font-size:11px] tabular-nums",
                )}
                title={`${countLabel} dans ce groupe${containsSelection ? " · contient la sélection" : ""}`}
                aria-label={`${countLabel}${containsSelection ? ", contient la sélection" : ""}`}
              >
                {containsSelection && (
                  <span
                    className={cn(
                      "tree-selection-dot w-[5px] h-[5px] rounded-[50%] bg-[#356ae6]",
                    )}
                    aria-hidden="true"
                  />
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
            <ul
              id={childrenId}
              className={cn("tree-branch p-[0] m-[0] list-none")}
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
      <div
        className={cn(
          "empty-state px-[25px] py-[70px] gap-[20px] min-h-[300px] flex flex-col items-center justify-center text-center text-[color:#7d8ba0] [&_h1]:text-[color:#32445f] [&_h1]:[font-size:24px] [&_h1]:font-[700] [&_h2]:text-[color:#32445f] [&_h2]:[font-size:24px] [&_h2]:font-[700] [&_p]:max-w-[510px] [&_p]:leading-[1.8]",
        )}
      >
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
          className={cn(
            "primary-link group/primary-link px-[19px] py-[12px] gap-[10px] inline-flex items-center justify-center bg-[#356ae6] text-[color:#fff] rounded-[9px] [font-size:14px] font-[650] whitespace-nowrap [&:hover]:bg-[#2458ce]",
          )}
        >
          Se connecter
        </Link>
      </div>
    );
  return (
    <>
      <div
        className={cn(
          "mobile-editor empty-state px-[25px] py-[70px] gap-[20px] min-h-[300px] flex flex-col items-center justify-center text-center text-[color:#7d8ba0] [&_h1]:text-[color:#32445f] [&_h1]:[font-size:24px] [&_h1]:font-[700] [&_h2]:text-[color:#32445f] [&_h2]:[font-size:24px] [&_h2]:font-[700] [&_p]:max-w-[510px] [&_p]:leading-[1.8] hidden [@media(width<=850px)]:flex",
        )}
      >
        <Box size={40} />
        <h1>Un peu plus de place pour construire</h1>
        <p>
          L’atelier est disponible sur ordinateur. Explorez les créations depuis
          votre téléphone.
        </p>
        <Link
          to="/gallery"
          className={cn(
            "primary-link group/primary-link px-[19px] py-[12px] gap-[10px] inline-flex items-center justify-center bg-[#356ae6] text-[color:#fff] rounded-[9px] [font-size:14px] font-[650] whitespace-nowrap [&:hover]:bg-[#2458ce]",
          )}
        >
          Voir la galerie
        </Link>
      </div>
      <main
        className={cn(
          "editor h-[100%] min-h-[600px] flex flex-col bg-[#fff] [@media(width<=850px)]:hidden",
        )}
      >
        <header
          className={cn(
            "editor-top px-[18px] py-[8px] gap-[16px] min-h-[52px] flex items-center [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#ebeff5] shrink-[0] bg-[#fff] [@media(width<=1100px)]:px-[16px] [@media(width<=1100px)]:gap-[12px] [&_[class~='group/editor-primary-action']]:px-[11px] [&_[class~='group/editor-primary-action']]:py-[0] [&_[class~='group/editor-primary-action']]:gap-[6px] [&_[class~='group/editor-primary-action']]:inline-flex [&_[class~='group/editor-primary-action']]:items-center [&_[class~='group/editor-primary-action']]:justify-center [&_[class~='group/editor-primary-action']]:[font-size:11px] [&_[class~='group/editor-primary-action']]:h-[32px] [&_[class~='group/editor-primary-action']]:rounded-[6px] [&_[class~='group/editor-primary-action']]:whitespace-nowrap [&_[class~='group/editor-primary-action']]:[box-shadow:none] [&_[class~='group/editor-import-action']]:px-[9px] [&_[class~='group/editor-import-action']]:py-[0] [&_[class~='group/editor-import-action']]:gap-[6px] [&_[class~='group/editor-import-action']]:border-[length:1px] [&_[class~='group/editor-import-action']]:border-solid [&_[class~='group/editor-import-action']]:border-[color:transparent] [&_[class~='group/editor-import-action']]:h-[32px] [&_[class~='group/editor-import-action']]:rounded-[6px] [&_[class~='group/editor-import-action']]:bg-[transparent] [&_[class~='group/editor-import-action']]:[box-shadow:none] [&_[class~='group/editor-import-action']]:text-[color:#536888] [&_[class~='group/editor-import-action']]:[font-size:11px] [@media(width<=1100px)]:[&_[class~='group/editor-import-action']]:px-[0] [@media(width<=1100px)]:[&_[class~='group/editor-import-action']]:w-[32px] [&_[class~='group/editor-new-action']]:px-[9px] [&_[class~='group/editor-new-action']]:py-[0] [&_[class~='group/editor-new-action']]:gap-[6px] [&_[class~='group/editor-new-action']]:border-[length:1px] [&_[class~='group/editor-new-action']]:border-solid [&_[class~='group/editor-new-action']]:border-[color:transparent] [&_[class~='group/editor-new-action']]:h-[32px] [&_[class~='group/editor-new-action']]:rounded-[6px] [&_[class~='group/editor-new-action']]:bg-[transparent] [&_[class~='group/editor-new-action']]:[box-shadow:none] [&_[class~='group/editor-new-action']]:text-[color:#536888] [&_[class~='group/editor-new-action']]:[font-size:11px] [@media(width<=1100px)]:[&_[class~='group/editor-new-action']]:px-[0] [@media(width<=1100px)]:[&_[class~='group/editor-new-action']]:w-[32px] [&_[class~='group/editor-import-action']:hover:not(:disabled)]:border-[color:#e5ebf5] [&_[class~='group/editor-import-action']:hover:not(:disabled)]:bg-[#f3f6fb] [&_[class~='group/editor-import-action']:hover:not(:disabled)]:text-[color:#356ae6] [&_[class~='group/editor-new-action']:hover:not(:disabled)]:border-[color:#e5ebf5] [&_[class~='group/editor-new-action']:hover:not(:disabled)]:bg-[#f3f6fb] [&_[class~='group/editor-new-action']:hover:not(:disabled)]:text-[color:#356ae6] [@media(width<=1100px)]:[&_[class~='group/editor-import-action']_span]:hidden [@media(width<=1100px)]:[&_[class~='group/editor-new-action']_span]:hidden",
          )}
          aria-label="Projet et sauvegarde"
        >
          <div
            className={cn(
              "editor-project gap-[12px] flex items-center flex-[1] min-w-[0]",
            )}
          >
            <ProjectTitle
              key={`${projectId}-${project.ready}-${s.title}`}
              title={s.title}
              disabled={!project.ready || closed || busy}
              onCommit={(title) => s.commit(s.scene, title)}
            />
            <div
              className={cn(
                "project-metadata gap-[8px] flex items-center min-w-[0] shrink-[0] pl-[10px] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e9edf4] [font-size:10px] leading-[16px] whitespace-nowrap [&_[class~='group/assembly-badge']]:px-[6px] [&_[class~='group/assembly-badge']]:py-[2px] [&_[class~='group/assembly-badge']]:[font-size:9px] [&_[class~='group/assembly-badge']]:leading-[14px]",
              )}
            >
              <span
                className={cn(
                  "project-visibility gap-[5px] inline-flex items-center shrink-[0] text-[color:#68788e]",
                )}
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
                <span
                  className={cn(
                    "assembly-badge group/assembly-badge px-[8px] py-[3px] border-[length:1px] border-solid border-[color:#c7dfdf] inline-flex w-[fit-content] items-center rounded-[6px] bg-[#edf7f5] text-[color:#37786b] [font-size:10px] font-[650] leading-[1.5] whitespace-nowrap",
                  )}
                >
                  Assemblage
                </span>
              )}
              <ProjectSources sources={projectSources(s.provenance)} />
            </div>
          </div>
          <div
            className={cn(
              "editor-project-actions gap-[14px] flex items-center shrink-[0] pl-[16px] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e9edf4] [@media(width<=1100px)]:gap-[10px] [@media(width<=1100px)]:pl-[12px]",
            )}
          >
            {onNewCreation && (
              <Button
                className={cn("editor-new-action group/editor-new-action")}
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
                <Plus size={16} aria-hidden="true" />
                <span>Nouvelle création</span>
              </Button>
            )}
            <Button
              className={cn("editor-import-action group/editor-import-action")}
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
              className={cn(
                "save-status gap-[6px] flex items-center text-[color:#68788e] [font-size:12px] max-w-[230px] leading-[1.4] [&_>_svg]:shrink-[0] [&[data-state='saved']_>_svg]:text-[color:#34906c] [&[data-state='offline']]:text-[color:#9b660c] [&[data-state='conflict']]:text-[color:#9b660c] [&[data-state='error']]:text-[color:#c33e42] [&[data-state='saving']_>_svg]:text-[color:#356ae6] [&[data-state='saving']_>_svg]:[animation:spin_1.5s_linear_infinite] motion-reduce:[&[data-state='saving']_>_svg]:[animation:none]",
              )}
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
                className={cn(
                  "editor-primary-action group/editor-primary-action [&:focus-visible]:[outline:2px_solid_#356ae6] [&:focus-visible]:[outline-offset:3px]",
                )}
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
                className={cn(
                  "editor-primary-action group/editor-primary-action [&:focus-visible]:[outline:2px_solid_#356ae6] [&:focus-visible]:[outline-offset:3px]",
                )}
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
                className={cn(
                  "primary-link editor-primary-action group/editor-primary-action [&:focus-visible]:[outline:2px_solid_#356ae6] [&:focus-visible]:[outline-offset:3px] group/primary-link px-[19px] py-[12px] gap-[10px] inline-flex items-center justify-center bg-[#356ae6] text-[color:#fff] rounded-[9px] [font-size:14px] font-[650] whitespace-nowrap [&:hover]:bg-[#2458ce]",
                )}
                aria-label="Se connecter pour sauvegarder"
                title="Se connecter pour retrouver ce projet sur vos autres appareils"
              >
                <CloudUpload size={16} aria-hidden="true" /> Se connecter
              </Link>
            )}
          </div>
        </header>
        {project.challenge && (
          <div
            className={cn(
              "challenge-editor-banner px-[22px] py-[9px] flex items-center flex-wrap gap-y-[10px] gap-x-[20px] bg-[#edf3ff] text-[color:#45658f] [font-size:12px] shrink-[0] [&_a]:font-[700] [&_a]:text-[color:#356ae6] [&_button]:ml-[auto] [&_button]:[text-decoration:underline]",
            )}
          >
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
          <div
            className={cn(
              "conflict px-[20px] py-[10px] gap-[12px] bg-[#fff5db] text-[color:#725a24] flex items-center [font-size:13px]",
            )}
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
          className={cn(
            "editor-body [--library-width:236px] [--inspector-width:264px] [--scene-min-width:300px] flex-[1] grid grid-cols-[var(--library-width)_minmax(var(--scene-min-width),_1fr)_var(--inspector-width)] min-h-[0] [@media(width<=1100px)]:[--library-width:210px] [@media(width<=1100px)]:[--inspector-width:230px] [@media(width<=1100px)]:[--scene-min-width:280px] [@media(width>=1500px)]:[--library-width:260px] [@media(width>=1500px)]:[--inspector-width:285px] [&[data-library-collapsed='true']]:[--library-width:0px] [&[data-inspector-collapsed='true']]:[--inspector-width:0px] [&[data-library-collapsed='true']_>_[class~='group/editor-side-left']]:border-[length:0] [&[data-library-collapsed='true']_>_[class~='group/editor-side-left']]:border-none [&[data-library-collapsed='true']_>_[class~='group/editor-side-left']]:border-[color:currentColor] [&[data-inspector-collapsed='true']_>_[class~='group/editor-side-right']]:border-[length:0] [&[data-inspector-collapsed='true']_>_[class~='group/editor-side-right']]:border-none [&[data-inspector-collapsed='true']_>_[class~='group/editor-side-right']]:border-[color:currentColor]",
          )}
          inert={busy && !publishing}
          data-library-collapsed={libraryCollapsed}
          data-inspector-collapsed={inspectorCollapsed}
        >
          <div
            className={cn(
              "editor-side editor-side-left relative min-w-[0] min-h-[0] bg-[#fff] [&_>_aside]:h-[100%] [&_>_aside[hidden]]:hidden [&_[class~='group/panel-heading-collapsible']]:py-[10px] [&_[class~='group/panel-heading-collapsible']]:pr-[46px] [&_[class~='group/panel-heading-collapsible']]:pl-[14px] [&_[class~='group/panel-heading-collapsible']]:min-h-[54px] group/editor-side-left [border-right-width:1px] [border-right-style:solid] [border-right-color:#e4e9f1] [&_[class~='group/side-panel-toggle'][aria-expanded='false']]:left-[12px] [&_[class~='group/side-panel-toggle'][aria-expanded='false']]:right-[auto]",
            )}
          >
            <button
              className={cn(
                "side-panel-toggle group/side-panel-toggle border-[length:1px] border-solid border-[color:#e4e9f1] absolute top-[12px] right-[8px] z-[4] grid [place-items:center] w-[30px] h-[30px] rounded-[7px] bg-[#fff] text-[color:#68788e] [&:hover]:border-[color:#cddcfa] [&:hover]:bg-[#edf3ff] [&:hover]:text-[color:#356ae6] [&:focus-visible]:[outline:2px_solid_#356ae6] [&:focus-visible]:[outline-offset:2px] [&[aria-expanded='false']]:top-[20px] [&[aria-expanded='false']]:right-[12px] [&[aria-expanded='false']]:[box-shadow:0_2px_8px_#23334d14]",
              )}
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
              className={cn(
                "library overflow-hidden flex flex-col min-h-[0] bg-[white] min-w-[0] [&&_[class~='group/panel-heading']]:px-[14px] [&&_[class~='group/panel-heading']]:gap-[8px] [&&_[class~='group/panel-heading']]:pt-[17px] [&&_[class~='group/panel-heading']]:pb-[12px] [&&_[class~='group/panel-heading']_>_span]:whitespace-nowrap [&_button:focus-visible]:[outline:2px_solid_#356ae6] [&_button:focus-visible]:[outline-offset:-2px] [&_[class~='group/piece-tabs']_button]:[font-size:12px] [&_[class~='group/piece-card']_>_span:last-child]:[font-size:13px]! [&_[class~='group/library-tip']_p]:[font-size:11px]",
              )}
              aria-label="Bibliothèque de pièces"
              hidden={libraryCollapsed}
            >
              <div
                className={cn(
                  "library-header shrink-[0] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#edf0f5]",
                )}
              >
                <div
                  className={cn(
                    "panel-heading panel-heading-collapsible group/panel-heading-collapsible [&_h2]:leading-[18px] [&_>_div_>_span]:block [&_>_div_>_span]:mt-[2px] [&_>_div_>_span]:text-[color:#68788e] [&_>_div_>_span]:[font-size:11px] [&_>_div_>_span]:leading-[14px] group/panel-heading px-[18px] flex items-center justify-between pt-[22px] pb-[16px] [&_h2]:[font-size:14px] [&_h2]:font-[750] [&_>_span]:[font-size:12px] [&_>_span]:text-[color:#68788e]",
                  )}
                >
                  <div>
                    <h2>Les pièces</h2>
                    <span>
                      {visibleParts.length} modèle
                      {visibleParts.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                <div
                  className={cn(
                    "piece-tabs group/piece-tabs px-[12px] gap-[5px] grid grid-cols-[repeat(2,_minmax(0,_1fr))] pt-[0] pb-[12px] [&_button]:px-[8px] [&_button]:py-[5px] [&_button]:gap-[4px] [&_button]:border-[length:1px] [&_button]:border-solid [&_button]:border-[color:transparent] [&_button]:flex [&_button]:items-center [&_button]:justify-between [&_button]:min-h-[32px] [&_button]:text-[color:#68788e] [&_button]:rounded-[7px] [&_button]:text-left [&_button:hover]:bg-[#f5f7fb] [&_button[class~='group/active']]:border-[color:#dce6fc] [&_button[class~='group/active']]:bg-[#edf2ff] [&_button[class~='group/active']]:text-[color:#356ae6] [&_button[class~='group/active']]:font-[650]",
                  )}
                  role="group"
                  aria-label="Catégories de pièces"
                >
                  {pieceCategories.map(({ name, prefix }) => (
                    <button
                      key={name}
                      className={cn(
                        name === category ? "active group/active" : "",
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
                        className={cn(
                          "category-count [font-size:10px] tabular-nums opacity-[0.8]",
                        )}
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
                className={cn(
                  "library-scroll flex-[1] min-h-[0] overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:#c4cede_transparent] [overscroll-behavior:contain] [&:focus-visible]:[outline:2px_solid_#356ae6] [&:focus-visible]:[outline-offset:-2px]",
                )}
                ref={libraryScroll}
                role="region"
                aria-label="Modèles de pièces"
                tabIndex={0}
              >
                <div
                  className={cn(
                    "piece-grid p-[12px] gap-[8px] grid grid-cols-[repeat(2,_minmax(0,_1fr))] [align-content:start]",
                  )}
                >
                  {visibleParts.map(([id, p]) => (
                    <button
                      className={cn(
                        cn(
                          "piece-card group/piece-card px-[3px] py-[8px] gap-[5px] border-[length:1px] border-solid border-[color:#e7ebf1] [touch-action:none] select-none min-w-[0] min-h-[100px] rounded-[9px] flex flex-col items-center justify-center bg-[#fbfcfe] cursor-[grab] [@media(width>=1500px)]:min-h-[106px] [&:hover]:border-[color:#8dacf1] [&:hover]:bg-[#f0f5ff] [&[class~='group/active']]:border-[color:#8dacf1] [&[class~='group/active']]:bg-[#f0f5ff] [&:active]:cursor-[grabbing] [&:disabled]:cursor-[default] [&_>_span:last-child]:[font-size:13px]! [&_>_span:last-child]:leading-[1.4] [&_>_span:last-child]:text-[color:#65738a] [&_>_span:last-child]:[white-space:normal] [&_>_span:last-child]:max-w-[100%] [&_>_span:last-child]:[overflow-wrap:anywhere] [&_>_span:last-child]:text-center",
                          s.pending === id ? "active group/active" : "",
                        ),
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
                        <span
                          className={cn(
                            "piece-stock block text-[color:#356ae6] [font-size:10px] leading-[1.3] mb-[3px]",
                          )}
                        >
                          {remaining(id)} restante{remaining(id) > 1 ? "s" : ""}
                        </span>
                      )}
                      <span
                        className={cn(
                          "piece-preview flex items-center justify-center w-[100%] h-[56px] shrink-[0] pointer-events-none",
                        )}
                      >
                        <PartPreview type={id} color={s.color} />
                      </span>
                      <span className="piece-name">
                        {p.name.replace(/ \d.*$/, "")}
                        <span
                          className={cn(
                            "piece-dimensions block whitespace-nowrap [font-size:11px] text-[color:#8290a4] mt-[2px]",
                          )}
                        >
                          {p.name.match(/\d.*$/)?.[0]}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div
                className={cn(
                  "library-footer shrink-[0] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e7ecf3] bg-[#fff]",
                )}
              >
                <div className={cn("palette-section m-[0]")}>
                  <h2>
                    <button
                      className={cn(
                        "palette-toggle px-[12px] py-[10px] gap-[6px] flex items-center w-[100%] min-h-[48px] text-left [font-size:13px] font-[650] text-[color:#34435c] [&:hover]:bg-[#f8faff] [&:hover]:text-[color:#356ae6] [&_>_svg]:shrink-[0] [&[aria-expanded='true']_>_svg]:[transform:rotate(90deg)]",
                      )}
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
                      <span
                        className={cn(
                          "palette-current px-[6px] py-[4px] gap-[5px] border-[length:1px] border-solid border-[color:#e7ecf3] inline-flex items-center ml-[auto] rounded-[6px] bg-[#fbfcfe] text-[color:#68788e] [font-size:11px] font-[500] whitespace-nowrap [&_>_span]:w-[10px] [&_>_span]:h-[10px] [&_>_span]:rounded-[50%] [&_>_span]:[box-shadow:inset_0_0_0_1px_#00000014]",
                        )}
                      >
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
                    className={cn(
                      "palette px-[12px] gap-[5px] grid grid-cols-[repeat(6,_minmax(0,_1fr))] pt-[0] pb-[12px] [&[hidden]]:hidden [&_button]:p-[3px] [&_button]:border-[length:1px] [&_button]:border-solid [&_button]:border-[color:transparent] [&_button]:min-w-[0] [&_button]:h-[33px] [&_button]:rounded-[8px] [&_button:hover]:border-[color:#d2ddef] [&_button:hover]:bg-[#f1f5fc] [&_button[class~='group/chosen']]:border-[color:#356ae6] [&_button[class~='group/chosen']]:bg-[#edf3ff] [&_button[class~='group/chosen']]:[box-shadow:0_0_0_1px_#356ae620]",
                    )}
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
                          s.color === color ? "chosen group/chosen" : "",
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
                          className={cn(
                            "palette-swatch grid [place-items:center] w-[100%] h-[100%] rounded-[5px] [box-shadow:inset_0_0_0_1px_#00000014]",
                          )}
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
                <div
                  className={cn(
                    "library-tip group/library-tip px-[14px] gap-[8px] pt-[8px] pb-[12px] flex items-center text-[color:#68788e] bg-[#f8faff] [&_>_svg]:shrink-[0] [&_p]:[font-size:12px] [&_p]:leading-[1.6]",
                  )}
                >
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
          <section
            className={cn(
              "viewport overflow-hidden relative bg-[#edf1f7] min-w-[0]",
            )}
          >
            <div
              className={cn(
                "scene-toolbar p-[5px] gap-[3px] border-[length:1px] border-solid border-[color:#fff] absolute top-[20px] left-[50%] [transform:translateX(-50%)] z-[3] flex items-center bg-[#ffffffed] [box-shadow:0_4px_15px_#53668114] rounded-[10px] [&_button]:px-[7px] [&_button]:py-[0] [&_button]:gap-[6px] [&_button]:h-[33px] [&_button]:min-w-[34px] [&_button]:flex [&_button]:items-center [&_button]:justify-center [&_button]:rounded-[6px] [&_button]:text-[color:#7a879d] [&_button_span]:[font-size:14px]! [&_button_span]:whitespace-nowrap [@media(width<=1100px)]:[&_button_span]:hidden [&_button[class~='group/active']]:bg-[#eaf0ff] [&_button[class~='group/active']]:text-[color:#356ae6] [&_button:hover]:bg-[#f0f4fa]",
              )}
            >
              <div
                className={cn(
                  "tool-group flex [border-right-width:1px] [border-right-style:solid] [border-right-color:#e7ecf2] pr-[4px] mr-[2px]",
                )}
              >
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
              <div
                className={cn(
                  "tool-group flex [border-right-width:1px] [border-right-style:solid] [border-right-color:#e7ecf2] pr-[4px] mr-[2px]",
                )}
              >
                <button
                  title="Déplacer"
                  className={cn(
                    s.tool === "translate" ? "active group/active" : "",
                  )}
                  onClick={() => useEditor.setState({ tool: "translate" })}
                >
                  <Move3D size={19} />
                </button>
                <button
                  title="Tourner"
                  className={cn(
                    s.tool === "rotate" ? "active group/active" : "",
                  )}
                  onClick={() => useEditor.setState({ tool: "rotate" })}
                >
                  <Rotate3D size={19} />
                </button>
              </div>
              <button
                title="Aimantation"
                aria-pressed={s.snap}
                className={cn(s.snap ? "active group/active" : "")}
                onClick={() => useEditor.setState({ snap: !s.snap })}
              >
                <Magnet size={18} />
                <span>Aimantation</span>
              </button>
              <button
                title={s.showGrid ? "Masquer la grille" : "Afficher la grille"}
                aria-label="Grille"
                aria-pressed={s.showGrid}
                className={cn(s.showGrid ? "active group/active" : "")}
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
              <div
                className={cn(
                  "empty-state px-[25px] py-[70px] gap-[20px] min-h-[300px] flex flex-col items-center justify-center text-center text-[color:#7d8ba0] [&_h1]:text-[color:#32445f] [&_h1]:[font-size:24px] [&_h1]:font-[700] [&_h2]:text-[color:#32445f] [&_h2]:[font-size:24px] [&_h2]:font-[700] [&_p]:max-w-[510px] [&_p]:leading-[1.8]",
                )}
              >
                Chargement de la création…
              </div>
            )}
            {project.ready && !count && !s.pending && (
              <div
                className={cn(
                  "canvas-empty absolute left-[50%] top-[46%] [transform:translate(-50%,_-50%)] pointer-events-none text-center w-[100%] text-[color:#8291a9] [&_>_span]:font-[700] [&_>_span]:[font-size:26px] [&_>_span]:tracking-[-0.7px] [&_>_span]:leading-[1.4] [&_p]:[font-size:12px] [&_p]:mt-[12px]",
                )}
              >
                <span>
                  Une idée commence
                  <br />
                  par une brique.
                </span>
                <p>Choisissez votre première pièce à gauche.</p>
              </div>
            )}
            <div
              className={cn(
                "viewport-bottom gap-[8px] absolute left-[18px] bottom-[15px] right-[18px] z-[3] flex items-center flex-wrap pointer-events-none [font-size:12px] text-[color:#8591a3] [&_>_span:first-child]:px-[9px] [&_>_span:first-child]:py-[6px] [&_>_span:first-child]:border-[length:1px] [&_>_span:first-child]:border-solid [&_>_span:first-child]:border-[color:#dce3ed] [&_>_span:first-child]:rounded-[6px] [&_>_span:first-child]:bg-[#ffffff91] [&_>_span:first-child]:text-[color:#6e7f96] [&_[class~='group/overlap']]:[font-size:10px] [&_[class~='group/overlap']]:text-[color:#956f21]",
              )}
            >
              <span>
                {count} /{" "}
                {stock
                  ? stock.reduce((sum, item) => sum + item.quantity, 0)
                  : 500}{" "}
                pièces
              </span>
              {overlap && (
                <span className={cn("overlap group/overlap")}>
                  Chevauchement existant à corriger
                </span>
              )}
              <div
                className={cn(
                  "view-select gap-[8px] ml-[auto] max-w-[100%] flex items-center justify-end flex-wrap pointer-events-none [&_>_*]:pointer-events-auto [&_[class~='group/scene-view-trigger']]:px-[10px] [&_[class~='group/scene-view-trigger']]:py-[0] [&_[class~='group/scene-view-trigger']]:border-[length:1px] [&_[class~='group/scene-view-trigger']]:border-solid [&_[class~='group/scene-view-trigger']]:border-[color:#dce5f0] [&_[class~='group/scene-view-trigger']]:h-[38px] [&_[class~='group/scene-view-trigger']]:w-[132px] [&_[class~='group/scene-view-trigger']]:[font-size:12px] [&_[class~='group/scene-view-trigger']]:bg-[#fffffff0] [&_[class~='group/scene-view-trigger']]:rounded-[8px] [&_[class~='group/scene-view-trigger']]:[box-shadow:0_2px_8px_#53668108] [&_[class~='group/scene-view-trigger']]:text-[color:#64758d]",
                )}
              >
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
                    className={cn(
                      "scene-view-trigger group/scene-view-trigger [&:hover]:border-[color:#b9cbed] [&:hover]:bg-[#fff] [&:hover]:text-[color:#356ae6] [&[aria-expanded='true']]:border-[color:#b9cbed] [&[aria-expanded='true']]:bg-[#fff] [&[aria-expanded='true']]:text-[color:#356ae6]",
                    )}
                    aria-label="Vue de la caméra"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    className={cn(
                      "scene-view-menu p-[5px] min-w-[152px] rounded-[10px] bg-[#fff] [box-shadow:0_8px_24px_#33476b24] [&_[data-slot='select-item']]:py-[7px] [&_[data-slot='select-item']]:min-h-[32px] [&_[data-slot='select-item']]:pr-[30px] [&_[data-slot='select-item']]:pl-[10px] [&_[data-slot='select-item']]:rounded-[6px] [&_[data-slot='select-item']]:text-[color:#536580] [&_[data-slot='select-item']]:[font-size:12px] [&_[data-slot='select-item']]:cursor-[pointer] [&_[data-slot='select-item'][data-highlighted]]:bg-[#eef3ff] [&_[data-slot='select-item'][data-highlighted]]:text-[color:#356ae6] [&_[data-slot='select-item'][data-selected]]:bg-[#eef3ff] [&_[data-slot='select-item'][data-selected]]:text-[color:#356ae6]",
                    )}
                    side="top"
                    align="end"
                    sideOffset={8}
                    alignItemWithTrigger={false}
                  >
                    {cameraViews.map((view) => (
                      <SelectItem key={view.value} value={view.value}>
                        {view.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div
                  className={cn(
                    "scene-light-control py-[3px] gap-[10px] border-[length:1px] border-solid border-[color:#dce5f0] flex items-center h-[38px] pr-[8px] pl-[3px] rounded-[8px] bg-[#fffffff0] text-[color:#64758d] [box-shadow:0_2px_8px_#53668108] whitespace-nowrap [&_input]:p-[0] [&&_input]:m-[0] [&_input]:border-[length:0] [&_input]:border-none [&_input]:border-[color:currentColor] [&_input]:[appearance:none] [&_input]:[-webkit-appearance:none] [&_input]:w-[92px] [&_input]:h-[26px] [&_input]:rounded-[0] [&_input]:[background:repeating-linear-gradient(_to_right,_#cad4e3_0_1px,_transparent_1px_25%_)] [&_input]:[background-size:calc(100%_-_1px)_3px] [&_input]:[background-repeat:no-repeat] [&_input]:[background-position:center_bottom_2px] [&_input]:cursor-[ew-resize] [&_input::-webkit-slider-runnable-track]:h-[2px] [&_input::-webkit-slider-runnable-track]:rounded-[1px] [&_input::-webkit-slider-runnable-track]:[background:linear-gradient(_to_right,_#356ae6_var(--light-progress),_#dce3ef_var(--light-progress)_)] [&_input::-moz-range-track]:h-[2px] [&_input::-moz-range-track]:rounded-[1px] [&_input::-moz-range-track]:bg-[#dce3ef] [&_input::-moz-range-progress]:h-[2px] [&_input::-moz-range-progress]:bg-[#356ae6] [&_input::-webkit-slider-thumb]:border-[length:2px] [&_input::-webkit-slider-thumb]:border-solid [&_input::-webkit-slider-thumb]:border-[color:#fff] [&_input::-webkit-slider-thumb]:[appearance:none] [&_input::-webkit-slider-thumb]:[-webkit-appearance:none] [&_input::-webkit-slider-thumb]:box-border [&_input::-webkit-slider-thumb]:w-[9px] [&_input::-webkit-slider-thumb]:h-[14px] [&_input::-webkit-slider-thumb]:mt-[-6px] [&_input::-webkit-slider-thumb]:rounded-[3px] [&_input::-webkit-slider-thumb]:bg-[#356ae6] [&_input::-webkit-slider-thumb]:[box-shadow:0_0_0_1px_#b9cbed] [&_input::-moz-range-thumb]:border-[length:2px] [&_input::-moz-range-thumb]:border-solid [&_input::-moz-range-thumb]:border-[color:#fff] [&_input::-moz-range-thumb]:box-border [&_input::-moz-range-thumb]:w-[9px] [&_input::-moz-range-thumb]:h-[14px] [&_input::-moz-range-thumb]:rounded-[3px] [&_input::-moz-range-thumb]:bg-[#356ae6] [&_input::-moz-range-thumb]:[box-shadow:0_0_0_1px_#b9cbed] [&_input:enabled:hover::-webkit-slider-thumb]:[box-shadow:0_0_0_1px_#356ae6] [&_input:enabled:hover::-moz-range-thumb]:[box-shadow:0_0_0_1px_#356ae6] [&_input:focus-visible]:[outline:2px_solid_#356ae6] [&_input:focus-visible]:[outline-offset:3px] [&_input:focus-visible]:rounded-[3px] [&_input:disabled]:cursor-[not-allowed]",
                  )}
                  role="group"
                  aria-label="Éclairage"
                >
                  <button
                    type="button"
                    className={cn(
                      "scene-light-icon px-[10px] py-[0] gap-[7px] border-[length:1px] border-solid border-[color:#dce6fc] inline-flex items-center justify-center h-[30px] shrink-[0] rounded-[5px] bg-[#edf2ff] text-[color:#356ae6] [font-size:11px] font-[600] cursor-[pointer] [transition:background_150ms,_color_150ms,_border-color_150ms] [&:hover]:border-[color:#b8ccfc] [&:hover]:bg-[#dfe9ff] [&[aria-pressed='true']]:border-[color:#356ae6] [&[aria-pressed='true']]:bg-[#356ae6] [&[aria-pressed='true']]:text-[color:#fff] [&[aria-pressed='true']:hover]:border-[color:#2858c9] [&[aria-pressed='true']:hover]:bg-[#2858c9] [&:focus-visible]:[outline:2px_solid_#356ae6] [&:focus-visible]:[outline-offset:3px]",
                    )}
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
                    <Sun size={16} aria-hidden="true" />
                    <span>Tout éclairer</span>
                  </button>
                  <div
                    className={cn(
                      "scene-light-direction gap-[7px] flex items-center pl-[10px] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e6ebf3] [&[data-disabled='true']]:opacity-[0.35]",
                    )}
                    data-disabled={s.uniformLighting}
                  >
                    <input
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
                      className={cn(
                        "scene-light-angle min-w-[31px] text-[color:#64758d] [font-size:10px] text-right tabular-nums",
                      )}
                      aria-hidden="true"
                    >
                      {s.uniformLighting ? "—" : `${s.lightAngle}°`}
                    </output>
                  </div>
                </div>
              </div>
            </div>
          </section>
          <div
            className={cn(
              "editor-side editor-side-right relative min-w-[0] min-h-[0] bg-[#fff] [&_>_aside]:h-[100%] [&_>_aside[hidden]]:hidden [&_[class~='group/panel-heading-collapsible']]:py-[10px] [&_[class~='group/panel-heading-collapsible']]:pr-[46px] [&_[class~='group/panel-heading-collapsible']]:pl-[14px] [&_[class~='group/panel-heading-collapsible']]:min-h-[54px] group/editor-side-right [border-left-width:1px] [border-left-style:solid] [border-left-color:#e4e9f1]",
            )}
          >
            <button
              className={cn(
                "side-panel-toggle group/side-panel-toggle border-[length:1px] border-solid border-[color:#e4e9f1] absolute top-[12px] right-[8px] z-[4] grid [place-items:center] w-[30px] h-[30px] rounded-[7px] bg-[#fff] text-[color:#68788e] [&:hover]:border-[color:#cddcfa] [&:hover]:bg-[#edf3ff] [&:hover]:text-[color:#356ae6] [&:focus-visible]:[outline:2px_solid_#356ae6] [&:focus-visible]:[outline-offset:2px] [&[aria-expanded='false']]:top-[20px] [&[aria-expanded='false']]:right-[12px] [&[aria-expanded='false']]:[box-shadow:0_2px_8px_#23334d14]",
              )}
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
              className={cn(
                "inspector overflow-auto flex flex-col min-h-[0] bg-[white] [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:#c4cede_transparent] [overscroll-behavior:contain]",
              )}
              aria-label="Construction et propriétés"
              hidden={inspectorCollapsed}
            >
              <div
                className={cn(
                  "panel-heading panel-heading-collapsible group/panel-heading-collapsible [&_h2]:leading-[18px] [&_>_div_>_span]:block [&_>_div_>_span]:mt-[2px] [&_>_div_>_span]:text-[color:#68788e] [&_>_div_>_span]:[font-size:11px] [&_>_div_>_span]:leading-[14px] group/panel-heading px-[18px] flex items-center justify-between pt-[22px] pb-[16px] [&_h2]:[font-size:14px] [&_h2]:font-[750] [&_>_span]:[font-size:12px] [&_>_span]:text-[color:#68788e]",
                )}
              >
                <div>
                  <h2>Construction</h2>
                  <span>{count} pièces</span>
                </div>
              </div>
              <div
                className={cn(
                  "tree-actions [&_button]:p-[0] [&_button]:gap-[6px] [&_button]:h-[33px] [&_button]:min-w-[0] [&_button]:flex [&_button]:items-center [&_button]:justify-center [&_button]:rounded-[6px] [&_button]:text-[color:#7a879d] [&_button]:flex-[0_1_30px] [&_button:hover]:bg-[#f0f4fa] px-[8px] gap-[3px] flex pt-[0] pb-[12px] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#edf0f5] [&_button:focus-visible]:[outline:2px_solid_#356ae6] [&_button:focus-visible]:[outline-offset:2px] [&_button:focus-visible]:rounded-[4px]",
                )}
              >
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
                <span className={cn("tree-actions-spacer flex-[1]")} />
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
                className={cn(
                  "tree px-[0] py-[7px] overflow-auto [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:#c4cede_transparent] [overscroll-behavior:contain] flex-[1] min-h-[170px] [&[data-dragging]]:[overflow-anchor:none] [&[data-dragging]]:cursor-[grabbing] [&[data-dragging]_[class~='group/tree-name']]:cursor-[grabbing]",
                )}
                data-dragging={treeDrag.active || undefined}
                onPointerDown={treeDrag.onPointerDown}
                onDragStart={(event) => event.preventDefault()}
              >
                {s.scene.nodes.length ? (
                  <ul
                    className={cn("tree-branch p-[0] m-[0] list-none")}
                    aria-label="Pièces et groupes"
                  >
                    {tree(null)}
                  </ul>
                ) : (
                  <div
                    className={cn(
                      "tree-empty px-[10px] py-[40px] gap-[10px] flex items-center justify-center flex-col text-[color:#a5afbd] text-center [font-size:12px]",
                    )}
                  >
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
              <div
                className={cn(
                  "properties px-[17px] py-[0] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e9edf3] shrink-[0] [&_[class~='group/panel-heading']]:px-[0] [&_[class~='group/panel-heading']]:py-[19px] [&_input]:mt-[5px] [&_input]:[font-size:14px]! [&_input]:min-w-[0] [&_select]:p-[7px] [&_select]:border-[length:1px] [&_select]:border-solid [&_select]:border-[color:#e1e6ee] [&_select]:block [&_select]:rounded-[6px] [&_select]:[font-size:14px]! [&_select]:mt-[5px] [&_select]:w-[100%]",
                )}
              >
                <div
                  className={cn(
                    "panel-heading group/panel-heading px-[18px] flex items-center justify-between pt-[22px] pb-[16px] [&_h2]:[font-size:14px] [&_h2]:font-[750] [&_>_span]:[font-size:12px] [&_>_span]:text-[color:#68788e]",
                  )}
                >
                  <h2>
                    <button
                      className={cn(
                        "properties-toggle gap-[6px] [font-size:13px] font-[650] text-[color:#34435c] flex items-center rounded-[4px] [&:hover]:text-[color:#356ae6] [&:focus-visible]:[outline:2px_solid_#356ae6] [&:focus-visible]:[outline-offset:4px] [&[aria-expanded='true']_svg]:[transform:rotate(90deg)]",
                      )}
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
                  className={cn(
                    "properties-content pb-[20px] [&_>_label]:[font-size:14px]! [&_>_label]:text-[color:#7c899d] [&_>_label]:block [&_>_label]:mb-[12px]",
                  )}
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
                        <div
                          className={cn(
                            "transform-fields mt-[17px] [font-size:14px]! text-[color:#7c899d] [&_>_div]:gap-[6px] [&_>_div]:grid [&_>_div]:grid-cols-[repeat(3,_1fr)] [&_>_div]:mt-[7px] [&_>_div_>_label]:relative [&_input]:py-[7px] [&&_input]:m-[0] [&_input]:border-[length:1px] [&_input]:border-solid [&_input]:border-[color:#e2e7ef] [&_input]:rounded-[5px] [&_input]:w-[100%] [&_input]:pr-[2px] [&_input]:pl-[18px] [&_input]:[font-size:14px]! [&_input]:[appearance:textfield] [&_input::-webkit-inner-spin-button]:hidden [&_label_>_span]:absolute [&_label_>_span]:top-[9px] [&_label_>_span]:left-[6px] [&_label_>_span]:[font-size:10px]",
                          )}
                          key={field}
                        >
                          <label>
                            {field === "position"
                              ? "Position"
                              : "Rotation · degrés"}
                          </label>
                          <div>
                            {["X", "Y", "Z"].map((axis, i) => (
                              <label key={axis}>
                                <span
                                  className={cn(
                                    axis === "X" &&
                                      "axis-X text-[color:#d66d76]",
                                    axis === "Y" &&
                                      "axis-Y text-[color:#62a27d]",
                                    axis === "Z" &&
                                      "axis-Z text-[color:#5b8dce]",
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
                      <p
                        className={cn(
                          "property-hint text-[color:#68788e] [font-size:12px] leading-[1.8] mt-[8px]",
                        )}
                      >
                        {s.selection.length > 1
                          ? "Le groupe parent s’applique à toute la sélection. Le nom, la position et la rotation concernent le premier élément."
                          : "Dimensions fixes · positions relatives au groupe"}
                      </p>
                    </>
                  ) : (
                    <p
                      className={cn(
                        "property-hint text-[color:#68788e] [font-size:12px] leading-[1.8] mt-[8px]",
                      )}
                    >
                      Sélectionnez une pièce pour la modifier. Maintenez Maj
                      pour en sélectionner plusieurs.
                    </p>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
        <footer
          className={cn(
            "editor-footer px-[19px] py-[6px] gap-[8px] min-h-[33px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5e9f0] flex items-center justify-between flex-wrap shrink-[0] [font-size:12px] text-[color:#98a2b2] [&_>_span]:flex [&_>_span]:items-center [&_>_span]:gap-y-[6px] [&_>_span]:gap-x-[12px] [&_>_span]:flex-wrap",
          )}
        >
          <span>
            <span
              className={cn(
                "brand-mini [font-size:17px] tracking-[-1px] font-[800] text-[color:#8998ad]",
              )}
            >
              clik
            </span>{" "}
            L’atelier des possibles
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
