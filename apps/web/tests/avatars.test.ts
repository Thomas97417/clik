import { describe, expect, it } from "vitest";
import {
  AVATAR_COLORS,
  AVATAR_PART_HEIGHT,
  assembleAvatar,
  avatarExposedStuds,
  avatarSignature,
  defaultAvatar,
  generateAvatar,
  isAvatarSeed,
  nextAvatar,
  type AvatarPart,
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

describe("Assemblage des avatars", () => {
  it("emboîte des pièces variées sans flottement ni chevauchement sur 1000 variantes", () => {
    const kinds = new Set<AvatarPart["kind"]>();
    const widths = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const descriptor = defaultAvatar(`assembly-${i}`);
      const model = assembleAvatar(descriptor);
      const { parts, primary, accent } = model;
      expect(assembleAvatar({ ...descriptor, crown: "gold" })).toEqual(model);
      expect(primary).toBe(generateAvatar(descriptor).primary);
      expect(accent).toBe(generateAvatar(descriptor).accent);
      expect(parts.filter((part) => part.y === 0)).toEqual([
        { kind: "plate", x: 0, y: 0, width: 6, color: accent },
      ]);
      const occupied = new Set<string>();
      let accented = 0;
      for (const part of parts) {
        kinds.add(part.kind);
        widths.add(part.width);
        const height = AVATAR_PART_HEIGHT[part.kind];
        expect([primary, accent]).toContain(part.color);
        expect(part.x).toBeGreaterThanOrEqual(0);
        expect(part.x + part.width).toBeLessThanOrEqual(6);
        expect(Number.isInteger(part.x)).toBe(true);
        expect(Number.isInteger(part.y)).toBe(true);
        expect(part.y).toBeGreaterThanOrEqual(0);
        expect(part.y + height).toBeLessThanOrEqual(15);
        expect(parts).toContainEqual({
          ...part,
          x: 6 - part.x - part.width,
          ...(part.kind === "slope" ? { rise: -part.rise } : {}),
        });
        for (let x = part.x; x < part.x + part.width; x++) {
          if (part.y > 0) {
            expect(
              parts.some(
                (support) =>
                  (support.kind === "brick" || support.kind === "plate") &&
                  support.y + AVATAR_PART_HEIGHT[support.kind] === part.y &&
                  support.x <= x &&
                  support.x + support.width > x,
              ),
            ).toBe(true);
          }
          for (let y = part.y; y < part.y + height; y++) {
            const cell = `${x},${y}`;
            expect(occupied.has(cell)).toBe(false);
            occupied.add(cell);
            if (part.color === accent) accented++;
          }
        }
      }
      expect(accented).toBeGreaterThan(0);
      expect(accented / occupied.size).toBeLessThanOrEqual(1 / 3);
    }
    expect([...kinds].sort()).toEqual(["brick", "plate", "slope", "tile"]);
    expect([...widths].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 6]);
  });

  it("masque les plots recouverts, y compris sous les tuiles et les pentes", () => {
    const parts: AvatarPart[] = [
      { kind: "plate", x: 0, y: 0, width: 6, color: "blue" },
      { kind: "brick", x: 1, y: 1, width: 4, color: "blue" },
      { kind: "tile", x: 1, y: 4, width: 2, color: "blue" },
      { kind: "slope", x: 3, y: 4, width: 1, rise: 1, color: "blue" },
    ];
    expect(avatarExposedStuds(parts[0], parts)).toEqual([0, 5]);
    expect(avatarExposedStuds(parts[1], parts)).toEqual([3]);
    expect(avatarExposedStuds(parts[2], parts)).toEqual([]);
    expect(avatarExposedStuds(parts[3], parts)).toEqual([]);
    expect(avatarExposedStuds(parts[1], [parts[0], parts[1]])).toEqual([
      0, 1, 2, 3,
    ]);
  });
});
