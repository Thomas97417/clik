import { cn } from "@/lib/utils";
function Brick({
  x,
  y,
  tone = "blue",
  scale = 1,
}: {
  x: number;
  y: number;
  tone?: "blue" | "peach" | "violet";
  scale?: number;
}) {
  const [top, left, right] = {
    blue: ["#aac6ff", "#6b98ed", "#4774c7"],
    peach: ["#ffdcc3", "#f2b18a", "#d58a64"],
    violet: ["#d9c6f7", "#b79add", "#9372c0"],
  }[tone];
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      strokeLinejoin="round"
    >
      <path d="m-23-4 30 15v19l-30-15Z" fill={left} />
      <path d="M7 11 25 2v19L7 30Z" fill={right} />
      <path d="m-23-4 18-9 30 15-18 9Z" fill={top} />
      {[-8, 7].map((cx) => (
        <g key={cx} transform={`translate(${cx} ${(cx + 8) / 2 - 6})`}>
          <path d="M-6-3v4a6 3 0 0 0 12 0v-4Z" fill={right} />
          <ellipse cy="-3" rx="6" ry="3" fill={top} stroke="#ffffff70" />
        </g>
      ))}
      <path d="m-23-4 30 15 18-9M7 11v19" stroke="#ffffff40" />
    </g>
  );
}

/** Small, static illustrations shared by the community sections. */
export default function CommunityArt({
  kind,
  className,
}: {
  kind: "remixes" | "comments";
  className?: string;
}) {
  return (
    <svg
      className={cn(
        "community-art group/community-art block w-28 h-21.5 shrink-0",
        className,
      )}
      viewBox="0 0 130 100"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {kind === "remixes" ? (
        <>
          <path
            d="M32 72C64 72 65 28 96 28M32 72h61"
            stroke="#c4afdF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="3 5"
          />
          <ellipse cx="30" cy="85" rx="22" ry="7" fill="#e3d9f2" />
          <Brick x={30} y={59} scale={0.85} />
          <Brick x={93} y={14} tone="peach" scale={0.7} />
          <Brick x={95} y={63} tone="violet" scale={0.7} />
          <path d="m51 15 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#c1a5df" />
        </>
      ) : (
        <>
          <path
            d="M33 21h64a12 12 0 0 1 12 12v29a12 12 0 0 1-12 12H68L51 86V74H33a12 12 0 0 1-12-12V33a12 12 0 0 1 12-12Z"
            fill="#f9e6d5"
          />
          <path
            d="M39 36h42M39 46h28"
            stroke="#d5ae8e"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <Brick x={80} y={54} tone="peach" scale={0.85} />
          <path d="m108 10 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#e1b592" />
          <circle cx="18" cy="81" r="3" fill="#c6d6f1" />
        </>
      )}
    </svg>
  );
}
