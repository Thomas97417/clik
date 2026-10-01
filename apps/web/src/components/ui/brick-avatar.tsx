import { memo, useMemo } from "react";
import { generateAvatar, type AvatarDescriptor } from "@clik/avatars";

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
    >
      <rect width="100" height="100" rx="16" fill={model.background} />
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
    </svg>
  );
});
export default BrickAvatar;
