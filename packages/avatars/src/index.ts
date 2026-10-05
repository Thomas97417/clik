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
  version: 1;
  crown?: CrownId;
  ring?: RingId;
};
export type AvatarBrick = { x: number; y: number; width: 1 | 2; color: string };
export const AVATAR_PART_HEIGHT = {
  brick: 3,
  plate: 1,
  tile: 1,
  slope: 3,
} as const;
export type AvatarPart = {
  x: number;
  /** Height from the base, in plate units. */
  y: number;
  width: 1 | 2 | 3 | 4 | 6;
  color: string;
} & ({ kind: "brick" | "plate" | "tile" } | { kind: "slope"; rise: -1 | 1 });
export const AVATAR_COLORS = [
  "#5787eb",
  "#f3b18e",
  "#b38bde",
  "#81b79b",
] as const;
export const AVATAR_BACKGROUND = "#f1f5fc";

/** V1 is immutable: changes to its rules require a new generator version. */
function randomFor(seed: string) {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    state = Math.imul(state ^ seed.charCodeAt(i), 16777619);
  }
  return () => {
    let value = (state += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function defaultAvatar(userId: string): AvatarDescriptor {
  return { seed: `clik:user:${userId}`, version: 1 };
}

export function generateAvatar({ seed, version }: AvatarDescriptor) {
  if (version !== 1) throw new Error("Unsupported avatar version");
  const random = randomFor(`clik-avatar-v1:${seed}`);
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
 * Every brick rests on a flat supporting piece and connecting plates bind rows.
 */
export function assembleAvatar(avatar: AvatarDescriptor) {
  const { primary, accent, background } = generateAvatar(avatar);
  const random = randomFor(`clik-avatar-assembly:${avatar.seed}`);
  const choose = <T>(items: readonly T[]) =>
    items[Math.floor(random() * items.length)];
  const parts: AvatarPart[] = [
    { kind: "plate", x: 0, y: 0, width: 6, color: accent },
  ];
  let y = 1;
  const lower = choose([4, 6] as const);
  const middle = choose(lower === 6 ? ([4, 6] as const) : ([2, 4] as const));
  const upper = choose(middle === 2 ? ([2] as const) : ([2, 4] as const));
  const widths = [lower, middle, upper];
  for (const [row, width] of widths.entries()) {
    let x = (6 - width) / 2;
    for (const length of choose<readonly AvatarPart["width"][]>(
      partitions[width],
    )) {
      parts.push({ kind: "brick", x, y, width: length, color: primary });
      x += length;
    }
    y += AVATAR_PART_HEIGHT.brick;
    if (row < 2) {
      parts.push({
        kind: "plate",
        x: (6 - width) / 2,
        y,
        width,
        color: primary,
      });
      y += AVATAR_PART_HEIGHT.plate;
    }
  }
  const cap = choose(["studs", "tiles", "slopes", "terrace"] as const);
  const x = (6 - upper) / 2;
  if (cap === "slopes") {
    const width = upper === 4 ? 2 : 1;
    parts.push(
      { kind: "slope", x, y, width, rise: 1, color: primary },
      { kind: "slope", x: x + width, y, width, rise: -1, color: primary },
    );
  } else if (cap === "tiles") {
    for (let offset = 0; offset < upper; offset += 2)
      parts.push({ kind: "tile", x: x + offset, y, width: 2, color: primary });
  } else if (cap === "terrace") {
    parts.push({ kind: "tile", x: 2, y, width: 2, color: primary });
  }

  // Colour whole mirrored pieces, with at most a third of the solid volume accented.
  let budget =
    parts.reduce(
      (sum, part) => sum + part.width * AVATAR_PART_HEIGHT[part.kind],
      0,
    ) /
      3 -
    6;
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
    const volume = group.reduce(
      (sum, part) => sum + part.width * AVATAR_PART_HEIGHT[part.kind],
      0,
    );
    if (volume > budget) continue;
    group.forEach((part) => {
      part.color = accent;
    });
    budget -= volume;
    if (random() < 0.65) break;
  }
  return { parts, primary, accent, background };
}

/** Only unoccupied studs are visible; slopes and tiles have a smooth top. */
export function avatarExposedStuds(
  part: AvatarPart,
  parts: readonly AvatarPart[],
) {
  if (part.kind === "tile" || part.kind === "slope") return [];
  const top = part.y + AVATAR_PART_HEIGHT[part.kind];
  return Array.from({ length: part.width }, (_, index) => index).filter(
    (index) => {
      const x = part.x + index + 0.5;
      return !parts.some(
        (other) => other.y === top && other.x < x && other.x + other.width > x,
      );
    },
  );
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
      version: 1,
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
