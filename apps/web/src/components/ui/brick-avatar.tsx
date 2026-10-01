import { memo, useMemo } from "react";
import {
  CROWNS,
  RINGS,
  generateAvatar,
  type AvatarDescriptor,
} from "@clik/avatars";

/** Decorative beside a name; give label when this is the only identity shown. */
const BrickAvatar = memo(function BrickAvatar({
  avatar,
  size = 32,
  label,
}: {
  avatar: AvatarDescriptor;
  size?: number;
  label?: string;
}) {
  const model = useMemo(
    () => generateAvatar(avatar),
    [avatar.seed, avatar.version],
  );
  const crown = CROWNS.find((c) => c.id === avatar.crown);
  const ring = RINGS.find((r) => r.id === avatar.ring);
  return (
    <svg
      className="brick-avatar"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      data-avatar-seed={avatar.seed}
      data-avatar-version={avatar.version}
      data-avatar-crown={avatar.crown ?? "none"}
      data-avatar-ring={avatar.ring ?? "none"}
    >
      <rect width="100" height="100" rx="16" fill={model.background} />
      <g transform={crown ? "translate(10 21) scale(.8)" : undefined}>
        {model.bricks.map(({ x, y, width, color }) => (
          <g
            key={`${x}-${y}`}
            transform={`translate(${15 + x * 14} ${14 + y * 14})`}
          >
            <rect
              y="3"
              width={width * 14 - 1}
              height="11"
              rx="1.3"
              fill={color}
            />
            <path
              d={`M1 12h${width * 14 - 3}v1H1Z`}
              fill="#142747"
              opacity=".16"
            />
            <path
              d={`M1 3h${width * 14 - 3}`}
              stroke="#fff"
              strokeOpacity=".55"
            />
            {Array.from({ length: width }, (_, i) => (
              <g key={i} transform={`translate(${6.5 + i * 14} 0)`}>
                <path d="M-3 1.8v1.6a3 1.4 0 0 0 6 0V1.8Z" fill={color} />
                <path
                  d="M-3 1.8v1.6a3 1.4 0 0 0 6 0V1.8Z"
                  fill="#142747"
                  opacity=".12"
                />
                <ellipse cy="1.8" rx="3" ry="1.4" fill={color} />
                <ellipse cy="1.8" rx="3" ry="1.4" fill="#fff" opacity=".3" />
              </g>
            ))}
          </g>
        ))}
      </g>
      {ring && (
        <g fill="none" stroke={ring.color}>
          <rect x="3" y="3" width="94" height="94" rx="14" strokeWidth="4" />
          {ring.threshold >= 5 && (
            <path
              d="M17 9h12M71 9h12M17 91h12M71 91h12"
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}
          {ring.threshold >= 10 && (
            <path
              d="M9 22v10M91 22v10M9 68v10M91 68v10"
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}
          {ring.threshold >= 25 && (
            <path
              d="m3 50 5-5 5 5-5 5Zm84 0 5-5 5 5-5 5Z"
              fill={ring.color}
              strokeWidth="1"
            />
          )}
          {ring.threshold >= 50 && (
            <path d="m45 92 5-5 5 5-5 5Z" fill={ring.color} strokeWidth="1" />
          )}
        </g>
      )}
      {crown && (
        <g data-avatar-decoration="crown">
          <path
            d="m30 13 10 7L50 8l10 12 10-7-4 22H34Z"
            fill={crown.color}
            stroke={crown.shade}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M34 29h32v6H34Z" fill={crown.shade} />
          <path
            d="m33 15 7 5L50 8l10 12 7-5"
            fill="none"
            stroke="#fff"
            strokeOpacity=".6"
            strokeWidth="2"
          />
          <rect
            x="47"
            y="22"
            width="6"
            height="6"
            rx="1"
            fill="#fff"
            opacity=".8"
          />
        </g>
      )}
    </svg>
  );
});
export default BrickAvatar;
