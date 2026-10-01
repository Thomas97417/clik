import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { internal } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.{ts,tsx,js}");

describe("Suppression du compte et avatar", () => {
  it("le véritable trigger Better Auth nettoie uniquement l’avatar du compte supprimé", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      for (const owner of ["alice", "bob"]) {
        await ctx.db.insert("avatarRewards", {
          owner,
          key: "gold",
          earnedAt: 1,
        });
        await ctx.db.insert("rewardProgress", { owner, count: 5 });
        await ctx.db.insert("userAvatars", {
          owner,
          seed: "12345678-1234-4234-9234-123456789abc",
          version: 1,
        });
      }
    });
    await t.mutation(internal.auth.onDelete, {
      model: "session",
      doc: { _id: "alice" },
    });
    expect(
      await t.run((ctx) => ctx.db.query("userAvatars").collect()),
    ).toHaveLength(2);
    await t.mutation(internal.auth.onDelete, {
      model: "user",
      doc: { _id: "alice" },
    });
    expect(
      (await t.run((ctx) => ctx.db.query("userAvatars").collect())).map(
        (row) => row.owner,
      ),
    ).toEqual(["bob"]);
    await t.mutation(internal.auth.onDelete, {
      model: "user",
      doc: { _id: "alice" },
    });
    expect(
      (await t.run((ctx) => ctx.db.query("avatarRewards").collect())).map(
        (r) => r.owner,
      ),
    ).toEqual(["bob"]);
    expect(
      await t.run((ctx) =>
        ctx.db
          .query("rewardProgress")
          .withIndex("by_owner", (q) => q.eq("owner", "alice"))
          .unique(),
      ),
    ).toMatchObject({ count: 0, deleted: true });
  });
});
