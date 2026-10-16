import { useEffect, useId, useRef, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import {
  ColorPicker,
  getForegroundColor,
} from "@/components/reui/color-picker";
import {
  emptySavedColors,
  readSavedColors,
  rememberSavedColor,
  SAVED_COLORS_KEY,
} from "@/lib/clik/saved-colors";
import { useEditor } from "@/lib/clik/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  EditorColorPickerContent,
  editorColorPickerI18n,
} from "./editor-color-picker-content";

export function EditorSavedColors({
  color,
  mixed,
  disabled,
}: {
  color: string;
  mixed: boolean;
  disabled: boolean;
}) {
  const [colors, setColors] = useState(emptySavedColors);
  const latest = useRef(colors);
  const [slot, setSlot] = useState(0);
  const [draft, setDraft] = useState(color);
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement | null>(null);
  const hintId = useId();

  useEffect(() => {
    const load = () => {
      const saved = readSavedColors();
      latest.current = saved;
      setColors(saved);
    };
    load();
    const sync = (event: StorageEvent) => {
      if (event.key === SAVED_COLORS_KEY || event.key === null) load();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const edit = (index: number, button: HTMLButtonElement) => {
    if (disabled) return;
    anchor.current = button;
    setSlot(index);
    setDraft(colors[index] ?? color);
    setOpen(true);
  };
  const remember = (value: string | null) => {
    const next = rememberSavedColor(slot, value, latest.current);
    latest.current = next;
    setColors(next);
  };
  const apply = (value: string) => {
    try {
      useEditor.getState().setColor(value);
    } catch (error) {
      toast.error(String(error));
    }
  };

  return (
    <ColorPicker
      value={draft}
      format="hex"
      open={open}
      disabled={disabled}
      onOpenChange={setOpen}
      onValueChange={(value) => {
        if (value) setDraft(value);
      }}
      aria-label={`Couleur personnelle ${slot + 1}`}
      i18n={editorColorPickerI18n}
    >
      <span id={hintId} className="sr-only">
        Clic droit ou Maj + Entrée pour modifier une couleur personnelle.
      </span>
      {colors.map((saved, index) => {
        const chosen = !!saved && !mixed && saved === color;
        const label = saved
          ? `Couleur personnelle ${index + 1}, ${saved.toUpperCase()}`
          : `Ajouter la couleur personnelle ${index + 1}`;
        return (
          <button
            key={index}
            type="button"
            data-custom-color-slot={index + 1}
            aria-label={label}
            aria-describedby={saved ? hintId : undefined}
            aria-pressed={saved ? chosen : undefined}
            aria-keyshortcuts={saved ? "Shift+Enter Shift+F10" : undefined}
            title={saved ? `${label} · Clic droit pour modifier` : label}
            disabled={disabled}
            className={cn(
              "group/saved-color aspect-square min-w-0 cursor-pointer rounded-[8px] border border-transparent p-0.5 outline-offset-2 transition-colors hover:border-[#d2ddef] hover:bg-[#f1f5fc] focus-visible:outline-2 focus-visible:outline-[#356ae6] disabled:cursor-not-allowed disabled:opacity-40",
              chosen &&
                "chosen border-[#356ae6] bg-[#edf3ff] shadow-[0_0_0_1px_#356ae620]",
            )}
            onClick={(event) => {
              if (saved) apply(saved);
              else edit(index, event.currentTarget);
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              edit(index, event.currentTarget);
            }}
            onKeyDown={(event) => {
              if (
                event.key === "F2" ||
                (event.shiftKey && ["Enter", "F10"].includes(event.key))
              ) {
                event.preventDefault();
                edit(index, event.currentTarget);
              }
            }}
          >
            <span
              className={cn(
                "palette-swatch grid aspect-square w-full place-items-center rounded-[5px]",
                saved
                  ? "shadow-[inset_0_0_0_1px_#00000014]"
                  : "border border-dashed border-[#c6d2e3] bg-[#f8faff] text-[#8c9cb4] group-hover/saved-color:border-[#7d9fe9] group-hover/saved-color:text-[#356ae6]",
              )}
              style={
                saved
                  ? {
                      background: saved,
                      color:
                        getForegroundColor(saved, { dark: "#25354e" }) ??
                        undefined,
                    }
                  : undefined
              }
            >
              {chosen ? (
                <Check size={15} strokeWidth={3} aria-hidden="true" />
              ) : !saved ? (
                <Plus size={12} strokeWidth={1.75} aria-hidden="true" />
              ) : null}
            </span>
          </button>
        );
      })}
      <EditorColorPickerContent
        title={`Couleur personnelle ${slot + 1}`}
        anchor={anchor}
        finalFocus={anchor}
        onClose={() => setOpen(false)}
      >
        <div className="space-y-2.5 border-t border-[#edf0f5] pt-2.5">
          <p className="text-[11px] leading-relaxed text-[#68788e]">
            Conservée sur cet appareil, pour tous vos projets.
          </p>
          <div className="flex gap-2">
            {colors[slot] && (
              <button
                type="button"
                aria-label={`Vider la couleur personnelle ${slot + 1}`}
                title="Vider cet emplacement"
                className="grid size-8.5 shrink-0 cursor-pointer place-items-center rounded-[6px] border border-[#e1e8f2] text-[#7a879d] hover:border-[#f0c9c9] hover:bg-[#fff5f5] hover:text-[#b84646] focus-visible:outline-2 focus-visible:outline-[#356ae6]"
                onClick={() => {
                  remember(null);
                  setOpen(false);
                }}
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              className="inline-flex h-8.5 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[6px] bg-[#356ae6] px-2.5 text-xs font-medium text-white hover:bg-[#2959cb] focus-visible:outline-2 focus-visible:outline-[#356ae6] focus-visible:outline-offset-2"
              onClick={() => {
                try {
                  useEditor.getState().setColor(draft);
                  remember(draft);
                  setOpen(false);
                } catch (error) {
                  toast.error(String(error));
                }
              }}
            >
              <Check size={14} aria-hidden="true" />
              Enregistrer et utiliser
            </button>
          </div>
        </div>
      </EditorColorPickerContent>
    </ColorPicker>
  );
}
