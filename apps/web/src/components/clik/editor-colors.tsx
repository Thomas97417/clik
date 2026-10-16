import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronRight, Palette } from "lucide-react";
import { COLORS, COLOR_NAMES, descendants } from "@clik/scene";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { useEditor } from "@/lib/clik/store";
import {
  ColorPicker,
  ColorPickerSwatch,
  ColorPickerTrigger,
} from "@/components/reui/color-picker";
import {
  EditorColorPickerContent,
  editorColorPickerI18n,
} from "./editor-color-picker-content";
import { EditorSavedColors } from "./editor-saved-colors";

const colorName = (color: string) => {
  const index = COLORS.findIndex((preset) => preset === color.toLowerCase());
  return index >= 0 ? COLOR_NAMES[index] : color.toUpperCase();
};

export default function EditorColors({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const state = useEditor(
    useShallow((s) => ({
      color: s.color,
      scene: s.gesture?.scene ?? s.scene,
      selection: s.selection,
      manipulating: !!s.gesture || !!s.pending || !!s.libraryPointer,
    })),
  );
  const paletteId = useId();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const [draftColor, setDraftColor] = useState<string | null>(null);
  const editing = useRef(false);
  const frame = useRef<number | null>(null);
  const pendingColor = useRef<string | null>(null);
  const color = draftColor ?? state.color;
  const blocked = disabled || (state.manipulating && !editing.current);
  const custom = !COLORS.some((preset) => preset === color);
  const selectedColors = useMemo(() => {
    const ids = new Set(descendants(state.scene, state.selection));
    return new Set(
      state.scene.nodes.flatMap((node) =>
        node.kind === "part" && ids.has(node.id)
          ? [node.color.toLowerCase()]
          : [],
      ),
    );
  }, [state.scene, state.selection]);
  const mixed = selectedColors.size > 1;

  const clearPreview = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    pendingColor.current = null;
  };
  const preview = () => {
    frame.current = null;
    const next = pendingColor.current;
    pendingColor.current = null;
    if (next && editing.current) useEditor.getState().previewColor(next);
  };
  const cancel = () => {
    clearPreview();
    if (editing.current) useEditor.getState().cancel();
    editing.current = false;
    setDraftColor(null);
  };
  const finish = () => {
    if (!editing.current) return;
    try {
      // Flush the last pointer position before committing, even if its frame
      // has not painted yet. The entire adjustment remains one undo entry.
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      preview();
      useEditor.getState().end();
      editing.current = false;
    } catch (error) {
      cancel();
      toast.error(String(error));
    } finally {
      clearPreview();
      setDraftColor(null);
    }
  };
  // A close, lost capture or blur also finishes a drag that returns to its
  // initial shade, for which the picker intentionally emits no value commit.
  useEffect(() => {
    const blur = () => finish();
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("blur", blur);
      clearPreview();
      if (editing.current) useEditor.getState().cancel();
    };
  }, []);
  useEffect(() => {
    if (disabled) {
      cancel();
      setOpen(false);
    }
  }, [disabled]);

  return (
    <div className="palette-section m-0">
      <h2>
        <button
          type="button"
          className="palette-toggle panel-heading flex min-h-12 w-full cursor-pointer items-center gap-1.5 px-3 py-2.5 text-left text-[13px] font-[650] text-[#34435c] outline-offset-3 transition-colors hover:bg-[#f8faff] hover:text-[#356ae6] focus-visible:outline-2 focus-visible:outline-[#356ae6] focus-visible:-outline-offset-2 group/palette-toggle"
          aria-label={
            collapsed ? "Déplier les couleurs" : "Replier les couleurs"
          }
          aria-expanded={!collapsed}
          aria-controls={paletteId}
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronRight
            size={16}
            aria-hidden="true"
            className="shrink-0 group-aria-expanded/palette-toggle:rotate-90"
          />
          Couleurs
          <span className="palette-current ml-auto inline-flex min-w-0 items-center gap-1.25 rounded-[6px] border border-[#e7ecf3] bg-[#fbfcfe] px-1.5 py-1 text-[11px] font-medium text-[#68788e]">
            <span
              className="size-2.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_#00000014]"
              style={{ background: color }}
              aria-hidden="true"
            />
            <span className="truncate">
              {mixed ? "Plusieurs couleurs" : colorName(color)}
            </span>
          </span>
        </button>
      </h2>
      <div
        id={paletteId}
        hidden={collapsed}
        className="px-3 pb-3 [&[hidden]]:hidden"
      >
        <div
          className="palette grid grid-cols-[repeat(auto-fill,minmax(22px,1fr))] gap-1.25"
          role="group"
          aria-label="Choisir une couleur"
        >
          {COLORS.map((preset, i) => {
            const chosen = !mixed && color === preset;
            return (
              <button
                key={preset}
                type="button"
                title={COLOR_NAMES[i]}
                aria-label={COLOR_NAMES[i]}
                aria-pressed={chosen}
                disabled={blocked}
                className={cn(
                  "aspect-square min-w-0 cursor-pointer rounded-[8px] border border-transparent p-0.5 outline-offset-2 transition-colors hover:border-[#d2ddef] hover:bg-[#f1f5fc] focus-visible:outline-2 focus-visible:outline-[#356ae6] disabled:cursor-not-allowed disabled:opacity-40",
                  chosen &&
                    "chosen border-[#356ae6] bg-[#edf3ff] shadow-[0_0_0_1px_#356ae620]",
                )}
                onClick={() => {
                  try {
                    useEditor.getState().setColor(preset);
                  } catch (error) {
                    toast.error(String(error));
                  }
                }}
              >
                <span
                  className="palette-swatch grid aspect-square w-full place-items-center rounded-[5px] shadow-[inset_0_0_0_1px_#00000014]"
                  style={{
                    background: preset,
                    color: [2, 3, 4, 7, 9, 10, 12].includes(i)
                      ? "#fff"
                      : "#25354e",
                  }}
                >
                  {chosen && (
                    <Check size={15} strokeWidth={3} aria-hidden="true" />
                  )}
                </span>
              </button>
            );
          })}
          <EditorSavedColors color={color} mixed={mixed} disabled={blocked} />
        </div>
        <ColorPicker
          value={color}
          format="hex"
          open={open}
          disabled={blocked}
          onOpenChange={(next) => {
            if (!next) finish();
            setOpen(next);
          }}
          onValueChange={(color) => {
            if (!color || blocked) return;
            try {
              const editor = useEditor.getState();
              if (!editing.current) {
                editor.begin();
                editing.current = true;
              }
              setDraftColor(color);
              pendingColor.current = color;
              if (frame.current === null) {
                frame.current = requestAnimationFrame(() => {
                  try {
                    preview();
                  } catch (error) {
                    cancel();
                    toast.error(String(error));
                  }
                });
              }
            } catch (error) {
              cancel();
              toast.error(String(error));
            }
          }}
          onValueCommit={finish}
          aria-label="Personnaliser la couleur"
          i18n={editorColorPickerI18n}
        >
          <ColorPickerTrigger
            className={cn(
              "mt-2 h-8.5 w-full cursor-pointer justify-start gap-2 rounded-[6px] border-[#e1e8f2] bg-[#fafcff] px-2 text-[11px] text-[#536580] shadow-none hover:border-[#cddcfa] hover:bg-[#edf3ff] hover:text-[#356ae6] focus-visible:ring-[#356ae6]/30",
              custom &&
                !mixed &&
                "border-[#cfddfb] bg-[#f2f6ff] text-[#356ae6]",
            )}
          >
            <Palette size={14} aria-hidden="true" className="shrink-0" />
            <span className="flex-1 text-left">Personnaliser</span>
            <ColorPickerSwatch className="size-3.5 rounded-[3px]" />
            <span className="font-mono text-[10px] uppercase tabular-nums">
              {color}
            </span>
          </ColorPickerTrigger>
          <EditorColorPickerContent
            onClose={() => {
              finish();
              setOpen(false);
            }}
            onPointerUp={finish}
            onPointerCancel={finish}
            onLostPointerCapture={finish}
            onKeyDown={(event) => {
              if (event.key === "Escape" && editing.current) {
                cancel();
              }
            }}
          >
            <p className="border-t border-[#edf0f5] pt-2 text-[11px] leading-relaxed text-[#68788e]">
              {selectedColors.size
                ? "Appliquée aux pièces sélectionnées, sauf celles verrouillées."
                : "Utilisée pour les prochaines pièces."}
            </p>
          </EditorColorPickerContent>
        </ColorPicker>
      </div>
    </div>
  );
}
