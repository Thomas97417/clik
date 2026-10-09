function Brick({
  x,
  y,
  scale = 1,
  rotation = 0,
  peach = false,
}: {
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
  peach?: boolean;
}) {
  const front = peach ? "#f3b18e" : "#5787eb";
  const side = peach ? "#d88c6d" : "#3866c7";
  const top = peach ? "#ffd5bb" : "#8cb2ff";

  return (
    <g transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scale})`}>
      <path d="M-56 0 0 30v36l-56-30Z" fill={front} />
      <path d="m0 30 56-30v36L0 66Z" fill={side} />
      <path d="m0-30 56 30L0 30-56 0Z" fill={top} />
      {[
        [0, -15],
        [-26, -1],
        [26, -1],
        [0, 13],
      ].map(([cx, cy], index) => (
        <g key={index} transform={`translate(${cx} ${cy})`}>
          <path d="M-9-5v5a9 4.5 0 0 0 18 0v-5Z" fill={front} />
          <ellipse cy="-5" rx="9" ry="4.5" fill={top} stroke="#ffffff70" />
        </g>
      ))}
      <path d="m-56 0 56 30L56 0M0 30v36" stroke="#ffffff40" />
    </g>
  );
}

/** A construction waiting for its next brick, in Clik's workshop palette. */
export default function ErrorArt() {
  return (
    <svg
      className="error-art block w-full h-auto max-md-compact:row-1 max-md-compact:max-w-85 max-md-compact:justify-self-center"
      viewBox="0 0 500 320"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="249" cy="176" rx="183" ry="116" fill="#edf3fe" />
      <path
        d="M90 291h320M132 305h205"
        stroke="#dbe6f7"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <ellipse cx="249" cy="282" rx="162" ry="14" fill="#cfdef4" opacity=".6" />
      <ellipse cx="250" cy="281" rx="70" ry="9" fill="#b7ceef" opacity=".65" />
      <ellipse cx="139" cy="280" rx="30" ry="5" fill="#b7ceef" opacity=".5" />
      <ellipse cx="368" cy="280" rx="36" ry="6" fill="#b7ceef" opacity=".5" />

      <g
        transform="translate(250 123)"
        stroke="#98b5e2"
        strokeWidth="1.8"
        strokeDasharray="5 6"
        strokeLinejoin="round"
      >
        <path d="m0-30 56 30L0 30-56 0Zm-56 30v36L0 66l56-30V0M0 30v36" />
        <ellipse cy="-19" rx="9" ry="4.5" />
        <ellipse cx="-26" cy="-5" rx="9" ry="4.5" />
        <ellipse cx="26" cy="-5" rx="9" ry="4.5" />
        <ellipse cy="9" rx="9" ry="4.5" />
      </g>

      <Brick x={250} y={216} />
      <Brick x={250} y={180} />
      <Brick x={282} y={64} rotation={-14} peach />
      <Brick x={137} y={248} scale={0.5} rotation={-10} peach />
      <Brick x={368} y={241} scale={0.6} rotation={8} />

      <path
        d="M358 77c26 12 31 39 10 57m-1-12 1 12 12-2"
        stroke="#abc3e8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M98 151h12m-6-6v12"
        stroke="#b7ccef"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="m420 169 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#f1d2b8" />
      <circle cx="393" cy="222" r="3" fill="#c3d5f0" />
      <circle cx="87" cy="231" r="2.5" fill="#c3d5f0" />
      <circle cx="175" cy="76" r="3" fill="#d2e0f5" />
    </svg>
  );
}
