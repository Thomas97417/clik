import { cn } from "@/lib/utils";
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
}: {
  value: GallerySort;
  onValueChange: (value: GallerySort) => void;
}) {
  const id = useId();
  const hydrated = useHydrated();
  return (
    <div
      className={cn(
        "collection-sort group/collection-sort gap-[10px] flex items-center shrink-[0] [font-size:12px] text-[color:#71839c]",
      )}
    >
      <label htmlFor={id}>Trier par</label>
      <Select
        disabled={!hydrated}
        items={options}
        value={value}
        onValueChange={(next) => {
          if (next === "recent" || next === "oldest" || next === "comments")
            onValueChange(next);
        }}
      >
        <SelectTrigger
          id={id}
          className={cn(
            "collection-sort-trigger group/collection-sort-trigger px-[11px] py-[8px] border-[length:1px] border-solid border-[color:#dfe7f2] w-[190px] min-h-[38px] rounded-[9px] bg-[#fff] text-[color:#455f83] cursor-[pointer] [&:hover]:border-[color:#b7caf0] [&:hover]:bg-[#f8faff] [&[data-popup-open]]:border-[color:#b7caf0] [&[data-popup-open]]:bg-[#f8faff] [&:focus-visible]:[outline:2px_solid_#356ae6] [&:focus-visible]:[outline-offset:3px]",
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          className={cn(
            "collection-sort-menu p-[4px] rounded-[11px] bg-[#fff] text-[color:#455f83] [box-shadow:0_8px_24px_#213d6a14,_0_0_0_1px_#dfe7f2] [&_[data-slot='select-item']]:min-h-[36px] [&_[data-slot='select-item']]:rounded-[7px] [&_[data-slot='select-item']]:cursor-[pointer] [&_[data-slot='select-item'][data-highlighted]]:bg-[#edf3ff] [&_[data-slot='select-item'][data-highlighted]]:text-[color:#2458ce] [&_[data-slot='select-item'][data-selected]]:text-[color:#2458ce]",
          )}
          align="end"
          alignItemWithTrigger={false}
        >
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
