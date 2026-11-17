import { memo, useId, useMemo, useRef, useState } from "react";
import {
  CATALOG,
  countStock,
  MAX_SCENE_PARTS,
  type PartType,
} from "@clik/scene";
import {
  Grip,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { Input } from "@/components/ui/input";
import { useEditor } from "@/lib/clik/store";
import { cn } from "@/lib/utils";
import EditorColors from "./editor-colors";
import PartPreview from "./part-preview";

const families = [
  { name: "Briques", prefix: "brick", example: "brick-2x3" },
  { name: "Plaques", prefix: "plate", example: "plate-2x4" },
  { name: "Pentes", prefix: "slope", example: "slope-2x2" },
  { name: "Tuiles", prefix: "tile", example: "tile-2x2" },
  { name: "Rondes", prefix: "round", example: "round-brick-2x2" },
  { name: "Angles", prefix: "corner", example: "corner-brick-2x2" },
  { name: "Arches", prefix: "arch", example: "arch-1x4x3" },
] satisfies Array<{
  name: string;
  prefix: string;
  example: PartType;
}>;

const dimensionOrder = new Intl.Collator("fr", { numeric: true });
const catalog = (
  Object.entries(CATALOG) as [PartType, (typeof CATALOG)[PartType]][]
).map(([id, part]) => {
  const dimensions = part.name.match(/\d.*$/)?.[0] ?? "";
  return {
    id,
    name: part.name,
    dimensions,
    model: part.name.slice(0, part.name.length - dimensions.length).trim(),
    search: normalizeSearch(`${part.name} ${id}`),
  };
});

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s*[×x]\s*/g, "x");
}

const LibraryPartPreview = memo(function LibraryPartPreview({
  type,
}: {
  type: PartType;
}) {
  const color = useEditor((state) => state.color);
  return <PartPreview className="size-full" type={type} color={color} />;
});

// The card owns the capture even if the canvas changes mode or has not mounted
// its listeners yet. Never leave that press pending after release/cancellation.
const releaseLibraryPointer = (event: { pointerId: number }) => {
  const state = useEditor.getState();
  if (state.libraryPointer?.id === event.pointerId) state.cancel();
};

const LibraryPartButton = memo(function LibraryPartButton({
  part,
  active,
  disabled,
  remaining,
}: {
  part: (typeof catalog)[number];
  active: boolean;
  disabled: boolean;
  remaining?: number;
}) {
  return (
    <button
      type="button"
      className={cn(
        "piece-card relative flex h-17 min-w-0 touch-none select-none flex-col items-center justify-center rounded-[7px] border border-solid border-[#e8edf4] bg-[#f6f8fb] p-0.5 text-[#253249] transition-[background-color,border-color,opacity] duration-200 motion-reduce:transition-none cursor-grab hover:border-[#c3d4fb] hover:bg-[#eef3ff] active:cursor-grabbing disabled:cursor-default disabled:opacity-40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#356ae6]",
        active && "active border-[#8dacf1] bg-[#eef3ff]",
      )}
      draggable={false}
      disabled={disabled}
      aria-label={part.name}
      aria-description={
        remaining === undefined
          ? undefined
          : `${remaining} pièce${remaining > 1 ? "s" : ""} en stock`
      }
      title={`${part.name} — glisser dans la scène ou cliquer pour ajouter`}
      onDragStart={(event) => event.preventDefault()}
      onPointerUp={releaseLibraryPointer}
      onPointerCancel={releaseLibraryPointer}
      onLostPointerCapture={releaseLibraryPointer}
      onPointerDown={(event) => {
        if (event.button !== 0 || !event.isPrimary) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        useEditor.setState({
          pending: null,
          libraryPointer: {
            id: event.pointerId,
            type: part.id,
            x: event.clientX,
            y: event.clientY,
          },
          libraryClickSuppressed: false,
        });
      }}
      onClick={(event) => {
        if (event.detail !== 0 && useEditor.getState().libraryClickSuppressed)
          return;
        try {
          useEditor.getState().add(part.id);
        } catch (error) {
          toast.error(String(error));
        }
      }}
    >
      {remaining !== undefined && (
        <span className="piece-stock absolute top-1 right-1 inline-flex min-w-4.5 items-center justify-center rounded bg-[#edf3ff] px-1 py-0.5 text-[10px] leading-3 text-[#356ae6] tabular-nums">
          {remaining}
          <span className="sr-only"> restante{remaining > 1 ? "s" : ""}</span>
        </span>
      )}
      <span className="piece-preview pointer-events-none flex h-10 w-15 max-w-full shrink-0 items-center justify-center">
        <LibraryPartPreview type={part.id} />
      </span>
      <span className="piece-dimensions block whitespace-nowrap text-[11px] font-semibold leading-4 tabular-nums">
        {part.dimensions}
      </span>
    </button>
  );
});

const EditorLibrary = memo(function EditorLibrary({
  id,
  collapsed,
  onCollapsedChange,
  ready,
  closed,
  colorsDisabled,
  tourActive,
}: {
  id: string;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  ready: boolean;
  closed: boolean;
  colorsDisabled: boolean;
  tourActive: boolean;
}) {
  const { scene, pending, stock } = useEditor(
    useShallow((state) => ({
      scene: state.gesture?.scene ?? state.scene,
      pending: state.pending,
      stock: state.challenge?.stock,
    })),
  );
  const used = useMemo(() => countStock(scene), [scene]);
  const count = useMemo(
    () => scene.nodes.filter((node) => node.kind === "part").length,
    [scene],
  );
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const activeQuery = tourActive ? "" : query;
  const scroll = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const headingId = useId();
  const availableFamilies = useMemo(
    () =>
      families
        .map((family) => ({
          ...family,
          parts: catalog.filter(
            ({ id }) =>
              id.startsWith(family.prefix) &&
              (!stock || stock.some((item) => item.type === id)),
          ),
        }))
        .filter(({ parts }) => parts.length > 0),
    [stock],
  );
  const activeCategory =
    !tourActive && availableFamilies.some(({ prefix }) => prefix === category)
      ? category
      : "";
  const matching = useMemo(() => {
    const terms = normalizeSearch(activeQuery)
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    return availableFamilies.map((family) => ({
      ...family,
      parts: family.parts.filter((part) =>
        terms.every((term) => part.search.includes(term)),
      ),
    }));
  }, [availableFamilies, activeQuery]);
  const groups = useMemo(
    () =>
      matching
        .filter(
          ({ prefix, parts }) =>
            parts.length && (!activeCategory || activeCategory === prefix),
        )
        .map((family) => {
          const models = new Map<string, typeof family.parts>();
          for (const part of family.parts) {
            const sizes = models.get(part.model);
            if (sizes) sizes.push(part);
            else models.set(part.model, [part]);
          }
          for (const sizes of models.values()) {
            sizes.sort((a, b) =>
              dimensionOrder.compare(a.dimensions, b.dimensions),
            );
          }
          return { ...family, models };
        }),
    [matching, activeCategory],
  );
  const visibleCount = groups.reduce(
    (sum, group) => sum + group.parts.length,
    0,
  );
  const resetScroll = () => {
    if (scroll.current) scroll.current.scrollTop = 0;
  };
  const changeQuery = (value: string) => {
    setQuery(value);
    resetScroll();
  };
  const reset = () => {
    setQuery("");
    setCategory("");
    resetScroll();
    search.current?.focus();
  };

  return (
    <div className="editor-side editor-side-left relative min-w-0 min-h-0 bg-white group/editor-side-left border-r border-solid border-r-[#e4e9f1] group-data-[library-collapsed=true]/editor-body:border-0 group-data-[library-collapsed=true]/editor-body:border-none group-data-[library-collapsed=true]/editor-body:border-current">
      <button
        type="button"
        className="side-panel-toggle absolute top-3 right-2 z-4 grid size-7.5 cursor-pointer place-items-center rounded-[7px] border border-solid border-transparent bg-white text-[#748198] transition-colors hover:border-[#cddcfa] hover:bg-[#edf3ff] hover:text-[#356ae6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356ae6] aria-[expanded=false]:top-5 aria-[expanded=false]:left-3 aria-[expanded=false]:right-auto aria-[expanded=false]:border-[#e4e9f1] aria-[expanded=false]:[box-shadow:0_2px_8px_#23334d14]"
        aria-label={
          collapsed ? "Déplier la bibliothèque" : "Replier la bibliothèque"
        }
        title={
          collapsed ? "Déplier la bibliothèque" : "Replier la bibliothèque"
        }
        aria-expanded={!collapsed}
        aria-controls={id}
        onClick={() => onCollapsedChange(!collapsed)}
      >
        {collapsed ? (
          <PanelLeftOpen size={17} aria-hidden="true" />
        ) : (
          <PanelLeftClose size={17} aria-hidden="true" />
        )}
      </button>
      <aside
        id={id}
        data-editor-tour="library"
        className="library @container flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white [&[hidden]]:hidden"
        aria-label="Bibliothèque de pièces"
        hidden={collapsed}
      >
        <header className="library-header shrink-0 border-b border-solid border-[#e3e9f2] p-3">
          <div className="panel-heading flex h-7.5 items-center gap-2 pr-8">
            <h2 className="text-sm font-[750] leading-4.5 text-[#253249]">
              Pièces
            </h2>
            <span
              className="library-count inline-flex h-5 min-w-6 items-center justify-center rounded-[5px] bg-[#f1f4f9] px-1.5 text-[11px] leading-none text-[#748198] tabular-nums"
              aria-hidden="true"
            >
              {visibleCount}
            </span>
            <span
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="sr-only"
            >
              {visibleCount} modèle{visibleCount === 1 ? "" : "s"}
            </span>
          </div>
          <div className="library-search mt-2 flex h-9 min-w-0 items-center gap-1.5 rounded-lg border border-solid border-[#e3e9f2] bg-[#f5f7fb] px-2.5 transition-shadow focus-within:border-[#a6bfef] focus-within:ring-2 focus-within:ring-[#e9f0ff]">
            <Search
              size={14}
              className="shrink-0 text-[#748198]"
              aria-hidden="true"
            />
            <Input
              ref={search}
              type="search"
              aria-label="Rechercher une pièce"
              placeholder="Nom ou dimensions"
              autoComplete="off"
              spellCheck={false}
              className="h-full min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 text-xs! leading-4 text-[#253249] [box-shadow:none] placeholder:text-[#8290a4] focus-visible:border-0 focus-visible:ring-0 focus-visible:[box-shadow:none] [&::-webkit-search-cancel-button]:hidden"
              value={activeQuery}
              onChange={(event) => changeQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Escape") return;
                event.stopPropagation();
                if (query) changeQuery("");
                else event.currentTarget.blur();
              }}
            />
            {activeQuery ? (
              <button
                type="button"
                aria-label="Effacer la recherche"
                className="grid size-5.5 shrink-0 cursor-pointer place-items-center rounded text-[#748198] hover:bg-[#e6ecf7] hover:text-[#356ae6] focus-visible:outline-2 focus-visible:outline-[#356ae6]"
                onClick={() => {
                  changeQuery("");
                  search.current?.focus();
                }}
              >
                <X size={13} aria-hidden="true" />
              </button>
            ) : (
              <span className="size-5.5 shrink-0" aria-hidden="true" />
            )}
          </div>
          <div
            role="radiogroup"
            aria-label="Familles de pièces"
            className="library-category mt-2 grid grid-cols-4 gap-1 @min-[420px]:grid-cols-8"
          >
            {[
              { name: "Toutes", prefix: "", example: null, disabled: false },
              ...matching.map((family) => ({
                ...family,
                disabled: !family.parts.length,
              })),
            ].map(({ name, prefix, example, disabled }) => (
              <label
                key={prefix}
                className="relative flex min-h-10 min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border border-transparent px-0.5 py-1 text-[11px] font-medium leading-3.5 text-[#536580] hover:bg-[#f1f4fa] has-checked:border-[#c4d5fb] has-checked:bg-[#edf3ff] has-checked:text-[#305fc9] has-disabled:cursor-default has-disabled:opacity-40 has-focus-visible:outline-2 has-focus-visible:outline-[#356ae6] [@media(max-height:620px)]:min-h-6"
              >
                <input
                  type="radio"
                  name={headingId}
                  value={prefix}
                  aria-label={prefix ? name : "Toutes les familles"}
                  checked={activeCategory === prefix}
                  disabled={disabled && activeCategory !== prefix}
                  className="absolute inset-0 size-full cursor-[inherit] opacity-0"
                  onChange={() => {
                    setCategory(prefix);
                    resetScroll();
                  }}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none flex h-5 w-8 items-center justify-center [&>svg:not([width='0'])]:size-4 [@media(max-height:620px)]:hidden"
                >
                  {example ? (
                    <PartPreview
                      type={example}
                      color={activeCategory === prefix ? "#4079e8" : "#788aa4"}
                      className="size-full"
                    />
                  ) : (
                    <LayoutGrid size={15} />
                  )}
                </span>
                {name}
              </label>
            ))}
          </div>
        </header>
        <div
          className="library-scroll min-h-0 flex-1 scroll-pt-8 overflow-x-hidden overflow-y-auto overscroll-contain bg-white px-2.5 pb-3 [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:#c4cede_transparent] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#356ae6]"
          ref={scroll}
          role="region"
          aria-label="Modèles de pièces"
          tabIndex={0}
        >
          {groups.map(({ name, prefix, parts, models }) => (
            <section
              key={prefix}
              className="piece-family mb-3"
              aria-labelledby={`${headingId}-${prefix}`}
            >
              <h3
                id={`${headingId}-${prefix}`}
                className="piece-family-heading sticky top-0 z-2 flex h-8 items-center gap-1.5 bg-white text-xs font-bold text-[#34435c]"
              >
                {name}
                <span
                  className="ml-auto text-[11px] font-medium text-[#68788e] tabular-nums"
                  aria-hidden="true"
                >
                  {parts.length}
                </span>
              </h3>
              {Array.from(models, ([model, sizes]) => (
                <div key={model} className="mb-2">
                  {`${model}s` !== name && (
                    <h4 className="mb-1 text-[11px] font-medium leading-4 text-[#62748b]">
                      {model}
                    </h4>
                  )}
                  <div className="piece-grid grid grid-cols-[repeat(auto-fill,minmax(66px,1fr))] content-start gap-1">
                    {sizes.map((part) => {
                      const amount = stock
                        ? (stock.find((item) => item.type === part.id)
                            ?.quantity ?? 0) - (used[part.id] ?? 0)
                        : MAX_SCENE_PARTS - count;
                      return (
                        <LibraryPartButton
                          key={part.id}
                          part={part}
                          active={pending === part.id}
                          disabled={
                            !ready ||
                            closed ||
                            count >= MAX_SCENE_PARTS ||
                            amount <= 0
                          }
                          remaining={stock ? Math.max(0, amount) : undefined}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>
          ))}
          {!visibleCount && (
            <div className="flex flex-col items-center gap-2 px-2 py-7 text-center">
              <Search size={22} className="text-[#a2aec0]" aria-hidden="true" />
              <p className="text-xs font-medium text-[#536580]">
                Aucune pièce correspondante
              </p>
              <p className="text-[11px] leading-4.5 text-[#8290a4]">
                Essayez un nom ou des dimensions.
              </p>
              {(query || category) && (
                <button
                  type="button"
                  className="mt-1 cursor-pointer rounded px-1 py-1 text-[11px] font-medium text-[#356ae6] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-[#356ae6]"
                  onClick={reset}
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          )}
        </div>
        <div className="library-footer shrink-0 border-t border-solid border-[#e7ecf3] bg-white">
          <EditorColors forceExpanded={tourActive} disabled={colorsDisabled} />
          <div className="library-tip flex h-10 [@media(max-height:620px)]:hidden shrink-0 items-center gap-1.5 border-t border-solid border-[#edf0f5] px-3 text-[#8290a4]">
            <Grip size={14} className="shrink-0" aria-hidden="true" />
            <p className="text-[11px] leading-4">
              Cliquer ou glisser pour ajouter
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
});
export default EditorLibrary;
