import { useId } from "react";
import { useHydrated } from "@tanstack/react-router";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const options = [
  { value: "recent", label: "Les plus récentes" },
  { value: "oldest", label: "Les plus anciennes" },
  { value: "comments", label: "Les plus commentées" },
] as const;
type GallerySort = (typeof options)[number]["value"];

export function validateGallerySearch(search: Record<string, unknown>): {
  sort?: GallerySort;
  cursor?: string;
} {
  return {
    cursor:
      (typeof search.cursor === "string" ||
        typeof search.cursor === "number") &&
      String(search.cursor).length <= 8192
        ? String(search.cursor)
        : undefined,
    sort:
      search.sort === "oldest" || search.sort === "comments"
        ? search.sort
        : undefined,
  };
}

export default function GallerySortSelect({
  value,
  onValueChange,
  disabled = false,
}: {
  value: GallerySort;
  onValueChange: (value: GallerySort) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const hydrated = useHydrated();
  return (
    <div className="collection-sort group/collection-sort gap-2.5 flex items-center shrink-0 text-xs leading-[inherit] text-[#71839c]">
      <label htmlFor={id}>Trier par</label>
      <Select
        disabled={disabled || !hydrated}
        items={options}
        value={value}
        onValueChange={(next) => {
          if (next === "recent" || next === "oldest" || next === "comments")
            onValueChange(next);
        }}
      >
        <SelectTrigger
          id={id}
          className="collection-sort-trigger group/collection-sort-trigger px-2.75 py-2 border border-solid border-[#dfe7f2] w-47.5 min-h-9.5 rounded-[9px] bg-white text-[#455f83] cursor-pointer hover:border-[#b7caf0] hover:bg-[#f8faff] data-popup-open:border-[#b7caf0] data-popup-open:bg-[#f8faff] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] focus-visible:outline-offset-3"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          className="collection-sort-menu p-1 rounded-[11px] bg-white text-[#455f83] [box-shadow:0_8px_24px_#213d6a14,0_0_0_1px_#dfe7f2]"
          align="end"
          alignItemWithTrigger={false}
        >
          {options.map((option) => (
            <SelectItem
              className="min-h-9 rounded-[7px] cursor-pointer data-highlighted:bg-[#edf3ff] data-highlighted:text-[#2458ce] data-selected:text-[#2458ce]"
              key={option.value}
              value={option.value}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
