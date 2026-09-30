import { CATALOG, type PartType, type SceneDocument } from "./index";
export type ChallengeStock = { type: PartType; quantity: number }[];
export const CHALLENGE_DAY_MS = 86_400_000;
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
/** Version 1 pools are explicit: new catalogue entries never change old draws. */
export function challengeStock(day: string): ChallengeStock {
  challengeStart(day);
  let seed = 2166136261;
  for (const c of `clik-daily-v1:${day}`)
    seed = Math.imul(seed ^ c.charCodeAt(0), 16777619) >>> 0;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
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
