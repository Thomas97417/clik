import { randomFor } from "./random";
import { assembleAvatarV2 } from "./assembly-v2";
import { AVATAR_PART_HEIGHT, avatarPartArea, type AvatarPart } from "./parts";
export {
  AVATAR_PART_HEIGHT,
  AVATAR_ARCH_PROFILE,
  avatarPartArea,
  avatarBottomSockets,
  avatarTopStuds,
  avatarExposedStuds,
  mirrorAvatarPart,
  type AvatarPart,
} from "./parts";

export const AVATAR_VERSION = 2;
export const CROWNS = [
  { id: "gold", name: "Or", rank: 1, color: "#edb83f", shade: "#9e681b" },
  { id: "silver", name: "Argent", rank: 2, color: "#c1cedc", shade: "#65778e" },
  { id: "bronze", name: "Bronze", rank: 3, color: "#cf9266", shade: "#885035" },
] as const;
export const RINGS = [
  {
    id: "participation-1",
    name: "Première brique",
    threshold: 1,
    color: "#356ae6",
  },
  { id: "participation-5", name: "Bâtisseur", threshold: 5, color: "#39836a" },
  {
    id: "participation-10",
    name: "Architecte",
    threshold: 10,
    color: "#8558bd",
  },
  {
    id: "participation-25",
    name: "Maître d’œuvre",
    threshold: 25,
    color: "#c56b31",
  },
  {
    id: "participation-50",
    name: "Grand créateur",
    threshold: 50,
    color: "#21385e",
  },
] as const;
export type CrownId = (typeof CROWNS)[number]["id"];
export type RingId = (typeof RINGS)[number]["id"];
export type AvatarDescriptor = {
  seed: string;
  version: 1 | 2;
  crown?: CrownId;
  ring?: RingId;
};
export type AvatarBrick = { x: number; y: number; width: 1 | 2; color: string };
export const AVATAR_COLORS = [
  "#5787eb",
  "#f3b18e",
  "#b38bde",
  "#81b79b",
] as const;
export const AVATAR_BACKGROUND = "#f1f5fc";

export function defaultAvatar(userId: string): AvatarDescriptor {
  return { seed: `clik:user:${userId}`, version: AVATAR_VERSION };
}

export function generateAvatar({ seed, version }: AvatarDescriptor) {
  if (version !== 1 && version !== 2)
    throw new Error("Unsupported avatar version");
  const random = randomFor(`clik-avatar-v${version}:${seed}`);
  const choose = (length: number) => Math.floor(random() * length);
  const primaryIndex = choose(AVATAR_COLORS.length);
  const primary = AVATAR_COLORS[primaryIndex];
  const accent = AVATAR_COLORS[(primaryIndex + 1 + choose(3)) % 4];
  const cells = Array.from({ length: 5 }, () => [
    false,
    false,
    true,
    false,
    false,
  ]);
  const target = 13 + 2 * choose(4);
  let occupied = 5;
  const pairs: [number, number][] = [];
  while (occupied < target) {
    const frontier: [number, number][] = [];
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 2; x++) {
        if (
          !cells[y][x] &&
          [
            [x - 1, y],
            [x + 1, y],
            [x, y - 1],
            [x, y + 1],
          ].some(([a, b]) => cells[b]?.[a])
        ) {
          frontier.push([x, y]);
        }
      }
    }
    const [x, y] = frontier[choose(frontier.length)];
    cells[y][x] = cells[y][4 - x] = true;
    pairs.push([x, y]);
    occupied += 2;
  }
  const accents = new Set<string>();
  const accentPairs = 1 + choose(Math.floor(occupied / 6));
  for (let i = 0; i < accentPairs; i++) {
    const [x, y] = pairs.splice(choose(pairs.length), 1)[0];
    accents.add(`${x},${y}`);
    accents.add(`${4 - x},${y}`);
  }
  const colorAt = (x: number, y: number) =>
    accents.has(`${x},${y}`) ? accent : primary;
  const bricks: AvatarBrick[] = [];
  for (let y = 0; y < 5; y++) {
    const merge =
      cells[y][0] &&
      cells[y][1] &&
      colorAt(0, y) === colorAt(1, y) &&
      random() < 0.5;
    if (merge) {
      bricks.push(
        { x: 0, y, width: 2, color: colorAt(0, y) },
        { x: 3, y, width: 2, color: colorAt(0, y) },
      );
    } else {
      for (const x of [0, 1, 3, 4])
        if (cells[y][x]) bricks.push({ x, y, width: 1, color: colorAt(x, y) });
    }
    bricks.push({ x: 2, y, width: 1, color: primary });
  }
  return { bricks, primary, accent, background: AVATAR_BACKGROUND };
}

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

/**
 * The v1 identity and palette stay stable; this is its assembled presentation.
 * Flat supporting pieces bind rows; arches connect only through their two feet.
 */
function assembleAvatarV1(avatar: AvatarDescriptor) {
  const { primary, accent, background } = generateAvatar(avatar);
  const random = randomFor(`clik-avatar-assembly:${avatar.seed}`);
  const choose = <T>(items: readonly T[]) =>
    items[Math.floor(random() * items.length)];
  const parts: AvatarPart[] = [
    { kind: "plate", x: 0, y: 0, width: 6, color: accent },
  ];
  type Span = 2 | 4 | 6;
  const row = (width: Span, y: number) => {
    let x = (6 - width) / 2;
    for (const length of choose<readonly AvatarPart["width"][]>(
      partitions[width],
    )) {
      parts.push({ kind: "brick", x, y, width: length, color: primary });
      x += length;
    }
    return y + AVATAR_PART_HEIGHT.brick;
  };
  const plate = (width: Span, y: number) => {
    parts.push({ kind: "plate", x: (6 - width) / 2, y, width, color: primary });
    return y + AVATAR_PART_HEIGHT.plate;
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
  const slopes = (span: Span, y: number, inward: boolean) => {
    const width = (span / 2) as 1 | 2 | 3;
    const x = (6 - span) / 2;
    const rise = inward ? 1 : -1;
    parts.push(
      { kind: "slope", x, y, width, rise, color: primary },
      {
        kind: "slope",
        x: x + width,
        y,
        width,
        rise: rise === 1 ? -1 : 1,
        color: primary,
      },
    );
  };
  const finish = (span: Span, y: number) => {
    const cap = choose(
      y <= 12
        ? (["studs", "tiles", "roof", "valley", "terrace", "turrets"] as const)
        : (["studs", "tiles", "terrace"] as const),
    );
    const x = (6 - span) / 2;
    if (cap === "roof" || cap === "valley") slopes(span, y, cap === "roof");
    else if (cap === "tiles") {
      for (let offset = 0; offset < span; offset += 2)
        parts.push({
          kind: "tile",
          x: x + offset,
          y,
          width: 2,
          color: primary,
        });
    } else if (cap === "terrace") {
      parts.push({ kind: "tile", x: 2, y, width: 2, color: primary });
    } else if (cap === "turrets") {
      parts.push(
        { kind: "brick", x, y, width: 1, color: primary },
        { kind: "brick", x: x + span - 1, y, width: 1, color: primary },
      );
    }
  };
  const shape = choose([
    "steps",
    "portal",
    "bridge",
    "arcade",
    "wings",
    "gate",
  ] as const);
  if (shape === "steps") {
    const lower = choose([4, 6] as const);
    const middle = choose(lower === 6 ? ([4, 6] as const) : ([2, 4] as const));
    const upper = choose(middle === 2 ? ([2] as const) : ([2, 4] as const));
    let y = plate(lower, row(lower, 1));
    y = plate(middle, row(middle, y));
    finish(upper, row(upper, y));
  } else if (shape === "portal") {
    const width = choose([4, 6] as const);
    const pedestal = random() < 0.5;
    let y = pedestal ? plate(6, row(6, 1)) : 1;
    y = plate(width, arch(width, y));
    if (pedestal) finish(width, y);
    else {
      const upper = choose(
        width === 6 ? ([2, 4, 6] as const) : ([2, 4] as const),
      );
      finish(upper, row(upper, y));
    }
  } else if (shape === "bridge") {
    const width = choose([4, 6] as const);
    const leg = width === 6 ? choose([1, 2] as const) : 1;
    const x = (6 - width) / 2;
    const tall = random() < 0.5;
    let y = 1;
    for (let floor = 0; floor < (tall ? 2 : 1); floor++) {
      parts.push(
        { kind: "brick", x, y, width: leg, color: primary },
        { kind: "brick", x: x + width - leg, y, width: leg, color: primary },
      );
      y += AVATAR_PART_HEIGHT.brick;
    }
    y = plate(width, arch(width, y));
    if (!tall && random() < 0.5) {
      const upper = choose([2, 4] as const);
      finish(upper, row(upper, y));
    } else finish(width, y);
  } else if (shape === "arcade") {
    const width = choose([4, 6] as const);
    const y = plate(width, arch(width, 1));
    finish(4, arch(4, y));
  } else if (shape === "wings") {
    const y = plate(6, row(6, 1));
    const inward = random() < 0.5;
    parts.push(
      {
        kind: "slope",
        x: 0,
        y,
        width: 2,
        rise: inward ? 1 : -1,
        color: primary,
      },
      {
        kind: "slope",
        x: 4,
        y,
        width: 2,
        rise: inward ? -1 : 1,
        color: primary,
      },
    );
    finish(2, row(2, plate(2, row(2, y))));
  } else {
    const inward = random() < 0.5;
    for (const x of [0, 5]) {
      parts.push(
        { kind: "brick", x, y: 1, width: 1, color: primary },
        { kind: "plate", x, y: 4, width: 1, color: primary },
        {
          kind: "slope",
          x,
          y: 5,
          width: 1,
          rise: (x === 0) === inward ? 1 : -1,
          color: primary,
        },
      );
    }
    const y = plate(4, arch(4, 1));
    const upper = choose([2, 4] as const);
    finish(upper, row(upper, y));
  }

  // Colour whole mirrored pieces, with at most a third of the silhouette accented.
  let budget =
    parts.reduce((sum, part) => sum + avatarPartArea(part), 0) / 3 - 6;
  const groups: AvatarPart[][] = [];
  for (const part of parts.slice(1)) {
    if (part.x > (6 - part.width) / 2) continue;
    const mirror = parts.find(
      (other) =>
        other !== part &&
        other.y === part.y &&
        other.kind === part.kind &&
        other.width === part.width &&
        other.x === 6 - part.x - part.width,
    );
    groups.push(mirror ? [part, mirror] : [part]);
  }
  while (groups.length) {
    const index = Math.floor(random() * groups.length);
    const group = groups.splice(index, 1)[0];
    const area = group.reduce((sum, part) => sum + avatarPartArea(part), 0);
    if (area > budget) continue;
    group.forEach((part) => {
      part.color = accent;
    });
    budget -= area;
    if (random() < 0.65) break;
  }
  // Paint lower and leftmost pieces first so adjacent pieces hide internal faces.
  parts.sort((a, b) => a.y - b.y || a.x - b.x);
  return { parts, primary, accent, background };
}

/** Stored v1 choices remain unchanged when a new assembly vocabulary is added. */
export function assembleAvatar(avatar: AvatarDescriptor) {
  if (avatar.version === 1) return assembleAvatarV1(avatar);
  const { primary, accent, background } = generateAvatar(avatar);
  return {
    parts: assembleAvatarV2(avatar.seed, primary, accent),
    primary,
    accent,
    background,
  };
}

export function avatarSignature(avatar: AvatarDescriptor) {
  return JSON.stringify(assembleAvatar(avatar).parts);
}

/** Randomness is injected so generation stays pure and is safe during SSR. */
export function nextAvatar(
  previous: AvatarDescriptor,
  newSeed: () => string,
): AvatarDescriptor {
  const signature = avatarSignature(previous);
  const seed = newSeed();
  // A distinct deterministic suffix resolves even a (very unlikely) visual collision.
  for (let attempt = 0; ; attempt++) {
    const next: AvatarDescriptor = {
      version: AVATAR_VERSION,
      seed: attempt ? `${seed}:${attempt}` : seed,
    };
    if (avatarSignature(next) !== signature) return next;
  }
}

export function isAvatarSeed(seed: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?::[1-9][0-9]{0,5})?$/i.test(
    seed,
  );
}
