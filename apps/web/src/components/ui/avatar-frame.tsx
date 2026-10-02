import type { RINGS } from "@clik/avatars";

type Frame = (typeof RINGS)[number];

/** Inlaid brick corners and open edges distinguish a reward from a focus outline. */
export default function AvatarFrame({ frame }: { frame: Frame }) {
  const tier = [1, 5, 10, 25, 50].indexOf(frame.threshold);
  const reach = tier === 0 ? 26 : tier < 3 ? 31 : 34;
  const accent = tier === 4 ? "#deb767" : frame.color;
  return (
    <g data-avatar-decoration="frame" fill={frame.color}>
      {[0, 90, 180, 270].map((angle) => (
        <g key={angle} transform={`rotate(${angle} 50 50)`}>
          {/* A stepped corner, its inset tile and the raised stud. */}
          <path d={`M3 ${reach}V12L12 3H${reach}V10H16L10 16V${reach}Z`} />
          <path
            d={`M3 ${reach}h7v-3H6V13L13 6h${reach - 13}V3H12L3 12Z`}
            fill="#fff"
            opacity=".28"
          />
          <path
            d={`M7 ${reach}h3V16l6-6h${reach - 16}V7H15l-8 8Z`}
            fill="#142747"
            opacity=".25"
          />
          <path d="M7 10 10 7h7v7l-3 3H7Z" fill={accent} />
          <path d="M7 14h7l3-3v3l-3 3H7Z" fill="#142747" opacity=".22" />
          <ellipse
            cx="12"
            cy="11.5"
            rx="3.1"
            ry="2.5"
            fill="#fff"
            opacity=".45"
          />
          <path d="M9 12v1a3 2 0 0 0 6 0v-1" fill="#142747" opacity=".18" />
          {tier >= 1 && (
            <>
              <path d={`M${reach + 2} 3h6v7h-6Z`} opacity=".65" />
              <path d={`M${reach + 2} 3h6v2h-6Z`} fill="#fff" opacity=".4" />
            </>
          )}
          {tier >= 3 && <path d="M2 19 6 15v8l-4 4Z" fill={accent} />}
        </g>
      ))}
      {/* Faceted side pieces; the middle of each edge stays visually open. */}
      {tier >= 2 &&
        [false, true].map((right) => (
          <g
            key={String(right)}
            transform={right ? "translate(100 0) scale(-1 1)" : undefined}
          >
            <path d="m2 50 5-8 5 8-5 8Z" fill={accent} />
            <path d="m2 50 5-8v8Z" fill="#fff" opacity=".38" />
            <path d="m2 50 5 8 5-8Z" fill="#142747" opacity=".22" />
            {tier >= 3 && (
              <>
                <path d="m2 33 7 5v9l-7-6Zm0 26 7-6v9l-7 5Z" />
                <path
                  d="m2 33 7 5v3l-7-5Zm0 26 7-6v3l-7 6Z"
                  fill="#fff"
                  opacity=".35"
                />
              </>
            )}
            {tier === 4 && (
              <>
                <path d="m2 24 6 4v7l-6-4Zm0 45 6-4v7l-6 4Z" fill={accent} />
                <path d="M3 46h2v8H3Z" fill="#fff" opacity=".5" />
              </>
            )}
          </g>
        ))}
      {tier >= 1 && (
        <g>
          {tier >= 3 && (
            <>
              <path d="m31 89 13 2v6l-10-2Zm38 0-13 2v6l10-2Z" />
              <path
                d="m33 90 11 2m23-2-11 2"
                fill="none"
                stroke="#fff"
                strokeOpacity=".4"
                strokeWidth="1.5"
              />
            </>
          )}
          <path
            d={tier >= 2 ? "m50 84 9 7v5l-9 3-9-3v-5Z" : "M43 89h14v8H43Z"}
            fill={accent}
          />
          <path
            d={tier >= 2 ? "m50 84 9 7-9 3-9-3Z" : "M43 89h14v3H43Z"}
            fill="#fff"
            opacity=".35"
          />
          <path
            d={tier >= 2 ? "M50 94v5l9-3v-5Z" : "M43 95h14v2H43Z"}
            fill="#142747"
            opacity=".28"
          />
          {tier === 4 && (
            <path d="m50 87 4 4-4 2-4-2Z" fill="#fff" opacity=".6" />
          )}
        </g>
      )}
    </g>
  );
}
