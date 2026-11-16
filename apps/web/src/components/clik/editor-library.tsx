import { memo, useId, useMemo, useRef, useState } from "react";
import { CATALOG, countStock, type PartType } from "@clik/scene";
import {
  Grip,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Shapes,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEditor } from "@/lib/clik/store";
import { cn } from "@/lib/utils";
import EditorColors from "./editor-colors";
import PartPreview from "./part-preview";

const families = [
  { name: "Briques", prefix: "brick" },
  { name: "Plaques", prefix: "plate" },
  { name: "Pentes", prefix: "slope" },
  { name: "Tuiles", prefix: "tile" },
  { name: "Rondes", prefix: "round" },
  { name: "Angles", prefix: "corner" },
  { name: "Arches", prefix: "arch" },
];
const categories = [{ name: "Toutes les familles", prefix: "" }, ...families];
const categoryItems = categories.map(({ name, prefix }) => ({
  label: name,
  value: prefix,
}));
const catalog = (
  Object.entries(CATALOG) as [PartType, (typeof CATALOG)[PartType]][]
).map(([id, part]) => ({
  id,
  name: part.name,
  dimensions: part.name.match(/\d.*$/)?.[0] ?? "",
  description:
    part.shape === "masonry"
      ? "Maçonnerie"
      : part.shape === "inverted-slope"
        ? "Inversée"
        : part.shape === "curved-slope"
          ? "Courbe"
          : part.shape === "cone"
            ? "Cône"
            : part.shape === "dome"
              ? "Dôme"
              : part.shape === "grille"
                ? "Grille"
                : part.shape === "quarter"
                  ? part.name.startsWith("Plaque")
                    ? "Plaque quart"
                    : "Tuile quart"
                  : id.startsWith("round-") || id.startsWith("corner-")
                    ? part.name.split(" ")[0]
                    : part.name.startsWith("Pente haute")
                      ? "Haute"
                      : "",
}));

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s*[×x]\s*/g, "x");
}
const searchableCatalog = catalog.map((part) => ({
  ...part,
  search: normalizeSearch(`${part.name} ${part.id}`),
}));

const LibraryPartPreview = memo(function LibraryPartPreview({
  type,
}: {
  type: PartType;
}) {
  const color = useEditor((state) => state.color);
  return (
    <PartPreview className="h-12 w-20 max-w-full" type={type} color={color} />
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
  const activeCategory = tourActive ? "" : category;
  const scroll = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const headingId = useId();
  const available = useMemo(
    () =>
      searchableCatalog.filter(
        ({ id }) => !stock || stock.some((item) => item.type === id),
      ),
    [stock],
  );
  const matching = useMemo(() => {
    const terms = normalizeSearch(activeQuery)
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    return available.filter((part) =>
      terms.every((term) => part.search.includes(term)),
    );
  }, [available, activeQuery]);
  const groups = useMemo(
    () =>
      families
        .filter(({ prefix }) => !activeCategory || prefix === activeCategory)
        .map((family) => ({
          ...family,
          parts: matching.filter(({ id }) => id.startsWith(family.prefix)),
        }))
        .filter(({ parts }) => parts.length > 0),
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
  // The card owns the capture even if the canvas changes mode or has not mounted
  // its listeners yet. Never leave that press pending after release/cancellation.
  const releaseLibraryPointer = (event: { pointerId: number }) => {
    const state = useEditor.getState();
    if (state.libraryPointer?.id === event.pointerId) state.cancel();
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
        className="library flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white [&[hidden]]:hidden"
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
          <Select
            items={categoryItems}
            value={activeCategory}
            onValueChange={(value) => {
              setCategory(value ?? "");
              resetScroll();
            }}
          >
            <SelectTrigger
              aria-label="Famille de pièces"
              className="library-category mt-2 w-full min-w-0 gap-2 rounded-[7px] border-[#e3e9f2] bg-white px-2.5 text-xs text-[#536580] focus-visible:border-[#a6bfef] focus-visible:ring-[#e9f0ff]"
            >
              <Shapes
                size={14}
                className="shrink-0 text-[#748198]"
                aria-hidden="true"
              />
              <SelectValue className="min-w-0 truncate" />
            </SelectTrigger>
            <SelectContent
              align="start"
              alignItemWithTrigger={false}
              className="rounded-[9px] border border-solid border-[#dfe6f2] bg-white p-1 text-[#536580] [box-shadow:0_8px_24px_#33476b24] ring-0"
            >
              {categories.map(({ name, prefix }) => {
                const amount = matching.filter(({ id }) =>
                  id.startsWith(prefix),
                ).length;
                return (
                  <SelectItem
                    key={prefix}
                    value={prefix}
                    aria-label={name}
                    disabled={!!prefix && amount === 0}
                    className="cursor-pointer rounded-[5px] py-2 pl-2.5 text-xs data-highlighted:bg-[#eef3ff] data-highlighted:text-[#356ae6] data-selected:bg-[#eef3ff] data-selected:text-[#356ae6] [&_[data-slot=select-item-text]]:min-w-0"
                  >
                    <span>{name}</span>
                    <span
                      className="ml-auto pl-2 text-[10px] tabular-nums opacity-70"
                      aria-hidden="true"
                    >
                      {amount}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </header>
        <div
          className="library-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-[#f5f7fb] px-2 pb-2 [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:#c4cede_transparent] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#356ae6]"
          ref={scroll}
          role="region"
          aria-label="Modèles de pièces"
          tabIndex={0}
        >
          {groups.map(({ name, prefix, parts }) => (
            <section
              key={prefix}
              className="piece-family mb-2"
              aria-labelledby={`${headingId}-${prefix}`}
            >
              <h3
                id={`${headingId}-${prefix}`}
                className="piece-family-heading sticky top-0 z-2 mb-1.5 flex h-8 items-center gap-1.5 bg-[#f5f7fb] px-1 text-xs font-medium text-[#536580]"
              >
                {name}
                <span
                  className="text-[11px] font-normal text-[#8290a4] tabular-nums"
                  aria-hidden="true"
                >
                  {parts.length}
                </span>
              </h3>
              <div className="piece-grid grid grid-cols-[repeat(auto-fill,minmax(82px,1fr))] content-start gap-1.5">
                {parts.map((part) => {
                  const amount = stock
                    ? (stock.find((item) => item.type === part.id)?.quantity ??
                        0) - (used[part.id] ?? 0)
                    : 500;
                  return (
                    <button
                      key={part.id}
                      type="button"
                      className={cn(
                        "piece-card group/piece-card relative flex h-24.5 min-w-0 touch-none select-none flex-col items-center justify-center gap-0.5 rounded-lg border border-solid border-transparent bg-white px-1 py-1.5 text-[#253249] transition-[background-color,border-color,opacity] duration-200 motion-reduce:transition-none cursor-grab hover:border-[#c3d4fb] hover:bg-[#eef3ff] active:cursor-grabbing disabled:cursor-default disabled:opacity-40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#356ae6]",
                        pending === part.id &&
                          "active border-[#8dacf1] bg-[#eef3ff]",
                      )}
                      draggable={false}
                      disabled={!ready || closed || count >= 500 || amount <= 0}
                      aria-label={part.name}
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
                        if (
                          event.detail !== 0 &&
                          useEditor.getState().libraryClickSuppressed
                        )
                          return;
                        try {
                          useEditor.getState().add(part.id);
                        } catch (error) {
                          toast.error(String(error));
                        }
                      }}
                    >
                      {stock && (
                        <span className="piece-stock absolute top-1 right-1 inline-flex min-w-4.5 items-center justify-center rounded bg-[#edf3ff] px-1 py-0.5 text-[10px] leading-3 text-[#356ae6] tabular-nums">
                          {Math.max(0, amount)}
                          <span className="sr-only">
                            {" "}
                            restante{amount > 1 ? "s" : ""}
                          </span>
                        </span>
                      )}
                      <span className="piece-preview pointer-events-none flex h-12 w-20 max-w-full shrink-0 items-center justify-center">
                        <LibraryPartPreview type={part.id} />
                      </span>
                      <span className="piece-dimensions block whitespace-nowrap text-xs font-medium leading-4">
                        {part.dimensions}
                      </span>
                      <span
                        className="piece-name block h-3.5 max-w-full truncate text-[11px] leading-3.5 text-[#8290a4]"
                        aria-hidden="true"
                      >
                        {part.description}
                      </span>
                    </button>
                  );
                })}
              </div>
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
          <div className="library-tip flex items-center gap-1.5 border-t border-solid border-[#edf0f5] px-3 py-2 text-[#8290a4]">
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
