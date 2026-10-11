import { cn } from "@/lib/utils";

export default function AssemblyBadge({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "assembly-badge creation-kind-badge inline-flex w-fit shrink-0 items-center gap-1.5 rounded-[7px] border border-[#d6e2f0] bg-[#ffffffef] px-2 py-1 text-[10px] leading-4 font-[650] whitespace-nowrap text-[#445d7d] shadow-[0_1px_3px_#2039620a]",
        compact && "gap-1 px-1.5 py-0.5 text-[9px] leading-3.5",
        className,
      )}
    >
      <svg
        className={cn("size-4 shrink-0", compact && "size-3")}
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
        focusable="false"
        strokeLinejoin="round"
      >
        <path d="m2 10 7 3.5V17l-7-3.5Z" fill="#7faf98" />
        <path d="m9 13.5 9-4.5v3.5L9 17Z" fill="#57866e" />
        <path d="m2 10 9-4.5L18 9l-9 4.5Z" fill="#c2e1d1" />
        <path d="m3 5.5 6 3v3l-6-3Z" fill="#6693ec" />
        <path d="m9 8.5 6-3v3l-6 3Z" fill="#416ec2" />
        <path d="m3 5.5 6-3 6 3-6 3Z" fill="#abc8ff" />
        <path d="M7 4v1a1.5 .75 0 0 0 3 0V4Z" fill="#6693ec" />
        <ellipse cx="8.5" cy="4" rx="1.5" ry=".75" fill="#d4e4ff" />
        <path
          d="m3 5.5 6 3 6-3M2 10l7 3.5L18 9"
          stroke="#fff"
          strokeOpacity=".55"
          strokeWidth=".6"
        />
      </svg>
      Assemblage
    </span>
  );
}
