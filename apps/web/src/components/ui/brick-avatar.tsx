import { cn } from "@/lib/utils";
import { memo, useMemo } from "react";
import AvatarFrame from "./avatar-frame";
import {
  CROWNS,
  RINGS,
  AVATAR_PART_HEIGHT,
  AVATAR_ARCH_PROFILE,
  assembleAvatar,
  avatarExposedStuds,
  type AvatarDescriptor,
  type AvatarPart,
} from "@clik/avatars";

const STUD = 10.8;
const PLATE = 4.32;
const DEPTH_X = 3;
const DEPTH_Y = 3.2;
const ORIGIN_X = (100 - 6 * STUD - DEPTH_X) / 2;

function AvatarPiece({
  part,
  studs,
  base,
}: {
  part: AvatarPart;
  studs: number[];
  base: number;
}) {
  const x = ORIGIN_X + part.x * STUD;
  const width = part.width * STUD;
  const bottom = base - part.y * PLATE;
  const height = AVATAR_PART_HEIGHT[part.kind] * PLATE;
  const left =
    bottom - (part.kind === "slope" && part.rise === 1 ? PLATE : height);
  const right =
    bottom - (part.kind === "slope" && part.rise === -1 ? PLATE : height);
  const topFace = `M${x} ${left}L${x + width} ${right}l${DEPTH_X} ${-DEPTH_Y}L${x + DEPTH_X} ${left - DEPTH_Y}Z`;
  const sideFace = `M${x + width} ${right}l${DEPTH_X} ${-DEPTH_Y}V${bottom - DEPTH_Y}l${-DEPTH_X} ${DEPTH_Y}Z`;
  const opening =
    part.kind === "arch"
      ? {
          left: x + AVATAR_ARCH_PROFILE.legWidth * STUD,
          right: x + width - AVATAR_ARCH_PROFILE.legWidth * STUD,
          spring: bottom - AVATAR_ARCH_PROFILE.springHeight * PLATE,
          rx: (width - 2 * AVATAR_ARCH_PROFILE.legWidth * STUD) / 2,
          ry: AVATAR_ARCH_PROFILE.rise * PLATE,
        }
      : null;
  const archCurve = (fromLeft: boolean, dx = 0, dy = 0) => {
    if (!opening) return "";
    const start = (fromLeft ? opening.left : opening.right) + dx;
    const end = (fromLeft ? opening.right : opening.left) + dx;
    const spring = opening.spring + dy;
    if (part.kind === "arch" && part.opening === "pointed") {
      const middle = (start + end) / 2;
      return `Q${start} ${spring - opening.ry / 2} ${middle} ${spring - opening.ry}Q${end} ${spring - opening.ry / 2} ${end} ${spring}`;
    }
    return `A${opening.rx} ${opening.ry} 0 0 ${fromLeft ? 1 : 0} ${end} ${spring}`;
  };
  const frontFace = opening
    ? `M${x} ${left}H${x + width}V${bottom}H${opening.right}V${opening.spring}${archCurve(false)}V${bottom}H${x}Z`
    : `M${x} ${left}L${x + width} ${right}V${bottom}H${x}Z`;
  const innerFace = opening
    ? `M${opening.left} ${bottom}V${opening.spring}${archCurve(true)}l${DEPTH_X} ${-DEPTH_Y}${archCurve(false, DEPTH_X, -DEPTH_Y)}V${bottom - DEPTH_Y}Z`
    : undefined;
  const bottomEdge = opening
    ? `M${x + 0.4} ${bottom - 0.4}H${opening.left - 0.4}M${opening.right + 0.4} ${bottom - 0.4}H${x + width - 0.4}`
    : `M${x + 0.4} ${bottom - 0.4}H${x + width - 0.4}`;
  return (
    <g fill={part.color}>
      <path d={sideFace} />
      <path d={sideFace} fill="#142747" opacity=".2" />
      {innerFace && (
        <>
          <path d={innerFace} />
          <path d={innerFace} fill="#142747" opacity=".24" />
        </>
      )}
      <path d={frontFace} />
      <path d={topFace} />
      <path d={topFace} fill="#fff" opacity=".28" />
      <path
        d={`M${x + width - 0.3} ${right + 0.5}V${bottom - 0.5}`}
        fill="none"
        stroke="#142747"
        strokeOpacity=".16"
        strokeWidth=".55"
      />
      <path
        d={bottomEdge}
        fill="none"
        stroke="#142747"
        strokeOpacity=".18"
        strokeWidth=".65"
      />
      <path
        d={`M${x + 0.4} ${left + 0.3}L${x + width - 0.4} ${right + 0.3}`}
        fill="none"
        stroke="#fff"
        strokeOpacity=".42"
        strokeWidth=".55"
      />
      {studs.map((index) => (
        <g
          key={index}
          transform={`translate(${x + (index + 0.5) * STUD + DEPTH_X / 2} ${left - DEPTH_Y / 2 - 1.8})`}
        >
          <path d="M-2.6 0v1.8a2.6 1.1 0 0 0 5.2 0V0Z" />
          <path
            d="M-2.6 0v1.8a2.6 1.1 0 0 0 5.2 0V0Z"
            fill="#142747"
            opacity=".14"
          />
          <ellipse rx="2.6" ry="1.1" />
          <ellipse rx="2.6" ry="1.1" fill="#fff" opacity=".4" />
        </g>
      ))}
    </g>
  );
}

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
