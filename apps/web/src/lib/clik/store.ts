import { create } from "zustand";
import {
  applyDelta,
  descendants,
  duplicate,
  emptyScene,
  group,
  inherited,
  makePart,
  reparent,
  roots,
  snapPart,
  snapSelection,
  ungroup,
  validateScene,
  worldMatrix,
  transform,
  type SceneDocument,
  type SceneNode,
  type PartType,
  type Vec3,
  COLORS,
} from "@clik/scene";
import { Matrix4 } from "three";
type Snapshot = { scene: SceneDocument; title: string };
type State = Snapshot & {
  selection: string[];
  past: Snapshot[];
  future: Snapshot[];
  snap: boolean;
  tool: "translate" | "rotate";
  color: (typeof COLORS)[number];
  pending: PartType | null;
  frame: number;
  view: "perspective" | "top" | "front" | "right";
  serial: number;
  gesture: Snapshot | null;
  clipboard: SceneDocument | null;
  load: (scene: SceneDocument, title: string) => void;
  commit: (scene: SceneDocument, title?: string) => void;
  select: (id: string, add?: boolean) => void;
  add: (type: PartType, position?: Vec3) => void;
  patch: (id: string, patch: Partial<SceneNode>) => void;
  remove: () => void;
  duplicate: () => void;
  group: () => void;
  ungroup: () => void;
  reparent: (id: string, parentId: string | null, before?: string) => void;
  undo: () => void;
  redo: () => void;
  begin: () => void;
  preview: (delta: Matrix4) => void;
  end: () => void;
  cancel: () => void;
  copy: () => void;
  paste: () => void;
};
const snapshot = (s: State): Snapshot => ({ scene: s.scene, title: s.title });
export const useEditor = create<State>((set, get) => ({
  scene: emptyScene(),
  title: "Ma première création",
  selection: [],
  past: [],
  future: [],
  snap: true,
  tool: "translate",
  color: COLORS[9],
  pending: null,
  frame: 0,
  view: "perspective",
  serial: 0,
  gesture: null,
  clipboard: null,
  load: (scene, title) =>
    set({
      scene: validateScene(scene),
      title,
      selection: [],
      past: [],
      future: [],
      serial: 0,
      gesture: null,
    }),
  commit: (scene, title = get().title) => {
    validateScene(scene);
    const s = get();
    if (JSON.stringify(scene) === JSON.stringify(s.scene) && title === s.title)
      return;
    set({
      scene,
      title,
      past: [...s.past.slice(-79), snapshot(s)],
      future: [],
      serial: s.serial + 1,
    });
  },
  select: (id, add = false) =>
    set((s) => ({
      selection: add
        ? s.selection.includes(id)
          ? s.selection.filter((x) => x !== id)
          : [...s.selection, id]
        : [id],
    })),
  add: (type, position = [0, 0, 0]) => {
    const s = get(),
      part = snapPart(s.scene, makePart(type, s.color, position), s.snap);
    s.commit({ ...s.scene, nodes: [...s.scene.nodes, part] });
    set({ selection: [part.id], pending: null });
  },
  patch: (id, patch) => {
    const s = get();
    if (inherited(s.scene, id, "locked") && !("locked" in patch)) return;
    s.commit({
      ...s.scene,
      nodes: s.scene.nodes.map((n) =>
        n.id === id ? ({ ...n, ...patch } as SceneNode) : n,
      ),
    });
  },
  remove: () => {
    const s = get(),
      ids = descendants(
        s.scene,
        s.selection.filter((id) => !inherited(s.scene, id, "locked")),
      );
    s.commit({
      ...s.scene,
      nodes: s.scene.nodes.filter((n) => !ids.includes(n.id)),
    });
    set({ selection: [] });
  },
  duplicate: () => {
    const s = get(),
      r = duplicate(s.scene, s.selection);
    s.commit(r.scene);
    set({ selection: r.ids });
  },
  group: () => {
    const s = get(),
      ids = s.selection.filter((id) => !inherited(s.scene, id, "locked"));
    if (!ids.length) return;
    const id = crypto.randomUUID();
    s.commit(group(s.scene, ids, id));
    set({ selection: [id] });
  },
  ungroup: () => {
    const s = get();
    s.commit(
      ungroup(
        s.scene,
        s.selection.filter((id) => !inherited(s.scene, id, "locked")),
      ),
    );
    set({ selection: [] });
  },
  reparent: (id, parentId, before) => {
    const s = get();
    if (
      inherited(s.scene, id, "locked") ||
      (parentId && inherited(s.scene, parentId, "locked"))
    )
      return;
    const scene = reparent(s.scene, [id], parentId);
    if (before && before !== id) {
      const node = scene.nodes.find((n) => n.id === id)!;
      scene.nodes = scene.nodes.filter((n) => n.id !== id);
      const at = scene.nodes.findIndex((n) => n.id === before);
      scene.nodes.splice(at < 0 ? scene.nodes.length : at, 0, node);
    }
    s.commit(scene);
  },
  undo: () => {
    const s = get(),
      previous = s.past.at(-1);
    if (previous)
      set({
        ...previous,
        past: s.past.slice(0, -1),
        future: [snapshot(s), ...s.future],
        selection: [],
        serial: s.serial + 1,
      });
  },
  redo: () => {
    const s = get(),
      next = s.future[0];
    if (next)
      set({
        ...next,
        past: [...s.past, snapshot(s)],
        future: s.future.slice(1),
        selection: [],
        serial: s.serial + 1,
      });
  },
  begin: () => set((s) => ({ gesture: snapshot(s) })),
  preview: (delta) => {
    const s = get();
    if (s.gesture)
      set({
        scene: applyDelta(
          s.gesture.scene,
          s.selection.filter((id) => !inherited(s.scene, id, "locked")),
          delta,
        ),
      });
  },
  end: () => {
    const s = get();
    if (!s.gesture) return;
    const ids = roots(s.scene, s.selection).filter(
      (id) => !inherited(s.scene, id, "locked"),
    );
    const scene = snapSelection(s.scene, ids, s.snap);
    const before = s.gesture;
    set({ ...before, gesture: null });
    get().commit(scene);
  },
  cancel: () => {
    const s = get();
    set({ ...s.gesture, gesture: null, pending: null });
  },
  copy: () => {
    const s = get();
    const ids = descendants(s.scene, s.selection);
    let scene = {
      ...s.scene,
      nodes: s.scene.nodes.filter((n) => ids.includes(n.id)),
    };
    scene = {
      ...scene,
      nodes: scene.nodes.map((n) =>
        n.parentId && !ids.includes(n.parentId)
          ? { ...n, parentId: null, ...transform(worldMatrix(s.scene, n.id)) }
          : n,
      ),
    };
    set({ clipboard: scene });
  },
  paste: () => {
    const s = get();
    if (!s.clipboard) return;
    const r = duplicate(
      s.clipboard,
      roots(
        s.clipboard,
        s.clipboard.nodes.map((n) => n.id),
      ),
      s.scene,
    );
    s.commit(r.scene);
    set({ selection: r.ids });
  },
}));
