import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type Side = "library" | "inspector";
type Widths = Record<Side, number>;
type Metrics = Widths & { available: number; scene: number };
type Drag = {
  side: Side;
  pointerId: number;
  startX: number;
  startWidth: number;
  previous: Widths;
  handle: HTMLDivElement;
};

const storageKey = "clik-editor-panel-widths";
const defaultWidths: Widths = { library: 0, inspector: 0 };

export default function EditorPanels({
  children,
  libraryCollapsed,
  inspectorCollapsed,
  libraryId,
  inspectorId,
  inert,
}: {
  children: ReactNode;
  libraryCollapsed: boolean;
  inspectorCollapsed: boolean;
  libraryId: string;
  inspectorId: string;
  inert?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  // Keep resize updates here so the library, hierarchy and scene do not rerender each move.
  const [preferred, setPreferred] = useState<Widths>(defaultWidths);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [resizing, setResizing] = useState<Side | null>(null);
  const collapsed = {
    library: libraryCollapsed,
    inspector: inspectorCollapsed,
  };

  useLayoutEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (saved && typeof saved === "object") {
        const width = (side: Side) =>
          typeof saved[side] === "number" &&
          Number.isFinite(saved[side]) &&
          saved[side] >= 0
            ? Math.round(saved[side])
            : 0;
        setPreferred({
          library: width("library"),
          inspector: width("inspector"),
        });
      }
    } catch {
      // Resizing also works when local storage is unavailable.
    }
    const element = container.current!;
    const measure = () => {
      if (!element.clientWidth) return;
      const style = getComputedStyle(element);
      const next = {
        available: element.clientWidth,
        library: parseFloat(style.getPropertyValue("--library-min-width")),
        inspector: parseFloat(style.getPropertyValue("--inspector-min-width")),
        scene: parseFloat(style.getPropertyValue("--scene-min-width")),
      };
      setMetrics((current) =>
        current &&
        (Object.keys(next) as (keyof Metrics)[]).every(
          (key) => current[key] === next[key],
        )
          ? current
          : next,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!metrics || resizing) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(preferred));
    } catch {
      // The current session keeps its widths without persistent storage.
    }
  }, [preferred, !!metrics, resizing]);

  const finish = (cancel = false) => {
    const session = drag.current;
    if (!session) return;
    drag.current = null;
    if (cancel) setPreferred(session.previous);
    setResizing(null);
    if (session.handle.hasPointerCapture(session.pointerId))
      session.handle.releasePointerCapture(session.pointerId);
  };

  useEffect(() => {
    const cancel = () => finish(true);
    window.addEventListener("blur", cancel);
    return () => {
      window.removeEventListener("blur", cancel);
      const session = drag.current;
      drag.current = null;
      if (session?.handle.hasPointerCapture(session.pointerId))
        session.handle.releasePointerCapture(session.pointerId);
    };
  }, []);

  useEffect(() => {
    if (drag.current && collapsed[drag.current.side]) finish(true);
  }, [libraryCollapsed, inspectorCollapsed]);

  const minimum = metrics ?? {
    library: 236,
    inspector: 264,
    scene: 300,
    available: 800,
  };
  const widths: Widths = {
    library: libraryCollapsed ? 0 : minimum.library,
    inspector: inspectorCollapsed ? 0 : minimum.inspector,
  };
  const extra = {
    library: libraryCollapsed
      ? 0
      : Math.max(0, preferred.library - minimum.library),
    inspector: inspectorCollapsed
      ? 0
      : Math.max(0, preferred.inspector - minimum.inspector),
  };
  const room = Math.max(
    0,
    minimum.available - minimum.scene - widths.library - widths.inspector,
  );
  // Keep both minimum widths and the scene visible as the window becomes narrower.
  const scale = Math.min(1, room / (extra.library + extra.inspector || 1));
  widths.library += Math.floor(extra.library * scale);
  widths.inspector += Math.floor(extra.inspector * scale);

  const maximum = (side: Side) =>
    Math.max(
      minimum[side],
      minimum.available -
        minimum.scene -
        widths[side === "library" ? "inspector" : "library"],
    );

  const resize = (side: Side, value: number) => {
    const other = side === "library" ? "inspector" : "library";
    setPreferred((current) => ({
      ...current,
      // Keep the other open panel steady when resizing an already constrained layout.
      ...(!collapsed[other] &&
        current[other] > widths[other] && { [other]: widths[other] }),
      [side]:
        value === 0
          ? 0
          : Math.min(maximum(side), Math.max(minimum[side], Math.round(value))),
    }));
  };

  const handle = (side: Side) => (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={
        side === "library"
          ? "Redimensionner la bibliothèque"
          : "Redimensionner le panneau de construction"
      }
      aria-controls={side === "library" ? libraryId : inspectorId}
      aria-valuemin={minimum[side]}
      aria-valuemax={maximum(side)}
      aria-valuenow={widths[side]}
      aria-valuetext={`${widths[side]} pixels`}
      title="Glisser pour redimensionner. Double-clic : largeur minimale."
      data-resizing={resizing === side}
      className={cn(
        "panel-resize-handle group/panel-resize absolute inset-y-0 z-5 w-2 cursor-col-resize touch-none select-none outline-none before:absolute before:inset-y-0 before:w-px before:bg-[#356ae6] before:opacity-0 hover:before:opacity-60 focus-visible:before:opacity-100 data-[resizing=true]:before:opacity-100",
        side === "library"
          ? "panel-resize-left left-(--library-width) -translate-x-0.5 before:left-0.5"
          : "panel-resize-right right-(--inspector-width) translate-x-0.5 before:right-0.5",
      )}
      onPointerDown={(event) => {
        if (event.button !== 0 || !event.isPrimary || drag.current) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.focus({ preventScroll: true });
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = {
          side,
          pointerId: event.pointerId,
          startX: event.clientX,
          startWidth: widths[side],
          previous: preferred,
          handle: event.currentTarget,
        };
        setResizing(side);
      }}
      onPointerMove={(event) => {
        const session = drag.current;
        if (!session || session.pointerId !== event.pointerId) return;
        event.preventDefault();
        resize(
          side,
          session.startWidth +
            (event.clientX - session.startX) * (side === "library" ? 1 : -1),
        );
      }}
      onPointerUp={(event) => {
        if (drag.current?.pointerId === event.pointerId) finish();
      }}
      onPointerCancel={(event) => {
        if (drag.current?.pointerId === event.pointerId) finish(true);
      }}
      onLostPointerCapture={(event) => {
        if (drag.current?.pointerId === event.pointerId) finish();
      }}
      onDoubleClick={() => resize(side, 0)}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") {
          event.preventDefault();
          finish(true);
          return;
        }
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key === "Home" || event.key === "End") {
          event.preventDefault();
          resize(side, event.key === "Home" ? 0 : maximum(side));
        } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          const direction =
            (event.key === "ArrowRight" ? 1 : -1) *
            (side === "library" ? 1 : -1);
          resize(side, widths[side] + direction * (event.shiftKey ? 40 : 10));
        }
      }}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-1/2 h-8 w-0.75 -translate-y-1/2 rounded-full bg-[#356ae6] opacity-0 group-hover/panel-resize:opacity-60 group-focus-visible/panel-resize:opacity-100 group-data-[resizing=true]/panel-resize:opacity-100",
          side === "library" ? "left-px" : "right-px",
        )}
      />
    </div>
  );

  return (
    <div
      ref={container}
      className="editor-body relative [--library-min-width:236px] [--inspector-min-width:264px] [--library-width:var(--library-min-width)] [--inspector-width:var(--inspector-min-width)] [--scene-min-width:300px] flex-1 grid grid-cols-[var(--library-width)_minmax(var(--scene-min-width),1fr)_var(--inspector-width)] min-h-0 max-xl-narrow:[--library-min-width:210px] max-xl-narrow:[--inspector-min-width:230px] max-xl-narrow:[--scene-min-width:280px] 2xl-narrow:[--library-min-width:260px] 2xl-narrow:[--inspector-min-width:285px] data-[library-collapsed=true]:[--library-width:0px] data-[inspector-collapsed=true]:[--inspector-width:0px] data-[resizing=true]:select-none data-[resizing=true]:cursor-col-resize group/editor-body"
      inert={inert}
      data-library-collapsed={libraryCollapsed}
      data-inspector-collapsed={inspectorCollapsed}
      data-resizing={resizing !== null}
      style={
        metrics
          ? ({
              "--library-width": `${widths.library}px`,
              "--inspector-width": `${widths.inspector}px`,
            } as CSSProperties)
          : undefined
      }
    >
      {children}
      {!libraryCollapsed && handle("library")}
      {!inspectorCollapsed && handle("inspector")}
      {resizing && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-50 cursor-col-resize"
        />
      )}
    </div>
  );
}
