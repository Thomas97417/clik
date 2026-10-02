/** A little exhibition of bricks. Static SVG, without a 3D renderer. */
export default function GalleryArt() {
  const palettes = [
    ["#96b9ff", "#5485e9", "#3563ba"],
    ["#fed9bc", "#efa97c", "#c98159"],
    ["#b9d8c8", "#7bad97", "#4f826f"],
  ];
  return (
    <svg
      className="gallery-art"
      viewBox="0 0 420 240"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m26 165 185-94 188 94-185 70Z" fill="#e8edf7" />
      <path
        d="m38 165 173-82 173 82M211 83v135"
        stroke="#d6e0f0"
        strokeDasharray="3 6"
      />
      {[
        { x: 97, y: 137, levels: 2 },
        { x: 210, y: 161, levels: 3 },
        { x: 319, y: 124, levels: 2 },
      ].map(({ x, y, levels }, index) => {
        const [top, left, right] = palettes[index];
        return (
          <g key={x} transform={`translate(${x} ${y})`} strokeLinejoin="round">
            <path d="m-54 13 54-26 54 26v12L0 51-54 25Z" fill="#dae2ef" />
            <path d="m-54 13 54-26 54 26L0 39Z" fill="#fff" />
            {Array.from({ length: levels }, (_, level) => (
              <g key={level} transform={`translate(0 ${-level * 28})`}>
                <path d="m-32-11 32 16v28l-32-16Z" fill={left} />
                <path d="M0 5 32-11v28L0 33Z" fill={right} />
                <path d="m-32-11 32-16 32 16L0 5Z" fill={top} />
                <path d="M-11-17v6a11 5.5 0 0 0 22 0v-6" fill={right} />
                <ellipse
                  cy="-17"
                  rx="11"
                  ry="5.5"
                  fill={top}
                  stroke="#ffffff80"
                />
                <path d="M-32-11 0 5 32-11M0 5v28" stroke="#ffffff40" />
              </g>
            ))}
            <path
              d="m-12 39 24-12"
              stroke="#a7b7d0"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        );
      })}
      <path d="m137 55 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#b5c9ec" />
      <circle cx="352" cy="51" r="4" fill="#e9c3a6" />
    </svg>
  );
}
