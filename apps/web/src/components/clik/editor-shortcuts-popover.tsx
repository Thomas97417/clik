import { useEffect, useRef, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  EDITOR_SHORTCUT_GROUPS,
  EDITOR_SHORTCUTS_DESCRIPTION,
  EDITOR_SHORTCUTS_TITLE,
  isMacKeyboard,
  shortcutKeys,
} from "@/lib/clik/editor-shortcuts";
import "./editor-shortcuts.css";

export default function EditorShortcutsPopover({
  disabled,
}: {
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mac, setMac] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => setMac(isMacKeyboard()), []);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!open || !trigger.current) return;
    const observer = new ResizeObserver(() => {
      if (!trigger.current?.getClientRects().length) setOpen(false);
    });
    observer.observe(trigger.current);
    return () => observer.disconnect();
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        ref={trigger}
        type="button"
        data-editor-tour="shortcuts"
        aria-label="Afficher les raccourcis de l’atelier"
        title="Afficher les raccourcis de l’atelier"
        disabled={disabled}
        className="editor-shortcuts-trigger -mx-1.5 -my-0.5 flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[6px] border-0 bg-transparent px-1.5 py-0.5 text-left [font:inherit] text-inherit outline-offset-3 transition-colors hover:text-[#356ae6] focus-visible:outline-2 focus-visible:outline-[#356ae6] disabled:cursor-default data-popup-open:text-[#356ae6]"
      >
        Glisser / flèches : déplacer · Maj + ↑ / ↓ : hauteur · Espace + glisser
        / clic droit : caméra · Maj + clic : sélection multiple{" "}
        <ChevronRight size={12} aria-hidden="true" /> {mac ? "⌘" : "Ctrl"} + D :
        dupliquer
        <ChevronRight size={12} aria-hidden="true" /> F : cadrer
        <ChevronRight size={12} aria-hidden="true" /> R / Maj + R : ±90°
        <ChevronRight size={12} aria-hidden="true" /> Échap : annuler
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={14}
        initialFocus={close}
        finalFocus={trigger}
        className="editor-shortcuts-popover relative w-100 max-w-[calc(100vw-32px)] max-h-[calc(100dvh-32px)] gap-0 overflow-y-auto overscroll-contain rounded-[12px] border border-solid border-[#dfe7f3] bg-white p-4.5 text-[#344964] ring-0 [box-shadow:0_14px_44px_#20396224] motion-reduce:animate-none"
        onKeyDown={(event) => {
          // Prevent Safari's history navigation while reading the shortcuts.
          if (["Backspace", "Delete"].includes(event.key))
            event.preventDefault();
        }}
      >
        <button
          ref={close}
          type="button"
          aria-label="Fermer les raccourcis"
          className="absolute right-2.5 top-2.5 grid size-6.5 cursor-pointer place-items-center rounded-[5px] text-[#8996a9] outline-offset-3 hover:bg-[#f0f4fa] hover:text-[#356ae6] focus-visible:outline-2 focus-visible:outline-[#356ae6]"
          onClick={() => setOpen(false)}
        >
          <X size={14} aria-hidden="true" />
        </button>
        <PopoverTitle className="pr-4 text-base font-[750] leading-[1.45] text-[#263b58]">
          {EDITOR_SHORTCUTS_TITLE}
        </PopoverTitle>
        <PopoverDescription className="mt-2.5 text-xs leading-[1.75] text-[#68788e]">
          {EDITOR_SHORTCUTS_DESCRIPTION}
        </PopoverDescription>
        <div
          className="editor-shortcuts-list"
          tabIndex={0}
          role="region"
          aria-label="Liste des raccourcis"
        >
          {EDITOR_SHORTCUT_GROUPS.map((group) => (
            <section className="editor-shortcut-group" key={group.title}>
              <h3>{group.title}</h3>
              {group.context && (
                <p className="editor-shortcut-context">{group.context}</p>
              )}
              {group.shortcuts.map((shortcut) => (
                <div className="editor-shortcut-row" key={shortcut.label}>
                  <span>{shortcut.label}</span>
                  <div className="editor-shortcut-keys">
                    {shortcut.keys.map((combination) => {
                      const keys = shortcutKeys(combination, mac);
                      const label = keys.map((key) => key.label).join(" + ");
                      return (
                        <kbd key={combination.join("-")} title={label}>
                          <span className="sr-only">{label}</span>
                          {keys.map((key, index) => (
                            <span key={index} aria-hidden="true">
                              {key.glyph}
                            </span>
                          ))}
                        </kbd>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
