export type AvatarDescriptor = { seed: string; version: 1 };
export type AvatarBrick = { x: number; y: number; width: 1 | 2; color: string };
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

export function avatarSignature(avatar: AvatarDescriptor) {
  return JSON.stringify(generateAvatar(avatar).bricks);
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
