type Tone = "blue" | "peach" | "cream";

const tones = {
  blue: ["#9ebfff", "#6b97ec", "#4971c3"],
  peach: ["#ffdac0", "#efb08a", "#d58f6e"],
  cream: ["#f4f0e7", "#ddd8ce", "#c9c1b6"],
} as const;

function Brick({
  x,
  y,
  tone = "blue",
  scale = 1,
}: {
  x: number;
  y: number;
  tone?: Tone;
  scale?: number;
}) {
  const [top, left, right] = tones[tone];
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      strokeLinejoin="round"
    >
      <path d="m-34 0 34 19v32l-34-19Z" fill={left} />
      <path d="m0 19 34-19v32L0 51Z" fill={right} />
      <path d="m0-19 34 19L0 19-34 0Z" fill={top} />
      <path d="M-12-7v6a12 7 0 0 0 24 0v-6Z" fill={right} />
      <ellipse cy="-7" rx="12" ry="7" fill={top} stroke="#ffffff80" />
      <path d="m-34 0 34 19L34 0M0 19v32" stroke="#ffffff45" fill="none" />
    </g>
  );
}

export default function LegalArt({ kind }: { kind: "privacy" | "terms" }) {
  return (
    <svg
      className="legal-art"
      viewBox="0 0 420 310"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="218" cy="166" rx="143" ry="123" fill="#eaf1fe" />
      <ellipse
        cx="217"
        cy="259"
        rx="132"
        ry="22"
        fill="#b4c6e1"
        opacity=".16"
      />
      <g stroke="#b6c9e5" strokeWidth="1" strokeLinecap="round" opacity=".6">
        <path d="m77 229 135 76 134-76M111 210l135 76M146 191l135 76M111 248l135-76M146 267l135-76" />
        <path d="M70 91v10m-5-5h10M349 75v10m-5-5h10M362 212v10m-5-5h10" />
        <circle cx="105" cy="49" r="3" />
        <circle cx="345" cy="157" r="3" />
      </g>
      <Brick x={115} y={218} tone="peach" scale={0.82} />
      <Brick x={318} y={222} scale={0.78} />
      <Brick x={181} y={227} tone="cream" />
      <Brick x={249} y={227} />
      <Brick x={215} y={208} tone="peach" />
      {kind === "privacy" ? (
        <>
          <path
            d="m211 62 74 25v72c0 47-34 75-74 94-40-19-74-47-74-94V87Z"
            fill="#b8cdf4"
            stroke="#98b7eb"
          />
          <path
            d="m215 58 74 25v72c0 47-34 75-74 94-40-19-74-47-74-94V83Z"
            fill="#f9fbff"
            stroke="#abc3ee"
            strokeWidth="1.5"
          />
          <path
            d="m215 73 61 21v61c0 36-25 61-61 80-36-19-61-44-61-80V94Z"
            fill="#edf3ff"
            stroke="#d8e4f9"
          />
          <path
            d="M193 139v-15a22 22 0 0 1 44 0v15"
            stroke="#7199e4"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <rect x="181" y="137" width="68" height="51" rx="13" fill="#356ae6" />
          <circle cx="215" cy="158" r="5" fill="#fff" />
          <path
            d="M215 160v9"
            stroke="#fff"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="285" cy="79" r="22" fill="#fff" stroke="#d6e3f7" />
          <path
            d="m276 80 6 6 13-14"
            stroke="#5d8a73"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <rect
            x="147"
            y="61"
            width="134"
            height="178"
            rx="15"
            transform="rotate(-9 214 150)"
            fill="#dce7fa"
            stroke="#abc3ee"
          />
          <rect
            x="161"
            y="58"
            width="134"
            height="178"
            rx="15"
            transform="rotate(7 228 147)"
            fill="#f9fbff"
            stroke="#d6e3f7"
            strokeWidth="1.5"
          />
          <g transform="rotate(7 228 147)">
            <rect
              x="178"
              y="76"
              width="34"
              height="34"
              rx="10"
              fill="#edf3fe"
            />
            <path d="m185 94 7 4 12-7v-7l-7-4-12 7Z" fill="#9dbfff" />
            <path d="m192 98 12-7v-7l-12 7Z" fill="#4971c3" />
            <path
              d="M224 85h48m-48 11h32M181 126h91m-91 11h69M196 159h76m-76 11h57M196 193h76m-76 11h48"
              stroke="#c4cbd5"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="m177 161 4 4 7-8m-11 38 4 4 7-8"
              stroke="#5d8a73"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
          <g transform="translate(289 173) rotate(28)">
            <path d="M-9-76H9v89L0 32l-9-19Z" fill="#9dbfff" stroke="#6f95d5" />
            <path d="M0-76h9v89L0 32Z" fill="#6b97ec" />
            <path d="m-9 13 9 19 9-19" fill="#eacbb0" />
            <path d="m-4 24 4 8 4-8" fill="#3a4a65" />
            <path d="M-9-67H9" stroke="#edf3ff" strokeWidth="5" />
          </g>
          <circle cx="149" cy="69" r="21" fill="#fff" stroke="#d6e3f7" />
          <path
            d="m140 70 6 6 12-14"
            stroke="#5d8a73"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      <Brick x={86} y={139} tone="cream" scale={0.48} />
      <Brick x={331} y={115} tone="peach" scale={0.48} />
    </svg>
  );
}
