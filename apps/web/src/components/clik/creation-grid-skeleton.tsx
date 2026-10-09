import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function CreationGridSkeleton({
  variant = "public",
  className,
}: {
  variant?: "project" | "public";
  className?: string;
}) {
  return (
    <div role="status" aria-label="Chargement des créations">
      <span className="sr-only">Chargement des créations…</span>
      <div
        className={cn(
          "creation-grid group/creation-grid gap-6.5 grid grid-cols-3 max-sm-narrow:gap-3.75 max-sm-narrow:grid-cols-1 min-sm-narrow:max-lg-narrow:gap-3.75 min-sm-narrow:max-lg-narrow:grid-cols-2",
          className,
        )}
        aria-hidden="true"
      >
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className={cn(
              "creation-card-skeleton overflow-hidden border border-solid border-[#e4eaf2] rounded-[14px] bg-white min-w-0",
              variant === "project" ? "project-skeleton" : "gallery-skeleton",
            )}
          >
            <Skeleton className="aspect-4/3 rounded-none bg-[#edf2f8]" />
            <div
              className={cn(
                "pt-4.5",
                variant === "project" ? "px-4.5 pb-5" : "px-5 pb-3.5",
              )}
            >
              <Skeleton className="h-5 w-3/5 rounded-[4px] bg-[#edf2f8]" />
              {variant === "project" ? (
                <Skeleton className="mt-1.5 h-4 w-2/5 rounded-[4px] bg-[#edf2f8]" />
              ) : (
                <div className="mt-4 flex items-center gap-2">
                  <Skeleton className="size-6 shrink-0 rounded-full bg-[#edf2f8]" />
                  <Skeleton className="h-3 w-1/3 rounded-[4px] bg-[#edf2f8]" />
                  <Skeleton className="ml-auto h-6 w-12 rounded-[6px] bg-[#edf2f8]" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
