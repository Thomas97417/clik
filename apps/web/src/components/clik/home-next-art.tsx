function ModelCard({
  variant = false,
  dark = false,
}: {
  variant?: boolean;
  dark?: boolean;
}) {
  const top = variant ? "#ffd4b4" : "#9dbfff";
  const left = variant ? "#efa77e" : "#6b97ec";
  const right = variant ? "#d58560" : "#4971c3";
  return (
    <>
      <rect
        width="112"
        height="102"
        rx="12"
        fill={dark ? "#ffffff0e" : "#f9fbff"}
        stroke={dark ? "#8eaadb66" : "#d8e3f5"}
      />
      <rect
        x="8"
        y="8"
        width="96"
        height="68"
        rx="7"
        fill={dark ? "#ffffff08" : "#edf3fd"}
      />
      <ellipse
        cx="57"
        cy="64"
        rx="31"
        ry="6"
        fill={dark ? "#102855" : "#dce6f7"}
        opacity=".6"
      />
      <g strokeLinejoin="round">
        <path d="m34 32 22 12v24L34 56Z" fill={left} />
        <path d="m56 44 22-12v24L56 68Z" fill={right} />
        <path d="m56 20 22 12-22 12-22-12Z" fill={top} />
        <path d="M49 29v4a7 4 0 0 0 14 0v-4Z" fill={right} />
        <ellipse cx="56" cy="29" rx="7" ry="4" fill={top} stroke="#ffffff55" />
        {variant && (
          <g transform="translate(26 18) scale(.65)">
            <path d="m34 32 22 12v24L34 56Z" fill="#8f80cd" />
            <path d="m56 44 22-12v24L56 68Z" fill="#7262b0" />
            <path d="m56 20 22 12-22 12-22-12Z" fill="#c3b7ed" />
            <ellipse cx="56" cy="29" rx="7" ry="4" fill="#d3c9f5" />
          </g>
        )}
      </g>
      <path
        d="M13 87h44m-44 6h27"
        stroke={dark ? "#88a5d4" : "#b4c7e6"}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </>
  );
}

export default function HomeNextArt({ kind }: { kind: "fork" | "collection" }) {
  if (kind === "collection")
    return (
      <svg
        className="home-collection-art"
        viewBox="0 0 170 125"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <rect
          x="58"
          y="8"
          width="90"
          height="102"
          rx="11"
          transform="rotate(12 103 59)"
          fill="#dce6f7"
          stroke="#cbd9ee"
        />
        <rect
          x="24"
          y="9"
          width="94"
          height="102"
          rx="11"
          transform="rotate(-12 71 60)"
          fill="#eaf0fa"
          stroke="#d1def1"
        />
        <g transform="translate(33 17) scale(.92)">
          <ModelCard variant />
        </g>
        <circle cx="146" cy="104" r="14" fill="#fff" stroke="#d7e3f6" />
        <path
          d="M140 104h12m-6-6v12"
          stroke="#6789c5"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  return (
    <svg
      className="home-gallery-art"
      viewBox="0 0 270 282"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="144" cy="152" rx="108" ry="106" stroke="#7b9ac426" />
      <path
        d="M68 108v145"
        stroke="#7f9fc2"
        strokeWidth="2"
        strokeDasharray="3 7"
        strokeLinecap="round"
        opacity=".6"
      />
      <path
        d="M68 123v9c0 36 126 3 126 41v7"
        stroke="#f6c497"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle
        cx="68"
        cy="122"
        r="5"
        fill="#243d77"
        stroke="#a8bee0"
        strokeWidth="2"
      />
      <circle
        cx="68"
        cy="253"
        r="4"
        fill="#243d77"
        stroke="#7f9fc2"
        strokeWidth="1.5"
      />
      <circle
        cx="194"
        cy="174"
        r="5"
        fill="#f6c497"
        stroke="#243d77"
        strokeWidth="3"
      />
      <g transform="translate(12 6)">
        <ModelCard dark />
      </g>
      <g transform="translate(138 180)">
        <ModelCard variant />
      </g>
      <text x="135" y="51" fill="#bfd0eb" fontSize="10">
        Une création
      </text>
      <text x="135" y="65" fill="#bfd0eb" fontSize="10">
        vous inspire.
      </text>
      <text x="9" y="208" fill="#f6c497" fontSize="10">
        Votre version
      </text>
      <text x="9" y="222" fill="#bfd0eb" fontSize="10">
        prend une autre voie.
      </text>
    </svg>
  );
}
