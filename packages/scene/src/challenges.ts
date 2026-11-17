import { CATALOG, type PartType, type SceneDocument } from "./index";
export type ChallengeStock = { type: PartType; quantity: number }[];
export const CHALLENGE_DAY_MS = 86_400_000;
export const CHALLENGE_GENERATOR_VERSION = 2;
export const challengeDay = (time = Date.now()) =>
  new Date(time).toISOString().slice(0, 10);
export function challengeStart(day: string) {
  const start = Date.parse(`${day}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    !Number.isFinite(start) ||
    challengeDay(start) !== day
  )
    throw Error("Date de défi invalide.");
  return start;
}
function randomFor(key: string) {
  let seed = 2166136261;
  for (const c of key) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619) >>> 0;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

/** Version 1 pools are explicit: new catalogue entries never change old draws. */
function challengeStockV1(day: string): ChallengeStock {
  const random = randomFor(`clik-daily-v1:${day}`);
  const pick = (pool: PartType[], quantities: number[]) => {
    const available = [...pool];
    return quantities.map((quantity) => ({
      type: available.splice(Math.floor(random() * available.length), 1)[0],
      quantity,
    }));
  };
  return [
    { type: "brick-1x1", quantity: 16 },
    { type: "brick-1x2", quantity: 14 },
    { type: "brick-2x2", quantity: 12 },
    { type: "brick-2x4", quantity: 10 },
    ...pick(
      [
        "plate-1x2",
        "plate-1x4",
        "plate-2x2",
        "plate-2x4",
        "plate-4x4",
        "plate-4x6",
      ],
      [10, 8, 6],
    ),
    ...pick(
      [
        "slope-2x1",
        "slope-2x2",
        "slope-2x3",
        "slope-3x2",
        "slope-low-2x2",
        "slope-steep-2x2",
      ],
      [6, 6],
    ),
    ...pick(["arch-1x4x3", "arch-1x6x3"], [4]),
    ...pick(
      [
        "round-brick-1x1",
        "round-plate-2x2",
        "round-tile-2x2",
        "round-plate-4x4",
      ],
      [4],
    ),
    ...pick(
      [
        "corner-brick-2x2",
        "corner-plate-2x2",
        "tile-1x2",
        "tile-2x2",
        "tile-2x4",
      ],
      [4],
    ),
  ];
}

// Freeze each version's pools and profiles so archived draws remain reproducible.
const STOCK_POOLS_V2 = {
  bricks: [
    "brick-1x1",
    "brick-1x2",
    "brick-1x3",
    "brick-1x4",
    "brick-1x6",
    "brick-2x2",
    "brick-2x3",
    "brick-2x4",
    "brick-1x8",
    "brick-2x6",
    "brick-2x8",
    "brick-masonry-1x2",
    "brick-masonry-1x4",
  ],
  plates: [
    "plate-1x1",
    "plate-1x2",
    "plate-1x3",
    "plate-1x4",
    "plate-2x2",
    "plate-2x3",
    "plate-2x4",
    "plate-4x4",
    "plate-1x6",
    "plate-1x8",
    "plate-2x6",
    "plate-2x8",
    "plate-4x6",
    "plate-6x6",
    "plate-8x8",
  ],
  slopes: [
    "slope-2x1",
    "slope-2x2",
    "slope-2x3",
    "slope-3x2",
    "slope-3x1",
    "slope-3x3",
    "slope-4x2",
    "slope-4x4",
    "slope-low-2x2",
    "slope-steep-2x2",
    "slope-steep-2x1x1",
    "slope-steep-2x2x1",
    "slope-inverted-2x1",
    "slope-inverted-2x2",
    "slope-inverted-3x2",
    "slope-curved-2x1",
    "slope-curved-2x2",
    "slope-curved-3x2",
  ],
  tiles: [
    "tile-1x1",
    "tile-1x2",
    "tile-2x2",
    "tile-1x3",
    "tile-1x4",
    "tile-1x6",
    "tile-1x8",
    "tile-2x3",
    "tile-2x4",
    "tile-4x4",
    "tile-grille-1x2",
    "tile-grille-2x2",
  ],
  rounds: [
    "round-brick-1x1",
    "round-brick-2x2",
    "round-brick-3x3",
    "round-brick-4x4",
    "round-brick-6x6",
    "round-brick-8x8",
    "round-plate-1x1",
    "round-plate-2x2",
    "round-plate-3x3",
    "round-plate-4x4",
    "round-plate-6x6",
    "round-plate-8x8",
    "round-tile-1x1",
    "round-tile-2x2",
    "round-tile-3x3",
    "round-tile-4x4",
    "round-tile-6x6",
    "round-tile-8x8",
    "round-quarter-plate-2x2",
    "round-quarter-plate-4x4",
    "round-quarter-tile-2x2",
    "round-quarter-tile-4x4",
    "round-cone-1x1",
    "round-cone-2x2",
    "round-dome-2x2",
    "round-dome-4x4",
  ],
  specials: [
    "corner-brick-2x2",
    "corner-plate-2x2",
    "corner-tile-2x2",
    "arch-1x4x3",
    "arch-1x6x3",
  ],
} satisfies Record<string, PartType[]>;
type StockFamily = keyof typeof STOCK_POOLS_V2;

// Each profile contains 12 references / 100 pieces, including a usable structural base.
const STOCK_PROFILES_V2: Record<StockFamily, number[]>[] = [
  {
    bricks: [14, 12, 10],
    plates: [10, 8],
    slopes: [8, 6],
    tiles: [6, 6],
    rounds: [8, 6],
    specials: [6],
  },
  {
    bricks: [14, 12, 10, 8],
    plates: [10, 8],
    slopes: [8, 6],
    tiles: [6, 6],
    rounds: [6],
    specials: [6],
  },
  {
    bricks: [14, 12],
    plates: [12, 10],
    slopes: [8, 6],
    tiles: [6, 4],
    rounds: [8, 8, 6],
    specials: [6],
  },
  {
    bricks: [14, 12],
    plates: [10, 8, 8],
    slopes: [8, 6, 6],
    tiles: [8],
    rounds: [8, 6],
    specials: [6],
  },
];

function shuffled<T>(items: readonly T[], key: string): T[] {
  const result = [...items];
  const random = randomFor(key);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

export function challengeStock(
  day: string,
  version = CHALLENGE_GENERATOR_VERSION,
): ChallengeStock {
  const dayIndex = challengeStart(day) / CHALLENGE_DAY_MS;
  if (version === 1) return challengeStockV1(day);
  if (version !== 2) throw Error("Version de défi inconnue.");

  const cycle = Math.floor(dayIndex / STOCK_PROFILES_V2.length);
  const profileIndex = dayIndex - cycle * STOCK_PROFILES_V2.length;
  const profiles = shuffled(
    STOCK_PROFILES_V2,
    `clik-daily-v2:profiles:${cycle}`,
  );
  const profile = profiles[profileIndex]!;
  const stock: ChallengeStock = [];
  for (const family of Object.keys(STOCK_POOLS_V2) as StockFamily[]) {
    const pool = shuffled<PartType>(
      STOCK_POOLS_V2[family],
      `clik-daily-v2:${family}`,
    );
    const perCycle = profiles.reduce((sum, p) => sum + p[family].length, 0);
    const offset =
      cycle * perCycle +
      profiles
        .slice(0, profileIndex)
        .reduce((sum, p) => sum + p[family].length, 0);
    const quantities = shuffled(
      profile[family],
      `clik-daily-v2:${day}:${family}`,
    );
    // Advance through every reference without replacement, including across cycles.
    // Pools are large enough that consecutive days never share a reference.
    quantities.forEach((quantity, i) => {
      const index = (((offset + i) % pool.length) + pool.length) % pool.length;
      stock.push({ type: pool[index]!, quantity });
    });
  }
  return stock;
}
export function countStock(
  scene: SceneDocument,
): Partial<Record<PartType, number>> {
  const counts: Partial<Record<PartType, number>> = {};
  for (const node of scene.nodes)
    if (node.kind === "part") counts[node.type] = (counts[node.type] ?? 0) + 1;
  return counts;
}
export function validateChallengeStock(
  scene: SceneDocument,
  stock: ChallengeStock,
) {
  const available = new Map(stock.map((item) => [item.type, item.quantity]));
  for (const [type, count] of Object.entries(countStock(scene))) {
    const limit = available.get(type as PartType) ?? 0;
    if (count! > limit)
      throw Error(
        `${CATALOG[type as PartType].name} : ${limit ? `stock limité à ${limit} exemplaires` : "pièce absente du lot"}.`,
      );
  }
  return scene;
}
