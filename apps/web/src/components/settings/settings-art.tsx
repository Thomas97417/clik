/** A little workbench: each brick is another part of your identity. */
export default function SettingsArt() {
  return (
    <svg
      viewBox="0 0 320 210"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="settings-art"
    >
      <ellipse
        cx="166"
        cy="174"
        rx="123"
        ry="20"
        fill="#dbe5f7"
        opacity=".55"
      />
      <path d="m32 151 128-62 128 62-128 61Z" fill="#ecf1fa" />
      <path d="m160 212 128-61v-7l-128 61Z" fill="#cedbef" />
      <g transform="translate(94 18) rotate(-8 65 65)">
        <rect x="6" y="7" width="132" height="143" rx="18" fill="#c8d8f3" />
        <rect width="132" height="143" rx="18" fill="#fff" stroke="#d3dff2" />
        <rect x="16" y="16" width="100" height="85" rx="12" fill="#eef3fc" />
        {[
          { x: 39, y: 36, w: 22, c: "#a998dd" },
          { x: 64, y: 36, w: 28, c: "#8cb0f3" },
          { x: 29, y: 51, w: 36, c: "#739ae6" },
          { x: 68, y: 51, w: 33, c: "#b6a5e3" },
          { x: 39, y: 66, w: 24, c: "#f0b58e" },
          { x: 66, y: 66, w: 26, c: "#8cb0f3" },
          { x: 52, y: 81, w: 27, c: "#81b79b" },
        ].map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={b.y} width={b.w} height="12" rx="2" fill={b.c} />
            <path
              d={`M${b.x + 2} ${b.y + 10}h${b.w - 4}`}
              stroke="#26344c"
              strokeOpacity=".13"
            />
            <ellipse cx={b.x + 7} cy={b.y} rx="4" ry="2" fill={b.c} />
            <ellipse
              cx={b.x + 7}
              cy={b.y - 0.5}
              rx="3"
              ry="1"
              fill="#fff"
              fillOpacity=".4"
            />
          </g>
        ))}
        <path
          d="M30 116h72m-56 10h40"
          stroke="#cad8ee"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>
      <g transform="translate(27 112)">
        <path d="m0 12 27 14 27-14-27-14Z" fill="#b5a3e2" />
        <path d="M0 12v22l27 14V26Z" fill="#9781c7" />
        <path d="m27 26 27-14v22L27 48Z" fill="#7864af" />
        <path d="M18 6v5a9 4 0 0 0 18 0V6" fill="#9781c7" />
        <ellipse cx="27" cy="6" rx="9" ry="4" fill="#cfbfed" />
      </g>
      <g transform="translate(242 119)">
        <path d="m0 10 22 11L44 10 22-1Z" fill="#f8caa9" />
        <path d="M0 10v18l22 11V21Z" fill="#e6a176" />
        <path d="m22 21 22-11v18L22 39Z" fill="#c9825a" />
        <ellipse cx="22" cy="7" rx="7" ry="3.5" fill="#ffe0c7" />
      </g>
      <path
        d="M49 62v17m-8-9h17M260 47v13m-6-7h13"
        stroke="#a9bedf"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="m264 82 6-4 6 4-6 4Z" fill="#8cb8a1" />
      <circle cx="76" cy="28" r="3" fill="#eab99b" />
    </svg>
  );
}
