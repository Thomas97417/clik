import { CROWNS, RINGS } from "@clik/avatars";
import { CHALLENGE_DAY_MS, challengeDay, challengeStart } from "@clik/scene";
import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export async function activateRewards(ctx: MutationCtx) {
  const existing = await ctx.db
    .query("rewardConfig")
    .withIndex("by_key", (q) => q.eq("key", "v1"))
    .unique();
  if (existing) return existing;
  const activatedAt = Date.now();
  const id = await ctx.db.insert("rewardConfig", {
    key: "v1",
    activatedAt,
    firstDay: challengeDay(
      challengeStart(challengeDay(activatedAt)) + CHALLENGE_DAY_MS,
    ),
    historyDone: false,
  });
  return (await ctx.db.get(id))!;
}

export async function unlock(
  ctx: MutationCtx,
  owner: string,
  key: string,
  challengeId?: Id<"challenges">,
) {
  const existing = await ctx.db
    .query("avatarRewards")
    .withIndex("by_owner_key", (q) => q.eq("owner", owner).eq("key", key))
    .unique();
  if (!existing)
    await ctx.db.insert("avatarRewards", {
      owner,
      key,
      challengeId,
      earnedAt: Date.now(),
    });
}

export async function recordParticipation(
  ctx: MutationCtx,
  owner: string,
  challengeId: Id<"challenges">,
) {
  const progress = await ctx.db
    .query("rewardProgress")
    .withIndex("by_owner", (q) => q.eq("owner", owner))
    .unique();
  if (progress?.deleted) return;
  const existing = await ctx.db
    .query("challengeParticipations")
    .withIndex("by_owner_challenge", (q) =>
      q.eq("owner", owner).eq("challengeId", challengeId),
    )
    .unique();
  if (existing) return;
  await ctx.db.insert("challengeParticipations", { owner, challengeId });
  const count = (progress?.count ?? 0) + 1;
  if (progress) await ctx.db.patch(progress._id, { count });
  else await ctx.db.insert("rewardProgress", { owner, count });
  for (const ring of RINGS)
    if (count >= ring.threshold) await unlock(ctx, owner, ring.id);
}

export async function markRewardsDeleted(ctx: MutationCtx, owner: string) {
  const progress = await ctx.db
    .query("rewardProgress")
    .withIndex("by_owner", (q) => q.eq("owner", owner))
    .unique();
  // Retain only an account tombstone so delayed jobs cannot recreate rewards.
  if (progress) await ctx.db.patch(progress._id, { deleted: true, count: 0 });
  else
    await ctx.db.insert("rewardProgress", { owner, deleted: true, count: 0 });
  const rewards = await ctx.db
    .query("avatarRewards")
    .withIndex("by_owner_key", (q) => q.eq("owner", owner))
    .collect();
  for (const reward of rewards) await ctx.db.delete(reward._id);
}

/** Every ranking input is immutable after rewardAt, even when settlement is late. */
export async function settleBatch(
  ctx: MutationCtx,
  challengeId: Id<"challenges">,
) {
  const challenge = await ctx.db.get(challengeId);
  if (
    !challenge?.rewardAt ||
    Date.now() < challenge.rewardAt ||
    challenge.rewardStatus === "complete"
  )
    return true;
  const page = await ctx.db
    .query("publications")
    .withIndex("by_challenge_rewards", (q) =>
      q
        .eq("challengeId", challengeId)
        .eq("rewardEligible", true)
        .gt("rewardScore", 0),
    )
    .order("desc")
    .paginate({ numItems: 100, cursor: challenge.rewardCursor ?? null });
  let processed = challenge.rewardProcessed ?? 0;
  let score = challenge.rewardLastScore;
  let rank = challenge.rewardLastRank ?? 0;
  let finished = page.isDone;
  for (const entry of page.page) {
    if (entry.rewardScore !== score) rank = processed + 1;
    if (rank > 3) {
      finished = true;
      break;
    }
    score = entry.rewardScore!;
    processed++;
    const progress = await ctx.db
      .query("rewardProgress")
      .withIndex("by_owner", (q) => q.eq("owner", entry.owner))
      .unique();
    const existing = await ctx.db
      .query("challengeAwards")
      .withIndex("by_publication", (q) => q.eq("publicationId", entry._id))
      .unique();
    if (!existing)
      await ctx.db.insert("challengeAwards", {
        challengeId,
        publicationId: entry._id,
        rank,
        score,
        ...(progress?.deleted ? {} : { owner: entry.owner }),
      });
    if (!progress?.deleted)
      await unlock(ctx, entry.owner, CROWNS[rank - 1].id, challengeId);
  }
  await ctx.db.patch(challengeId, {
    rewardStatus: finished ? "complete" : "processing",
    rewardCursor: page.continueCursor,
    rewardProcessed: processed,
    rewardLastScore: score,
    rewardLastRank: rank,
  });
  return finished;
}
