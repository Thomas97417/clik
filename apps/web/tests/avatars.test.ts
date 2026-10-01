import { describe, expect, it } from "vitest";
import {
  AVATAR_COLORS,
  avatarSignature,
  defaultAvatar,
  generateAvatar,
  isAvatarSeed,
  nextAvatar,
} from "@clik/avatars";

describe("Avatars Clik v1", () => {
  it("garde le même dessin pour une graine donnée, sans dépendre d’un nom ou d’un rendu", () => {
    const avatar = defaultAvatar("alice");
    expect(generateAvatar(avatar)).toEqual(generateAvatar({ ...avatar }));
    expect(avatarSignature(avatar)).not.toBe(
      avatarSignature(defaultAvatar("bob")),
    );
    expect(generateAvatar(avatar)).toMatchSnapshot();
  });
  it("respecte la symétrie, la densité, les couleurs et la connexité sur 1000 variantes", () => {
    const signatures = new Set<string>();
    let merged = 0;
    for (let i = 0; i < 1000; i++) {
      const descriptor = defaultAvatar(`sample-${i}`);
      const { bricks, primary, accent } = generateAvatar(descriptor);
      const cells = new Map<string, string>();
      expect(AVATAR_COLORS).toContain(primary);
      expect(AVATAR_COLORS).toContain(accent);
      expect(primary).not.toBe(accent);
      for (const brick of bricks) {
        expect([1, 2]).toContain(brick.width);
        if (brick.width === 2) merged++;
        expect(bricks).toContainEqual({
          ...brick,
          x: 5 - brick.x - brick.width,
        });
        for (let x = brick.x; x < brick.x + brick.width; x++) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThan(5);
          expect(brick.y).toBeGreaterThanOrEqual(0);
          expect(brick.y).toBeLessThan(5);
          const key = `${x},${brick.y}`;
          expect(cells.has(key)).toBe(false);
          cells.set(key, brick.color);
        }
      }
      expect([13, 15, 17, 19]).toContain(cells.size);
      const colored = [...cells.values()].filter((c) => c === accent).length;
      expect(colored).toBeGreaterThan(0);
      expect(colored / cells.size).toBeLessThanOrEqual(1 / 3);
      const visited = new Set<string>(["2,2"]);
      const pending = [[2, 2]];
      while (pending.length) {
        const [x, y] = pending.pop()!;
        for (const [a, b] of [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ]) {
          const key = `${a},${b}`;
          if (cells.has(key) && !visited.has(key)) {
            visited.add(key);
            pending.push([a, b]);
          }
        }
      }
      expect(visited.size).toBe(cells.size);
      signatures.add(avatarSignature(descriptor));
    }
    expect(signatures.size).toBeGreaterThan(950);
    expect(merged).toBeGreaterThan(0);
  });
  it("évite de proposer la même composition, même avec la même source aléatoire", () => {
    const seed = "12345678-1234-4234-9234-123456789abc";
    const previous = { seed, version: 1 as const };
    const next = nextAvatar(previous, () => seed);
    expect(avatarSignature(next)).not.toBe(avatarSignature(previous));
    expect(isAvatarSeed(next.seed)).toBe(true);
    for (const invalid of [
      "",
      "https://photo.test/avatar",
      "<svg>",
      "x".repeat(1000),
    ])
      expect(isAvatarSeed(invalid)).toBe(false);
  });
});
