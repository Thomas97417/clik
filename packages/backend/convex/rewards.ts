import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent } from "./auth";
import {
  activateRewards,
  recordParticipation,
  settleBatch,
} from "./lib/rewards";
import { readAvatars } from "./lib/avatars";

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;
    const progress = await ctx.db
      .query("rewardProgress")
      .withIndex("by_owner", (q) => q.eq("owner", user._id))
      .unique();
    const rewards = await ctx.db
      .query("avatarRewards")
      .withIndex("by_owner_key", (q) => q.eq("owner", user._id))
      .collect();
    return {
      count: progress?.count ?? 0,
      rewards: await Promise.all(
        rewards.map(async (reward) => ({
          key: reward.key,
          earnedAt: reward.earnedAt,
          day: reward.challengeId
            ? (await ctx.db.get(reward.challengeId))?.day
            : undefined,
        })),
      ),
    };
  },
});

export const podium = query({
  args: {
    challengeId: v.id("challenges"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    if (challenge?.rewardStatus !== "complete")
      return { page: [], isDone: true, continueCursor: "" };
    const result = await ctx.db
      .query("challengeAwards")
      .withIndex("by_challenge_rank", (q) =>
        q.eq("challengeId", args.challengeId),
      )
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(args.paginationOpts.numItems, 24),
      });
    const avatars = await readAvatars(
      ctx,
      result.page.flatMap((a) => (a.owner ? [a.owner] : [])),
    );
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (award) => {
          const entry = await ctx.db.get(award.publicationId);
          const progress = award.owner
            ? await ctx.db
                .query("rewardProgress")
                .withIndex("by_owner", (q) => q.eq("owner", award.owner!))
                .unique()
            : null;
          const visible =
            !!award.owner && !progress?.deleted && !!entry?.active;
          return {
            _id: award._id,
            rank: award.rank,
            score: award.score,
            publicationId: visible ? award.publicationId : null,
            title: visible ? entry.title : "Création retirée",
            owner: visible ? award.owner : null,
            author: visible ? entry.author : null,
            avatar: visible ? avatars.get(award.owner!) : null,
          };
        }),
      ),
    };
  },
});

export const settle = internalMutation({
  args: { challengeId: v.id("challenges") },
  handler: async (ctx, { challengeId }): Promise<void> => {
    if (!(await settleBatch(ctx, challengeId)))
      await ctx.scheduler.runAfter(0, internal.rewards.settle, { challengeId });
  },
});

export const backfill = internalMutation({
  args: {},
  handler: async (ctx): Promise<void> => {
    const config = await activateRewards(ctx);
    if (config.historyDone) return;
    // Walk stable creation order, not an index whose active flag can change.
    const result = await ctx.db
      .query("publications")
      .paginate({ cursor: config.historyCursor ?? null, numItems: 100 });
    for (const entry of result.page) {
      if (
        entry.active &&
        entry.challengeId &&
        entry._creationTime <= config.activatedAt
      )
        await recordParticipation(ctx, entry.owner, entry.challengeId);
    }
    await ctx.db.patch(config._id, {
      historyCursor: result.continueCursor,
      historyDone: result.isDone,
    });
    if (!result.isDone)
      await ctx.scheduler.runAfter(0, internal.rewards.backfill, {});
  },
});

/** Also recovers missed scheduled jobs and an interrupted historical import. */
export const tick = internalMutation({
  args: {},
  handler: async (ctx): Promise<void> => {
    const config = await activateRewards(ctx);
    if (!config.historyDone)
      await ctx.scheduler.runAfter(0, internal.rewards.backfill, {});
    for (const status of ["pending", "processing"] as const) {
      const due = await ctx.db
        .query("challenges")
        .withIndex("by_reward_status", (q) =>
          q.eq("rewardStatus", status).lte("rewardAt", Date.now()),
        )
        .take(10);
      for (const challenge of due)
        await ctx.scheduler.runAfter(0, internal.rewards.settle, {
          challengeId: challenge._id,
        });
    }
  },
});

export const cleanup = internalMutation({
  args: { owner: v.string() },
  handler: async (ctx, { owner }): Promise<void> => {
    const progress = await ctx.db
      .query("rewardProgress")
      .withIndex("by_owner", (q) => q.eq("owner", owner))
      .unique();
    if (!progress?.deleted) return;
    const participations = await ctx.db
      .query("challengeParticipations")
      .withIndex("by_owner_challenge", (q) => q.eq("owner", owner))
      .take(100);
    for (const row of participations) await ctx.db.delete(row._id);
    const awards = await ctx.db
      .query("challengeAwards")
      .withIndex("by_owner", (q) => q.eq("owner", owner))
      .take(100);
    for (const row of awards) await ctx.db.patch(row._id, { owner: undefined });
    if (participations.length === 100 || awards.length === 100)
      await ctx.scheduler.runAfter(0, internal.rewards.cleanup, { owner });
  },
});
