import type { ComponentProps } from "react";
import { X } from "lucide-react";
import {
  ColorPickerArea,
  ColorPickerContent,
  ColorPickerCopy,
  ColorPickerFields,
  ColorPickerPanel,
  ColorPickerSlider,
} from "@/components/reui/color-picker";
import { cn } from "@/lib/utils";

export const editorColorPickerI18n = {
  labels: {
    panelLabel: "Couleur personnalisée",
    area: "Saturation et luminosité",
    hue: "Teinte",
    saturation: "Saturation",
    brightness: "Luminosité",
    red: "Rouge",
    green: "Vert",
    blue: "Bleu",
    hex: "Code hexadécimal",
    format: "Format",
    copy: "Copier la couleur",
    copied: "Couleur copiée",
  },
};

export function EditorColorPickerContent({
  title = "Couleur personnalisée",
  onClose,
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof ColorPickerContent>, "title" | "onClose"> & {
  title?: string;
  onClose: () => void;
}) {
  return (
    <ColorPickerContent
      side="right"
      sideOffset={12}
      align="end"
      className={cn(
        "editor-color-picker max-h-[calc(100dvh-24px)] w-72 gap-3 overflow-y-auto overscroll-contain rounded-[10px] border border-[#dce5f2] bg-white p-3 text-[#34435c] shadow-[0_8px_32px_#26395624] ring-0 [&_[data-slot=color-picker-area-thumb]]:rounded-full [&_[data-slot=color-picker-slider-thumb]]:rounded-full",
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">{title}</span>
        <button
          type="button"
          aria-label="Fermer le sélecteur de couleur"
          onClick={onClose}
          className="grid size-6 cursor-pointer place-items-center rounded-[4px] text-[#7a879d] hover:bg-[#edf3ff] hover:text-[#356ae6] focus-visible:outline-2 focus-visible:outline-[#356ae6]"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      <ColorPickerPanel>
        <ColorPickerArea className="h-36 rounded-[6px]" />
        <div className="flex items-center gap-3 py-0.5">
          <ColorPickerSlider channel="hue" className="flex-1 rounded-full" />
          <ColorPickerCopy className="size-7 rounded-[5px] text-[#68788e] hover:bg-[#edf3ff] hover:text-[#356ae6] [&>svg]:size-4" />
        </div>
        <ColorPickerFields
          formats={["hex", "rgb"]}
          className="h-8.5 rounded-[6px] border-[#dfe7f3] text-xs focus-within:border-[#356ae6] [&_[data-slot=input-group-button]]:rounded-[4px]"
        />
      </ColorPickerPanel>
      {children}
    </ColorPickerContent>
  );
}
