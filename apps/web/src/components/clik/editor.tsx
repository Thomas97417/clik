import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
} from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAction, useMutation } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import { Box3, Vector3 } from "three";
import {
  CATALOG,
  COLORS,
  COLOR_NAMES,
  inherited,
  ancestors,
  worldMatrix,
  type SceneNode,
  type PartType,
  type Vec3,
} from "@clik/scene";
import {
  ArrowLeft,
  Box,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  Eye,
  EyeOff,
  FolderPlus,
  Grid2X2,
  Grip,
  Layers,
  LockKeyhole,
  Magnet,
  Move3D,
  Redo2,
  Rotate3D,
  Scan,
  Sun,
  Trash2,
  Undo2,
  Ungroup,
  UnlockKeyhole,
  Upload,
  X,
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
];
const safe = (fn: () => unknown) => {
  try {
    const value = fn();
    if (value instanceof Promise) value.catch((e) => toast.error(String(e)));
  } catch (e) {
    toast.error(String(e));
  }
};
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
  const visibleParts = useMemo(() => {
    const prefix =
      pieceCategories.find((c) => c.name === category)?.prefix ?? "";
    return catalog.filter(([id]) => id.startsWith(prefix));
  }, [category]);
  const libraryScroll = useRef<HTMLDivElement>(null);
  // Presentation state only: folding never changes the scene or its history.
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const treeId = useId();
  const hierarchy = useMemo(() => {
    const children = new Map<string | null, SceneNode[]>();
    const groups = s.scene.nodes.filter((n) => n.kind === "group");
    for (const node of s.scene.nodes) {
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
  }, [s.scene]);
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
  const capture = useRef<() => Promise<ArrayBuffer>>(undefined);
  const [captureReady, setCaptureReady] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (publishing) dialogRef.current?.showModal();
  }, [publishing]);
  const onCapture = useCallback((fn: () => Promise<ArrayBuffer>) => {
    capture.current = fn;
    setCaptureReady(true);
  }, []);
  const upload = useAction(api.projects.uploadThumbnail),
    publish = useMutation(api.projects.publish);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (publishing) return;
      if (
        (e.target as HTMLElement)?.closest(
          'input,textarea,select,[contenteditable="true"]',
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
      if (e.key === "Delete" || e.key === "Backspace") {
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
      } else if (mod && e.key.toLowerCase() === "d") {
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
  }, [publishing]);
  const selected = s.scene.nodes.find((n) => n.id === s.selection[0]);
  const count = s.scene.nodes.filter((n) => n.kind === "part").length;
  const overlap = useMemo(() => {
    const parts = s.scene.nodes.filter(
      (n) => n.kind === "part" && !inherited(s.scene, n.id, "hidden"),
    );
    const boxes = parts.map((n) => {
      const d = CATALOG[(n as Extract<SceneNode, { kind: "part" }>).type];
      return new Box3(
        new Vector3(-d.w / 2 + 0.04, 0.04, -d.d / 2 + 0.04),
        new Vector3(d.w / 2 - 0.04, d.h - 0.04, d.d / 2 - 0.04),
      ).applyMatrix4(worldMatrix(s.scene, n.id));
    });
    return boxes.some((a, i) =>
      boxes.slice(i + 1).some((b) => a.intersectsBox(b)),
    );
  }, [s.gesture ? null : s.scene]);
  const preserve = async () => {
    const id = await project.copy();
    await navigate({ to: "/editor/$projectId", params: { projectId: id } });
  };
  const doPublish = async () => {
    if (!projectId || !capture.current) return;
    setBusy(true);
    try {
      const revision = await project.flush(),
        bytes = await capture.current();
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
      const collapsed = isGroup && collapsedGroups.has(n.id);
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
            draggable={!inherited(s.scene, n.id, "locked")}
            onDragStart={(e) => {
              e.dataTransfer.setData("clik/node", n.id);
            }}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const id = e.dataTransfer.getData("clik/node");
              if (id)
                safe(() => {
                  s.reparent(
                    id,
                    isGroup ? n.id : n.parentId,
                    isGroup ? undefined : n.id,
                  );
                  // A folded group remains a drop target; reveal the result.
                  if (isGroup)
                    setCollapsedGroups((previous) => {
                      const next = new Set(previous);
                      next.delete(n.id);
                      return next;
                    });
                });
            }}
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
        <div className="editor-top">
          <Link to="/projects" title="Mes créations" className="icon-button">
            <ArrowLeft size={19} />
          </Link>
          <Input
            className="project-title"
            aria-label="Nom du projet"
            key={`${projectId}-${project.ready}-${s.title}`}
            defaultValue={s.title}
            maxLength={100}
            onBlur={(e) =>
              safe(() =>
                s.commit(s.scene, e.target.value.trim() || "Sans titre"),
              )
            }
          />
          <span className="draft-tag">
            {projectId ? "Privé" : "Brouillon local"}
          </span>
          <div className="top-spacer" />
          <span className="save-status" role="status">
            <span
              className={project.status === "Enregistré" ? "status-dot" : ""}
            />
            {project.status}
          </span>
          {projectId ? (
            <Button
              disabled={
                !project.ready ||
                !captureReady ||
                !!s.gesture ||
                project.conflict
              }
              onClick={() => {
                setPubTitle(s.title);
                setPublishing(true);
              }}
            >
              <Upload size={15} /> Publier
            </Button>
          ) : project.isAuthenticated ? (
            <Button onClick={() => safe(preserve)}>
              Conserver dans mes projets
            </Button>
          ) : (
            <Link
              to="/sign-in"
              onClick={() =>
                sessionStorage.setItem(
                  "clik-return-to",
                  window.location.pathname,
                )
              }
              className="primary-link"
            >
              Se connecter pour sauvegarder
            </Link>
          )}
        </div>
        {project.conflict && (
          <div className="conflict" role="alert">
            Ce brouillon a changé dans un autre onglet.{" "}
            <Button variant="outline" onClick={() => safe(project.reload)}>
              Recharger
            </Button>
            {project.isAuthenticated ? (
              <Button onClick={() => safe(preserve)}>
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
        <div className="editor-body">
          <aside className="library" aria-label="Bibliothèque de pièces">
            <div className="library-header">
              <div className="panel-heading">
                <h2>Les pièces</h2>
                <span>
                  {visibleParts.length} modèle
                  {visibleParts.length === 1 ? "" : "s"}
                </span>
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
                      {catalog.filter(([id]) => id.startsWith(prefix)).length}
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
                    draggable
                    disabled={!project.ready || count >= 500}
                    aria-label={p.name}
                    title={`${p.name} — glisser dans la scène ou cliquer pour ajouter`}
                    onDragStart={(e) => {
                      useEditor.setState({ pending: id });
                      e.dataTransfer.setData("clik/part", id);
                    }}
                    onDragEnd={() => useEditor.setState({ pending: null })}
                    onClick={() => safe(() => s.add(id))}
                  >
                    <span className="piece-preview">
                      <PartPreview type={id} color={s.color} />
                    </span>
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="library-footer">
              <div className="palette-section">
                <div className="panel-heading">
                  <h2>Couleurs</h2>
                  <span>{COLOR_NAMES[COLORS.indexOf(s.color)]}</span>
                </div>
                <div className="palette">
                  {COLORS.map((color, i) => (
                    <button
                      key={color}
                      title={COLOR_NAMES[i]}
                      aria-label={COLOR_NAMES[i]}
                      aria-pressed={s.color === color}
                      style={{ background: color }}
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
                    />
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
            <div className="view-select">
              <select
                aria-label="Vue de la caméra"
                value={s.view}
                onChange={(e) =>
                  useEditor.setState({ view: e.target.value as typeof s.view })
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
            {project.ready ? (
              <ClientScene scene={s.scene} editable onCapture={onCapture} />
            ) : (
              <div className="empty-state">Chargement du brouillon…</div>
            )}
            {project.ready && !count && (
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
              <span>{count} / 500 pièces</span>
              {overlap && (
                <span className="overlap">
                  Chevauchement possible · autorisé
                </span>
              )}
              <span>
                Glisser une pièce : déplacer · Glisser dans le vide : orbiter ·
                Molette : zoom · Pièce saisie : tourner ±90°
              </span>
            </div>
          </section>
          <aside className="inspector">
            <div className="panel-heading">
              <h2>Construction</h2>
              <span>{count} pièces</span>
            </div>
            <div className="tree-actions">
              <button
                title="Grouper"
                onClick={() => safe(s.group)}
                disabled={!s.selection.length}
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
                title="Dupliquer"
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
                  setCollapsedGroups(new Set(hierarchy.groups.map((n) => n.id)))
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
              className="tree"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const id = e.dataTransfer.getData("clik/node");
                if (id) safe(() => s.reparent(id, null));
              }}
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
            <div className="properties">
              <div className="panel-heading">
                <h2>Propriétés</h2>
                <span>
                  {s.selection.length > 1
                    ? `${s.selection.length} éléments`
                    : ""}
                </span>
              </div>
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
                      value={selected.parentId ?? ""}
                      onChange={(e) =>
                        safe(() =>
                          s.reparent(selected.id, e.target.value || null),
                        )
                      }
                    >
                      <option value="">Racine</option>
                      {s.scene.nodes
                        .filter(
                          (n) => n.kind === "group" && n.id !== selected.id,
                        )
                        .map((n) => (
                          <option key={n.id} value={n.id}>
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
                                  (field === "rotation" ? 180 / Math.PI : 1);
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
                      ? "Les poignées déplacent la sélection entière. Les valeurs ci-dessus concernent le premier élément."
                      : "Dimensions fixes · positions relatives au groupe"}
                  </p>
                </>
              ) : (
                <p className="property-hint">
                  Sélectionnez une pièce pour la modifier. Maintenez Maj pour en
                  sélectionner plusieurs.
                </p>
              )}
            </div>
            {project.origin && (
              <p className="attribution">
                D’après « {project.origin.title} » de {project.origin.author}.
              </p>
            )}
          </aside>
        </div>
        <footer className="editor-footer">
          <span>
            <span className="brand-mini">clik</span> L’atelier des possibles
          </span>
          <span>
            Glisser : déplacer · Espace + glisser / clic droit : caméra · Maj +
            clic : sélection multiple <ChevronRight size={12} /> F : cadrer{" "}
            <ChevronRight size={12} /> Échap : annuler
          </span>
        </footer>
      </main>
      {publishing && (
        <dialog
          ref={dialogRef}
          className="modal-backdrop"
          onCancel={(e) => {
            if (busy) e.preventDefault();
            else setPublishing(false);
          }}
          onClose={() => setPublishing(false)}
        >
          <section
            className="publish-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="publish-title"
          >
            <button
              className="close-modal"
              aria-label="Fermer"
              disabled={busy}
              onClick={() => setPublishing(false)}
            >
              <X size={20} />
            </button>
            <span className="eyebrow">À partager, à réinventer</span>
            <h2 id="publish-title">Publier votre création</h2>
            <p>
              Une version de votre scène sera visible et réutilisable dans Clik
              avec attribution. Vos prochaines modifications resteront privées.
            </p>
            <label>
              Titre
              <Input
                autoFocus
                value={pubTitle}
                maxLength={100}
                onChange={(e) => setPubTitle(e.target.value)}
              />
            </label>
            <label>
              Description <span>facultative</span>
              <textarea
                maxLength={2000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </label>
            <p>La vue actuelle servira de miniature.</p>
            <Button
              disabled={busy || !pubTitle.trim()}
              onClick={() => void doPublish()}
            >
              {busy ? "Publication…" : "Publier cette version"}
            </Button>
          </section>
        </dialog>
      )}
    </>
  );
}
