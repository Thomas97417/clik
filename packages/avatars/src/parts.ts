export const AVATAR_PART_HEIGHT = {
  brick: 3,
  plate: 1,
  tile: 1,
  slope: 3,
  arch: 6,
  masonry: 3,
  grille: 1,
  "inverted-slope": 3,
  "curved-slope": 2,
  cone: 3,
  dome: 3,
  "quarter-plate": 1,
  "quarter-tile": 1,
} as const;
export const AVATAR_ARCH_PROFILE = {
  legWidth: 1,
  springHeight: 2,
  rise: 3,
} as const;

/** Compact front profiles; dimensions are expressed in studs and plate units. */
export type AvatarPart = {
  x: number;
  y: number;
  width: 1 | 2 | 3 | 4 | 6;
  color: string;
} & (
  | { kind: "brick" | "plate" | "tile" | "masonry" | "grille" }
  | { kind: "slope" | "inverted-slope" | "curved-slope"; rise: -1 | 1 }
  | { kind: "arch"; width: 4 | 6; opening?: "round" | "pointed" }
  | { kind: "cone"; width: 1 | 2 }
  | { kind: "dome"; width: 2 | 4 }
  | { kind: "quarter-plate" | "quarter-tile"; width: 2 | 4; side: -1 | 1 }
);

/** Front silhouette area determines the accent budget, rather than empty space. */
export function avatarPartArea(part: AvatarPart) {
  const height = AVATAR_PART_HEIGHT[part.kind];
  if (part.kind === "arch") {
    const { legWidth, springHeight, rise } = AVATAR_ARCH_PROFILE;
    const curveArea = part.opening === "pointed" ? 2 / 3 : Math.PI / 4;
    return (
      part.width * height -
      (part.width - 2 * legWidth) * (springHeight + curveArea * rise)
    );
  }
  if (part.kind === "slope") return (part.width * (height + 1)) / 2;
  if (part.kind === "inverted-slope")
    return part.width * height - ((part.width - 1) * (height - 1)) / 2;
  if (part.kind === "curved-slope")
    return part.width * (1 + ((height - 1) * Math.PI) / 4);
  if (part.kind === "cone") return (part.width * height) / 2;
  if (part.kind === "dome") return (part.width * height * Math.PI) / 4;
  return part.width * height;
}

/** Raised undersides and arch openings never hide a stud underneath empty air. */
export function avatarBottomSockets(part: AvatarPart) {
  if (part.kind === "arch") return [0, part.width - 1];
  if (part.kind === "inverted-slope")
    return [part.rise === 1 ? part.width - 1 : 0];
  return Array.from({ length: part.width }, (_, index) => index);
}

export function avatarTopStuds(part: AvatarPart) {
  if (
    [
      "tile",
      "slope",
      "curved-slope",
      "cone",
      "dome",
      "grille",
      "quarter-tile",
    ].includes(part.kind)
  )
    return [];
  return Array.from({ length: part.width }, (_, index) => index);
}

export function avatarExposedStuds(
  part: AvatarPart,
  parts: readonly AvatarPart[],
) {
  const top = part.y + AVATAR_PART_HEIGHT[part.kind];
  return avatarTopStuds(part).filter((index) => {
    const x = part.x + index + 0.5;
    return !parts.some(
      (other) =>
        other.y === top &&
        avatarBottomSockets(other).some(
          (socket) => other.x + socket + 0.5 === x,
        ),
    );
  });
}

export function mirrorAvatarPart(part: AvatarPart): AvatarPart {
  return {
    ...part,
    x: 6 - part.x - part.width,
    ...("rise" in part
      ? { rise: part.rise === 1 ? (-1 as const) : (1 as const) }
      : {}),
    ...("side" in part
      ? { side: part.side === 1 ? (-1 as const) : (1 as const) }
      : {}),
  };
}
