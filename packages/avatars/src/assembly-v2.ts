import {
  AVATAR_PART_HEIGHT,
  avatarPartArea,
  mirrorAvatarPart,
  type AvatarPart,
} from "./parts";
import { randomFor } from "./random";

type Span = 2 | 4 | 6;
const partitions = {
  2: [[2], [1, 1]],
  4: [[4], [2, 2], [1, 2, 1], [1, 1, 1, 1]],
  6: [
    [3, 3],
    [2, 2, 2],
    [1, 4, 1],
    [1, 2, 2, 1],
    [2, 1, 1, 2],
  ],
} as const;

/** V2 is frozen independently of the editor catalogue and previously saved avatars. */
export function assembleAvatarV2(
  seed: string,
  primary: string,
  accent: string,
) {
  const random = randomFor(`clik-avatar-assembly-v2:${seed}`);
  const choose = <T>(items: readonly T[]) =>
    items[Math.floor(random() * items.length)];
  const parts: AvatarPart[] = [
    { kind: "plate", x: 0, y: 0, width: 6, color: accent },
  ];
  const pair = (part: AvatarPart) => parts.push(part, mirrorAvatarPart(part));
  const row = (span: Span, y: number) => {
    let x = (6 - span) / 2;
    const textured = random() < 0.6;
    for (const width of choose<readonly AvatarPart["width"][]>(
      partitions[span],
    )) {
      const kind =
        (width === 2 || width === 4) && textured ? "masonry" : "brick";
      parts.push({ kind, x, y, width, color: primary });
      x += width;
    }
    return y + AVATAR_PART_HEIGHT.brick;
  };
  const band = (span: Span, y: number, quarters = random() < 0.4) => {
    const x = (6 - span) / 2;
    if (span >= 4 && quarters) {
      pair({ kind: "quarter-plate", x, y, width: 2, side: -1, color: primary });
      if (span === 6)
        parts.push({ kind: "plate", x: 2, y, width: 2, color: primary });
    } else parts.push({ kind: "plate", x, y, width: span, color: primary });
    return y + 1;
  };
  const arch = (width: 4 | 6, y: number) => {
    parts.push({
      kind: "arch",
      x: (6 - width) / 2,
      y,
      width,
      color: primary,
      opening: choose(["round", "pointed"] as const),
    });
    return y + AVATAR_PART_HEIGHT.arch;
  };
  const finish = (span: Span, y: number) => {
    const x = (6 - span) / 2;
    const choices = ["studs", "tiles", "grille"];
    if (span >= 4) choices.push("quarters");
    if (y <= 13) choices.push("curve");
    if (y <= 12) choices.push("roof", "valley", "cones", "dome", "turrets");
    if (y <= 9) choices.push("spires");
    const cap = choose(choices);
    if (cap === "roof" || cap === "valley") {
      pair({
        kind: "slope",
        x,
        y,
        width: (span / 2) as 1 | 2 | 3,
        rise: cap === "roof" ? 1 : -1,
        color: primary,
      });
    } else if (cap === "curve") {
      const width = span === 2 ? 1 : 2;
      pair({
        kind: "curved-slope",
        x: 3 - width,
        y,
        width,
        rise: 1,
        color: primary,
      });
    } else if (cap === "quarters") {
      pair({ kind: "quarter-tile", x, y, width: 2, side: -1, color: primary });
      if (span === 6)
        parts.push({ kind: "grille", x: 2, y, width: 2, color: primary });
    } else if (cap === "tiles" || cap === "grille") {
      for (let offset = 0; offset < span; offset += 2)
        parts.push({
          kind: cap === "tiles" ? "tile" : "grille",
          x: x + offset,
          y,
          width: 2,
          color: primary,
        });
    } else if (cap === "dome") {
      const width = span >= 4 ? choose([2, 4] as const) : 2;
      parts.push({
        kind: "dome",
        x: (6 - width) / 2,
        y,
        width,
        color: primary,
      });
    } else if (cap === "cones") {
      if (span === 2 && random() < 0.5)
        parts.push({ kind: "cone", x: 2, y, width: 2, color: primary });
      else {
        const width = span === 2 ? 1 : choose([1, 2] as const);
        pair({ kind: "cone", x, y, width, color: primary });
        if (span === 6 && random() < 0.5)
          parts.push({ kind: "cone", x: 2, y, width: 2, color: primary });
      }
    } else if (cap === "turrets" || cap === "spires") {
      pair({ kind: "brick", x, y, width: 1, color: primary });
      if (cap === "spires")
        pair({ kind: "cone", x, y: y + 3, width: 1, color: primary });
    }
  };

  const shape = choose([
    "terraces",
    "portal",
    "bridge",
    "arcade",
    "wings",
    "cantilever",
    "pavilion",
    "spire",
    "gallery",
    "gate",
  ] as const);
  if (shape === "terraces") {
    let y = band(6, row(6, 1));
    y = band(4, row(4, y));
    finish(2, row(2, y));
  } else if (shape === "portal") {
    const width = choose([4, 6] as const);
    const y = band(width, arch(width, 1));
    const upper = choose(
      width === 6 ? ([2, 4, 6] as const) : ([2, 4] as const),
    );
    finish(upper, row(upper, y));
  } else if (shape === "bridge") {
    const width = choose([4, 6] as const);
    const leg = width === 6 ? choose([1, 2] as const) : 1;
    const x = (6 - width) / 2;
    let y = 1;
    for (let floor = 0, floors = choose([1, 2]); floor < floors; floor++) {
      pair({ kind: "brick", x, y, width: leg, color: primary });
      y += 3;
    }
    finish(width, band(width, arch(width, y)));
  } else if (shape === "arcade") {
    const width = choose([4, 6] as const);
    finish(4, arch(4, band(width, arch(width, 1))));
  } else if (shape === "wings") {
    const y = band(6, row(6, 1));
    pair({ kind: "curved-slope", x: 0, y, width: 2, rise: 1, color: primary });
    finish(2, row(2, band(2, row(2, y))));
  } else if (shape === "cantilever") {
    const span = choose([4, 6] as const);
    const y = row(2, 1);
    pair({
      kind: "inverted-slope",
      x: (6 - span) / 2,
      y,
      width: (span / 2) as 2 | 3,
      rise: 1,
      color: primary,
    });
    const upper = choose([2, 4] as const);
    finish(upper, row(upper, band(span, y + 3)));
  } else if (shape === "pavilion") {
    const y = band(6, arch(6, band(6, row(6, 1))));
    parts.push({ kind: "dome", x: 1, y, width: 4, color: primary });
  } else if (shape === "spire") {
    let y = band(2, row(2, band(4, row(4, 1))));
    if (random() < 0.5) y = row(2, y);
    parts.push({ kind: "cone", x: 2, y, width: 2, color: primary });
  } else if (shape === "gallery") {
    finish(4, row(4, band(4, row(4, 1), true)));
  } else {
    pair({ kind: "brick", x: 0, y: 1, width: 1, color: primary });
    pair({ kind: "plate", x: 0, y: 4, width: 1, color: primary });
    pair({
      kind: "slope",
      x: 0,
      y: 5,
      width: 1,
      rise: choose([-1, 1] as const),
      color: primary,
    });
    const upper = choose([2, 4] as const);
    finish(upper, row(upper, band(4, arch(4, 1))));
  }

  const key = (part: AvatarPart) =>
    `${part.kind}:${part.x}:${part.y}:${part.width}:${"rise" in part ? part.rise : ""}:${"side" in part ? part.side : ""}`;
  const byPosition = new Map(parts.map((part) => [key(part), part]));
  const groups = parts
    .slice(1)
    .filter((part) => part.x <= (6 - part.width) / 2)
    .map((part) => {
      const mirror = byPosition.get(key(mirrorAvatarPart(part)));
      return mirror && mirror !== part ? [part, mirror] : [part];
    });
  let budget =
    parts.reduce((sum, part) => sum + avatarPartArea(part), 0) / 3 - 6;
  while (groups.length) {
    const group = groups.splice(Math.floor(random() * groups.length), 1)[0];
    const area = group.reduce((sum, part) => sum + avatarPartArea(part), 0);
    if (area > budget) continue;
    group.forEach((part) => {
      part.color = accent;
    });
    budget -= area;
    if (random() < 0.65) break;
  }
  return parts.sort((a, b) => a.y - b.y || a.x - b.x);
}
