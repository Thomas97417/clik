import { cn } from "@/lib/utils";
import { memo, useMemo } from "react";
import AvatarFrame from "./avatar-frame";
import AvatarPiece, { PLATE, DEPTH_Y } from "./avatar-piece";
import {
  CROWNS,
  RINGS,
  AVATAR_PART_HEIGHT,
  assembleAvatar,
  avatarExposedStuds,
  type AvatarDescriptor,
} from "@clik/avatars";

/** Decorative beside a name; give label when this is the only identity shown. */
const BrickAvatar = memo(function BrickAvatar({
  avatar,
  size = 32,
  label,
  className,
}: {
  avatar: AvatarDescriptor;
  size?: number;
  label?: string;
  className?: string;
}) {
  const model = useMemo(() => {
    const assembled = assembleAvatar(avatar);
    const height = Math.max(
      ...assembled.parts.map((part) => part.y + AVATAR_PART_HEIGHT[part.kind]),
    );
    return {
      ...assembled,
      base: 50 + (height * PLATE + DEPTH_Y + 2) / 2,
      pieces: assembled.parts.map((part) => ({
        part,
        studs: avatarExposedStuds(part, assembled.parts),
      })),
    };
  }, [avatar.seed, avatar.version]);
  const crown = CROWNS.find((c) => c.id === avatar.crown);
  const ring = RINGS.find((r) => r.id === avatar.ring);
  return (
    <svg
      className={cn(
        "brick-avatar group/brick-avatar block shrink-0",
        className,
      )}
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
        <ellipse
          cx="50"
          cy={model.base + 1.5}
          rx="32"
          ry="2.2"
          fill="#142747"
          opacity=".08"
        />
        {model.pieces.map(({ part, studs }) => (
          <AvatarPiece
            key={`${part.x}-${part.y}`}
            part={part}
            studs={studs}
            base={model.base}
          />
        ))}
      </g>
      {ring && <AvatarFrame frame={ring} />}
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
