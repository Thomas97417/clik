import { cn } from "@/lib/utils";
function Four({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 102)`} strokeLinejoin="round">
      <path d="m24 0 12-7v57l-12 7Z" fill="#3866c7" />
      <path d="m24 57 12-7h33l-12 7Z" fill="#8cb2ff" />
      <path d="m81 0 12-7v139l-12 7Z" fill="#3866c7" />
      <path d="M0 0h24v57h33V0h24v139H57V81H0Z" fill="#5787eb" />
      <path d="m0 0 12-7h24L24 0Zm57 0 12-7h24L81 0Z" fill="#8cb2ff" />
      <path
        d="M0 28h24M0 55h24m33-27h24M57 55h24M28 57v24m27-24v24m2 4h24m-24 27h24"
        stroke="#ffffff40"
        strokeWidth="1.3"
      />
      {[18, 75].map((cx) => (
        <g key={cx} transform={`translate(${cx} -4)`}>
          <path d="M-7-5v5a7 3 0 0 0 14 0v-5Z" fill="#4974cf" />
          <ellipse cy="-5" rx="7" ry="3" fill="#a7c6ff" stroke="#ffffff70" />
        </g>
      ))}
      <path d="M0 0h24v57h33V0h24v139" stroke="#ffffff30" />
    </g>
  );
}

function LostBrick({
  x,
  y,
  scale = 1,
}: {
  x: number;
  y: number;
  scale?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-10) scale(${scale})`}>
      <path d="M-18 0 0 10v20l-18-10Z" fill="#f3b18e" />
      <path d="m0 10 18-10v20L0 30Z" fill="#d88c6d" />
      <path d="m0-10 18 10L0 10-18 0Z" fill="#ffd5bb" />
      <path d="M-6-4v4a6 3 0 0 0 12 0v-4Z" fill="#d88c6d" />
      <ellipse cy="-4" rx="6" ry="3" fill="#ffd5bb" stroke="#ffffff70" />
      <path d="m-18 0 18 10L18 0M0 10v20" stroke="#ffffff40" />
    </g>
  );
}

/** A small unfinished construction, in the same palette as Clik's workshop. */
export default function NotFoundArt() {
  return (
    <svg
      className={cn(
        "not-found-art block w-[100%] h-[auto] [@media(width<=760px)]:row-[1] [@media(width<=760px)]:max-w-[340px] [@media(width<=760px)]:[justify-self:center]",
      )}
      viewBox="0 0 500 320"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="249" cy="176" rx="183" ry="116" fill="#edf3fe" />
      <path
        d="M90 267h320M132 281h205"
        stroke="#dbe6f7"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <ellipse cx="250" cy="248" rx="162" ry="14" fill="#cfdef4" opacity=".6" />
      <ellipse cx="147" cy="245" rx="47" ry="7" fill="#b7ceef" opacity=".65" />
      <ellipse cx="378" cy="245" rx="47" ry="7" fill="#b7ceef" opacity=".65" />

      <g stroke="#c1d3ef" strokeWidth="1.5" strokeDasharray="4 6">
        <rect x="222" y="95" width="88" height="139" rx="15" />
        <path d="m216 105 12-7m58 7 12-7m-9 137 12-7m-83 7 12-7" />
      </g>
      <rect
        x="210"
        y="102"
        width="88"
        height="139"
        rx="15"
        fill="#f8fbff"
        stroke="#98b5e2"
        strokeWidth="2"
        strokeDasharray="5 6"
      />
      <rect
        x="235"
        y="128"
        width="38"
        height="87"
        rx="7"
        stroke="#abc3e8"
        strokeWidth="1.5"
        strokeDasharray="4 5"
      />

      <Four x={92} />
      <Four x={326} />
      <LostBrick x={264} y={49} scale={1.15} />
      <ellipse cx="203" cy="284" rx="20" ry="4" fill="#d9e3f2" />
      <LostBrick x={201} y={261} scale={0.65} />

      <path
        d="M68 128h12m-6-6v12"
        stroke="#b7ccef"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="m434 145 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#f1d2b8" />
      <circle cx="432" cy="218" r="3" fill="#c3d5f0" />
      <circle cx="84" cy="217" r="2.5" fill="#c3d5f0" />
      <circle cx="361" cy="60" r="3" fill="#d2e0f5" />
    </svg>
  );
}
