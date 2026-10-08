import { cn } from "@/lib/utils";
const tones = {
  blue: ["#8cb2ff", "#5787eb", "#3866c7"],
  peach: ["#ffd5bb", "#f3b18e", "#d88c6d"],
  violet: ["#d4baf4", "#b38bde", "#8e68bd"],
} as const;

function MiniBrick({
  x,
  y,
  tone = "blue",
  scale = 1,
}: {
  x: number;
  y: number;
  tone?: keyof typeof tones;
  scale?: number;
}) {
  const [top, left, right] = tones[tone];
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      strokeLinejoin="round"
    >
      <path d="M-18 0 0 10v20l-18-10Z" fill={left} />
      <path d="m0 10 18-10v20L0 30Z" fill={right} />
      <path d="m0-10 18 10L0 10-18 0Z" fill={top} />
      <path d="M-6-4v4a6 3 0 0 0 12 0v-4Z" fill={right} />
      <ellipse cy="-4" rx="6" ry="3" fill={top} stroke="#ffffff70" />
      <path d="m-18 0 18 10L18 0M0 10v20" stroke="#ffffff30" />
    </g>
  );
}

/** Decorative, static SVGs: no preview renderer or image request is needed. */
export default function HomeStepArt({
  step,
}: {
  step: "build" | "play" | "share";
}) {
  return (
    <svg
      className={cn(
        "home-step-art block w-[148px] max-w-[calc(100%_-_38px)] h-[112px] shrink-[0] [@media(width<=520px)]:w-[132px] [@media(width<=520px)]:h-[100px]",
      )}
      viewBox="0 0 160 120"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse
        cx="82"
        cy="70"
        rx="66"
        ry="43"
        fill={
          step === "play" ? "#f0eafb" : step === "share" ? "#fff0e2" : "#eaf1fe"
        }
      />
      {step === "build" ? (
        <>
          <ellipse
            cx="78"
            cy="103"
            rx="43"
            ry="8"
            fill="#cfdef4"
            opacity=".55"
          />
          <MiniBrick x={65} y={74} />
          <g stroke="#8ca9db" strokeDasharray="3 4" strokeLinejoin="round">
            <path d="m65 44 18 10v20L65 84 47 74V54Zm-18 10 18 10 18-10M65 64v20" />
            <path d="M47 40v9m36-9v9" />
          </g>
          <MiniBrick x={65} y={15} />
          <MiniBrick x={111} y={79} tone="peach" scale={0.7} />
          <path d="m106 35 3 6 6 3-6 3-3 6-3-6-6-3 6-3Z" fill="#acc6f1" />
        </>
      ) : step === "play" ? (
        <>
          <path
            d="M40 43c0-22 59-26 77-5m-1-10 2 12-12-2"
            stroke="#b6a1d1"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <ellipse
            cx="80"
            cy="89"
            rx="45"
            ry="7"
            fill="#dbd1ed"
            opacity=".55"
          />
          <MiniBrick x={54} y={53} scale={0.9} />
          <MiniBrick x={100} y={45} tone="violet" />
          <g>
            {["#7ba5ff", "#f3b18e", "#b38bde", "#81b79b"].map(
              (color, index) => (
                <circle
                  key={color}
                  cx={53 + index * 18}
                  cy="106"
                  r="5"
                  fill={color}
                />
              ),
            )}
            <circle cx="89" cy="106" r="8" stroke="#b38bde" />
          </g>
        </>
      ) : (
        <>
          <g transform="rotate(-7 78 65)">
            <rect
              x="36"
              y="21"
              width="86"
              height="87"
              rx="9"
              fill="#ebdcca"
              opacity=".5"
              transform="translate(0 4)"
            />
            <rect
              x="36"
              y="21"
              width="86"
              height="87"
              rx="9"
              fill="white"
              stroke="#e3d9ca"
            />
            <rect x="43" y="28" width="72" height="52" rx="5" fill="#f1f5fc" />
            <MiniBrick x={70} y={44} scale={0.85} />
            <MiniBrick x={94} y={55} tone="peach" scale={0.55} />
            <path
              d="M48 89h36m-36 8h23"
              stroke="#c6d3e6"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
          <circle
            cx="126"
            cy="91"
            r="13"
            fill="#e7f3ec"
            stroke="#fff"
            strokeWidth="3"
          />
          <path
            d="m120 91 4 4 8-8"
            stroke="#65a181"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M116 36l17-17m-11 0h11v11"
            stroke="#d9a36b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}
