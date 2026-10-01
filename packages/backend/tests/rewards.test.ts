import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import {
  challengeDay,
  challengeStart,
  emptyScene,
  makePart,
} from "@clik/scene";
import { defaultAvatar } from "@clik/avatars";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import {
  activateRewards,
  markRewardsDeleted,
  recordParticipation,
  settleBatch,
} from "../convex/lib/rewards";
import { readAvatar } from "../convex/lib/avatars";
import type { Id } from "../convex/_generated/dataModel";

vi.mock("../convex/auth", () => ({
  authComponent: {
    safeGetAuthUser: async (ctx: any) => {
      const identity = await ctx.auth.getUserIdentity();
      return identity
        ? { _id: identity.subject, name: identity.subject }
        : null;
    },
  },
}));
const modules = import.meta.glob("../convex/**/*.{ts,tsx,js}");
const start = challengeStart("2026-10-02");
const deadline = start + 2 * 86400000;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(start - 1000);
});
afterEach(() => vi.useRealTimers());
async function setup() {
  const t = convexTest(schema, modules);
  await t.run((ctx) => activateRewards(ctx));
  vi.setSystemTime(start + 1000);
  const challengeId = await t.mutation(api.challenges.ensureToday, {});
  const user = (owner: string) => t.withIdentity({ subject: owner });
  const publish = async (owner: string) => {
    const u = user(owner);
    const projectId = await u.mutation(api.challenges.start, {
      day: challengeDay(),
    });
    const revision = await u.mutation(api.projects.save, {
      id: projectId,
      title: owner,
      revision: 0,
      scene: JSON.stringify({
        ...emptyScene(),
        nodes: [makePart("brick-2x4", "#4079e8")],
      }),
    });
    const thumbnail = await t.run((ctx) =>
      ctx.storage.store(new Blob(["png"])),
    );
    await u.mutation(internal.projects.registerThumbnail, {
      projectId,
      storageId: thumbnail,
    });
    const args = {
      id: projectId,
      title: owner,
      description: "",
      revision,
      thumbnail,
    };
    const id = await u.mutation(api.projects.publish, args);
    return { id, args, u };
  };
  const vote = (owner: string, id: Id<"publications">, voted = true) =>
    user(owner).mutation(api.challenges.vote, { publicationId: id, voted });
  const settle = () => t.run((ctx) => settleBatch(ctx, challengeId));
  const awards = () =>
    t.run((ctx) =>
      ctx.db
        .query("challengeAwards")
        .withIndex("by_challenge_rank", (q) => q.eq("challengeId", challengeId))
        .collect(),
    );
  return { t, user, publish, vote, settle, awards, challengeId };
}

describe("Récompenses des défis", () => {
  it("active une seule fois et commence au prochain défi UTC", async () => {
    const t = convexTest(schema, modules);
    const configs = await Promise.all([
      t.run((ctx) => activateRewards(ctx)),
      t.run((ctx) => activateRewards(ctx)),
    ]);
    expect(configs[0]._id).toBe(configs[1]._id);
    expect(configs[0].firstDay).toBe("2026-10-02");
    const old = await t.mutation(api.challenges.ensureToday, {});
    expect((await t.run((ctx) => ctx.db.get(old)))?.rewardAt).toBeUndefined();
    vi.setSystemTime(start);
    const current = await t.mutation(api.challenges.ensureToday, {});
    expect((await t.run((ctx) => ctx.db.get(current)))?.rewardAt).toBe(
      deadline,
    );
    vi.setSystemTime(deadline);
    expect((await t.run((ctx) => activateRewards(ctx))).firstDay).toBe(
      "2026-10-02",
    );
  });

  it("fige exactement à l’échéance, même lorsque l’attribution est retardée", async () => {
    const { t, publish, vote, settle, awards, user } = await setup();
    const alice = await publish("alice");
    await vote("bob", alice.id);
    vi.setSystemTime(deadline - 1);
    expect(await settle()).toBe(true);
    expect(await awards()).toHaveLength(0);
    await vote("carol", alice.id);
    vi.setSystemTime(deadline);
    await vote("late", alice.id);
    await vote("bob", alice.id, false);
    expect(await t.run((ctx) => ctx.db.get(alice.id))).toMatchObject({
      voteCount: 2,
      rewardScore: 2,
    });
    vi.setSystemTime(deadline + 5000);
    await settle();
    await settle();
    expect(await awards()).toMatchObject([
      { owner: "alice", rank: 1, score: 2 },
    ]);
    const rewards = await user("alice").query(api.rewards.mine, {});
    expect(rewards?.rewards.map((r) => r.key).sort()).toEqual([
      "gold",
      "participation-1",
    ]);
    expect(await t.run((ctx) => readAvatar(ctx, "alice"))).toEqual(
      defaultAvatar("alice"),
    );
  });

  it.each([
    [3, 3, 2, 1],
    [3, 2, 2, 1],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
  ])("respecte les rangs de compétition : %j", async (...scores) => {
    const { t, publish, settle, awards } = await setup();
    for (let i = 0; i < scores.length; i++) {
      const entry = await publish(`owner-${i}`);
      await t.run((ctx) =>
        ctx.db.patch(entry.id, {
          rewardScore: scores[i],
          voteCount: scores[i],
        }),
      );
    }
    vi.setSystemTime(deadline);
    await settle();
    const expected = scores
      .filter((s) => s > 0)
      .map((score) => ({
        score,
        rank: 1 + scores.filter((s) => s > score).length,
      }))
      .filter((r) => r.rank <= 3);
    expect(
      (await awards()).map(({ rank, score }) => ({ rank, score })),
    ).toEqual(expected);
  });

  it("exclut un retrait avant échéance, conserve un retrait après et masque les liens privés", async () => {
    const { t, publish, vote, settle, awards, challengeId, user } =
      await setup();
    const before = await publish("before"),
      after = await publish("after");
    await vote("voter", before.id);
    await vote("voter", after.id);
    vi.setSystemTime(deadline - 1);
    await before.u.mutation(api.projects.withdraw, { id: before.id });
    vi.setSystemTime(deadline);
    await after.u.mutation(api.projects.withdraw, { id: after.id });
    await settle();
    expect(await awards()).toMatchObject([
      { owner: "after", rank: 1, score: 1 },
    ]);
    const podium = await t.query(api.rewards.podium, {
      challengeId,
      paginationOpts: { numItems: 12, cursor: null },
    });
    expect(podium.page[0]).toMatchObject({
      publicationId: null,
      owner: null,
      title: "Création retirée",
    });
    expect((await user("before").query(api.rewards.mine, {}))?.count).toBe(1);
  });

  it("compte une seule participation après republication et remet le score à zéro", async () => {
    const { publish, vote, user, t } = await setup();
    const entry = await publish("alice");
    await vote("bob", entry.id);
    await entry.u.mutation(api.projects.publish, entry.args);
    expect((await t.run((ctx) => ctx.db.get(entry.id)))?.rewardScore).toBe(1);
    await entry.u.mutation(api.projects.withdraw, { id: entry.id });
    await entry.u.mutation(api.projects.publish, entry.args);
    expect(await t.run((ctx) => ctx.db.get(entry.id))).toMatchObject({
      rewardEligible: true,
      rewardScore: 0,
    });
    expect((await user("alice").query(api.rewards.mine, {}))?.count).toBe(1);
  });

  it("attribue tous les ex æquo sur plusieurs lots sans doubler les gains", async () => {
    const { t, publish, settle, awards, challengeId } = await setup();
    const first = await publish("owner-0");
    const template = (await t.run((ctx) => ctx.db.get(first.id)))!;
    const { _id, _creationTime, ...data } = template;
    await t.run(async (ctx) => {
      await ctx.db.patch(first.id, { rewardScore: 1 });
      for (let i = 1; i < 105; i++)
        await ctx.db.insert("publications", {
          ...data,
          owner: `owner-${i}`,
          rewardScore: 1,
        });
    });
    vi.setSystemTime(deadline);
    expect(await settle()).toBe(false);
    expect(await awards()).toHaveLength(100);
    await Promise.all([settle(), settle()]);
    expect(await awards()).toHaveLength(105);
    expect((await awards()).every((a) => a.rank === 1)).toBe(true);
    expect((await t.run((ctx) => ctx.db.get(challengeId)))?.rewardStatus).toBe(
      "complete",
    );
    expect(
      (await t.run((ctx) => ctx.db.query("avatarRewards").collect())).filter(
        (r) => r.key === "gold",
      ),
    ).toHaveLength(105);
  });

  it("débloque les cinq paliers sans doublons et refuse les accessoires non acquis", async () => {
    const { t, user, challengeId } = await setup();
    for (let i = 0; i < 50; i++) {
      const id =
        i === 0
          ? challengeId
          : await t.run((ctx) =>
              ctx.db.insert("challenges", {
                day: `fixture-${i}`,
                opensAt: 0,
                closesAt: 1,
                generatorVersion: 1,
                stock: [],
              }),
            );
      await Promise.all([
        t.run((ctx) => recordParticipation(ctx, "alice", id)),
        t.run((ctx) => recordParticipation(ctx, "alice", id)),
      ]);
      if ([0, 4, 9, 24, 49].includes(i)) {
        const mine = await user("alice").query(api.rewards.mine, {});
        expect(mine?.count).toBe(i + 1);
        expect(mine?.rewards).toHaveLength([0, 4, 9, 24, 49].indexOf(i) + 1);
      }
    }
    await expect(
      user("bob").mutation(api.avatars.save, { ring: "participation-1" }),
    ).rejects.toThrow("débloquée");
    await expect(
      user("alice").mutation(api.avatars.save, { crown: "gold" }),
    ).rejects.toThrow("débloquée");
    await expect(t.mutation(api.avatars.save, { ring: null })).rejects.toThrow(
      "Connexion",
    );
    await user("alice").mutation(api.avatars.save, {
      ring: "participation-50",
    });
    expect(await t.run((ctx) => readAvatar(ctx, "alice"))).toEqual({
      ...defaultAvatar("alice"),
      ring: "participation-50",
    });
    const seed = "12345678-1234-4234-9234-123456789abc";
    await user("alice").mutation(api.avatars.save, { seed, version: 1 });
    expect(await t.run((ctx) => readAvatar(ctx, "alice"))).toMatchObject({
      seed,
      ring: "participation-50",
    });
    await user("alice").mutation(api.avatars.save, { ring: null });
    expect(
      (await t.run((ctx) => readAvatar(ctx, "alice"))).ring,
    ).toBeUndefined();
    await expect(
      user("alice").mutation(api.avatars.save, { ring: "unknown" as any }),
    ).rejects.toThrow();
  });

  it("reprend uniquement les anciennes participations publiques, sans couronnes rétroactives", async () => {
    const { t, publish, user } = await setup();
    const old = await publish("old"),
      hidden = await publish("hidden");
    await publish("public");
    await hidden.u.mutation(api.projects.withdraw, { id: hidden.id });
    // Simulate publications predating the feature, without any reward data.
    await t.run(async (ctx) => {
      for (const row of await ctx.db.query("challengeParticipations").collect())
        await ctx.db.delete(row._id);
      for (const row of await ctx.db.query("rewardProgress").collect())
        await ctx.db.delete(row._id);
      for (const row of await ctx.db.query("avatarRewards").collect())
        await ctx.db.delete(row._id);
      const config = (await ctx.db.query("rewardConfig").first())!;
      await ctx.db.patch(config._id, { activatedAt: Date.now() + 1000 });
    });
    // A legacy entry withdrawn while the import is pending still counts once.
    await old.u.mutation(api.projects.withdraw, { id: old.id });
    await t.mutation(internal.rewards.backfill, {});
    await t.mutation(internal.rewards.backfill, {});
    expect((await user("old").query(api.rewards.mine, {}))?.count).toBe(1);
    expect((await user("hidden").query(api.rewards.mine, {}))?.count).toBe(0);
    expect(
      (await user("old").query(api.rewards.mine, {}))?.rewards.map(
        (r) => r.key,
      ),
    ).toEqual(["participation-1"]);
    expect((await user("public").query(api.rewards.mine, {}))?.count).toBe(1);
  });

  it("nettoie le compte supprimé et empêche les tâches différées de recréer ses récompenses", async () => {
    const { t, publish, vote, settle, awards, challengeId } = await setup();
    const entry = await publish("alice");
    await vote("voter", entry.id);
    await t.run((ctx) => markRewardsDeleted(ctx, "alice"));
    await t.mutation(internal.rewards.cleanup, { owner: "alice" });
    await t.run((ctx) => recordParticipation(ctx, "alice", challengeId));
    vi.setSystemTime(deadline);
    await settle();
    expect(await awards()).toMatchObject([{ rank: 1 }]);
    expect((await awards())[0].owner).toBeUndefined();
    expect(
      await t.run((ctx) => ctx.db.query("avatarRewards").collect()),
    ).toEqual([]);
    expect(
      await t.run((ctx) => ctx.db.query("challengeParticipations").collect()),
    ).toEqual([]);
  });

  it("le rattrapage planifie puis termine une attribution manquée", async () => {
    const { t, publish, vote, awards } = await setup();
    const entry = await publish("alice");
    await vote("voter", entry.id);
    vi.setSystemTime(deadline + 5000);
    await t.mutation(internal.rewards.tick, {});
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await awards()).toMatchObject([{ rank: 1, score: 1 }]);
  });
});
