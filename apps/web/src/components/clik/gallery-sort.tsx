import { useId } from "react";
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
} {
  return {
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
  return (
    <div className="collection-sort">
      <label htmlFor={id}>Trier par</label>
      <Select
        items={options}
        value={value}
        onValueChange={(next) => {
          if (next === "recent" || next === "oldest" || next === "comments")
            onValueChange(next);
        }}
      >
        <SelectTrigger id={id} className="collection-sort-trigger">
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          className="collection-sort-menu"
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
