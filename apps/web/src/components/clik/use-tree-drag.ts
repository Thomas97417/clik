import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { descendants, inherited, roots, type SceneDocument } from "@clik/scene";
import { useEditor } from "@/lib/clik/store";
import { moveTreeBranches } from "@/lib/clik/tree-order";
import { toast } from "sonner";

type Destination = {
  parentId: string | null;
  before?: string;
  rowId?: string;
  mode: "before" | "after" | "inside" | "end";
  label: string;
};
type Session = {
  pointerId: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  id: string;
  ids: string[];
  scene: SceneDocument;
  active: boolean;
  target: Destination | null;
  changed: boolean;
  hoverAt: number;
};
type Options = {
  scene: SceneDocument;
  selection: string[];
  disabled: boolean;
  collapsed: Set<string>;
  expand: (id: string) => void;
};

export function useTreeDrag(options: Options) {
  const config = useRef(options);
  config.current = options;
  const container = useRef<HTMLDivElement>(null);
  const session = useRef<Session | null>(null);
  const suppressClick = useRef(false);
  const stop = useRef<() => void>(() => {});
  const [preview, setPreview] = useState<{
    scene: SceneDocument;
    ids: string[];
    target: Destination | null;
  } | null>(null);
  const positions = useRef(new Map<string, number>());

  // Animate the other rows into their preview positions; the document is untouched.
  useLayoutEffect(() => {
    const rows =
      container.current?.querySelectorAll<HTMLElement>(".tree-row") ?? [];
    const next = new Map<string, number>();
    for (const row of rows) {
      row.getAnimations().forEach((animation) => animation.cancel());
      const id = row.dataset.nodeId!;
      const top =
        row.getBoundingClientRect().top + (container.current?.scrollTop ?? 0);
      const previous = positions.current.get(id);
      if (
        preview &&
        previous !== undefined &&
        !preview.ids.includes(id) &&
        Math.abs(previous - top) > 1 &&
        !matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        row.animate(
          [
            { transform: `translateY(${previous - top}px)` },
            { transform: "translateY(0)" },
          ],
          { duration: 140, easing: "ease-out" },
        );
      next.set(id, top);
    }
    positions.current = next;
  }, [preview, options.collapsed, options.scene]);

  useEffect(() => {
    let frame = 0;
    let lastTime = 0;
    let clickTimer = 0;
    const clear = () => {
      const current = session.current;
      session.current = null;
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      if (current && container.current?.hasPointerCapture(current.pointerId))
        container.current.releasePointerCapture(current.pointerId);
      setPreview(null);
      if (current?.active) {
        suppressClick.current = true;
        clearTimeout(clickTimer);
        clickTimer = window.setTimeout(() => {
          suppressClick.current = false;
        }, 0);
      }
    };
    stop.current = clear;
    const resolve = (current: Session): Destination | null => {
      const tree = container.current;
      if (!tree) return null;
      const bounds = tree.getBoundingClientRect();
      const inspector = tree.closest(".inspector")!.getBoundingClientRect();
      if (
        current.x < bounds.left ||
        current.x > bounds.right ||
        current.y < Math.max(bounds.top, inspector.top) ||
        current.y > Math.min(bounds.bottom, inspector.bottom)
      )
        return null;
      const hovered = document.elementFromPoint(current.x, current.y);
      if (!hovered || !tree.contains(hovered)) return null;
      const row = hovered.closest<HTMLElement>(".tree-row");
      const moving = new Set(descendants(current.scene, current.ids));
      let result: Destination;
      if (row) {
        const id = row.dataset.nodeId!;
        // Stay on the displayed placeholder; otherwise a stationary pointer
        // would continually exchange the dragged row with its neighbours.
        if (moving.has(id)) return current.target;
        const node = current.scene.nodes.find((n) => n.id === id)!;
        const rect = row.getBoundingClientRect();
        const ratio = (current.y - rect.top) / rect.height;
        if (node.kind === "group" && ratio >= 0.25 && ratio <= 0.75) {
          result = {
            parentId: id,
            rowId: id,
            mode: "inside",
            label: `Dans « ${node.name} »`,
          };
        } else {
          const after = ratio > (node.kind === "group" ? 0.75 : 0.5);
          const siblings = current.scene.nodes.filter(
            (n) => n.parentId === node.parentId && !current.ids.includes(n.id),
          );
          const next = siblings[siblings.findIndex((n) => n.id === id) + 1];
          result = {
            parentId: node.parentId,
            before: after ? next?.id : id,
            rowId: id,
            mode: after ? "after" : "before",
            label: `${after ? "Après" : "Avant"} « ${node.name} »`,
          };
        }
      } else {
        const first = tree.querySelector<HTMLElement>(".tree-row");
        const firstNode = current.scene.nodes.find(
          (n) => n.id === first?.dataset.nodeId,
        );
        result =
          first && firstNode && current.y < first.getBoundingClientRect().top
            ? {
                parentId: firstNode.parentId,
                before: firstNode.id,
                rowId: firstNode.id,
                mode: "before",
                label: `Avant « ${firstNode.name} »`,
              }
            : { parentId: null, mode: "end", label: "Fin de la construction" };
      }
      if (
        result.parentId &&
        (moving.has(result.parentId) ||
          inherited(current.scene, result.parentId, "locked"))
      )
        return null;
      return result;
    };
    const update = (current: Session, target: Destination | null) => {
      if (JSON.stringify(target) === JSON.stringify(current.target)) return;
      let scene = current.scene;
      try {
        if (target)
          scene = moveTreeBranches(
            scene,
            current.ids,
            target.parentId,
            target.before,
          );
      } catch {
        // A new parent can exceed the allowed local-coordinate range.
        target = null;
      }
      current.target = target;
      current.hoverAt = performance.now();
      setPreview({
        scene,
        ids: current.ids,
        target,
      });
    };
    const tick = (time: number) => {
      const current = session.current;
      if (!current?.active) return;
      const elapsed = lastTime ? Math.min(32, time - lastTime) : 16;
      lastTime = time;
      const tree = container.current;
      if (tree) {
        const inspector = tree.closest<HTMLElement>(".inspector")!;
        const bounds = tree.getBoundingClientRect(),
          outer = inspector.getBoundingClientRect();
        const top = Math.max(bounds.top, outer.top),
          bottom = Math.min(bounds.bottom, outer.bottom);
        if (
          current.x >= bounds.left &&
          current.x <= bounds.right &&
          current.y >= top - 12 &&
          current.y <= bottom + 12
        ) {
          const distance =
            current.y < top + 36
              ? current.y - top - 36
              : current.y > bottom - 36
                ? current.y - bottom + 36
                : 0;
          const amount =
            Math.max(-1, Math.min(1, distance / 36)) * elapsed * 0.55;
          if (amount) {
            const previous = tree.scrollTop;
            tree.scrollTop += amount;
            if (tree.scrollTop === previous) {
              if (
                (amount < 0 && bounds.top < outer.top) ||
                (amount > 0 && bounds.bottom > outer.bottom)
              )
                inspector.scrollTop += amount;
            }
            current.changed = true;
          }
        }
      }
      if (current.changed) {
        current.changed = false;
        update(current, resolve(current));
      }
      const target = current.target;
      if (
        target?.mode === "inside" &&
        target.parentId &&
        config.current.collapsed.has(target.parentId) &&
        time - current.hoverAt > 550
      )
        config.current.expand(target.parentId);
      frame = requestAnimationFrame(tick);
    };
    const move = (event: PointerEvent) => {
      const current = session.current;
      if (!current || current.pointerId !== event.pointerId) return;
      current.x = event.clientX;
      current.y = event.clientY;
      current.changed = true;
      if (
        !current.active &&
        Math.hypot(current.x - current.startX, current.y - current.startY) > 4
      ) {
        current.active = true;
        suppressClick.current = true;
        container.current?.setPointerCapture(current.pointerId);
        if (!config.current.selection.includes(current.id))
          useEditor.getState().select(current.id);
        setPreview({
          scene: current.scene,
          ids: current.ids,
          target: null,
        });
        frame = requestAnimationFrame(tick);
      }
      if (current.active) {
        event.preventDefault();
        event.stopPropagation();
        current.changed = false;
        update(current, resolve(current));
      }
    };
    const up = (event: PointerEvent) => {
      const current = session.current;
      if (!current || current.pointerId !== event.pointerId) return;
      if (current.active) {
        event.preventDefault();
        event.stopPropagation();
        const tree = container.current?.getBoundingClientRect();
        const inside =
          tree &&
          event.clientX >= tree.left &&
          event.clientX <= tree.right &&
          event.clientY >= tree.top &&
          event.clientY <= tree.bottom;
        if (
          inside &&
          current.target &&
          useEditor.getState().scene === current.scene
        ) {
          try {
            useEditor
              .getState()
              .reparent(
                current.id,
                current.target.parentId,
                current.target.before,
              );
            if (current.target.parentId)
              config.current.expand(current.target.parentId);
          } catch (error) {
            toast.error(String(error));
          }
        }
      }
      clear();
    };
    const key = (event: KeyboardEvent) => {
      if (session.current?.active) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.key === "Escape") clear();
      }
    };
    const cancelPointer = (event: PointerEvent) => {
      if (event.pointerId === session.current?.pointerId) clear();
    };
    const click = (event: MouseEvent) => {
      if (suppressClick.current) {
        event.preventDefault();
        event.stopImmediatePropagation();
        suppressClick.current = false;
      }
    };
    const scroll = () => {
      if (session.current) session.current.changed = true;
    };
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", up, true);
    window.addEventListener("pointercancel", cancelPointer, true);
    window.addEventListener("lostpointercapture", cancelPointer, true);
    window.addEventListener("keydown", key, true);
    window.addEventListener("click", click, true);
    window.addEventListener("blur", clear);
    window.addEventListener("scroll", scroll, true);
    return () => {
      clear();
      clearTimeout(clickTimer);
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", cancelPointer, true);
      window.removeEventListener("lostpointercapture", cancelPointer, true);
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("click", click, true);
      window.removeEventListener("blur", clear);
      window.removeEventListener("scroll", scroll, true);
    };
  }, []);
  useEffect(() => {
    if (
      options.disabled ||
      (session.current && session.current.scene !== options.scene)
    )
      stop.current();
  }, [options.disabled, options.scene]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      options.disabled ||
      event.button !== 0 ||
      event.shiftKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    const target = event.target as HTMLElement;
    const row = target.closest<HTMLElement>(".tree-row");
    if (!row || (target.closest("button") && !target.closest(".tree-name")))
      return;
    const id = row.dataset.nodeId!;
    if (inherited(options.scene, id, "locked")) return;
    const ids = roots(
      options.scene,
      options.selection.includes(id) ? options.selection : [id],
    ).filter((root) => !inherited(options.scene, root, "locked"));
    if (!ids.length) return;
    suppressClick.current = false;
    session.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      id,
      ids,
      scene: options.scene,
      active: false,
      target: null,
      changed: true,
      hoverAt: performance.now(),
    };
  };
  return {
    container,
    onPointerDown,
    active: !!preview,
    scene: preview?.scene ?? options.scene,
    ids: preview?.ids ?? [],
    target: preview?.target,
  };
}
