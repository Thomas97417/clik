import { activateRewards } from "./lib/rewards";
import { internal } from "./_generated/api";
import { readAvatars } from "./lib/avatars";
import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import {
  query,
  mutation,
  internalMutation,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { authComponent } from "./auth";
import {
  challengeDay,
  challengeStart,
  challengeStock,
  CHALLENGE_DAY_MS,
  emptyScene,
} from "@clik/scene";

export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) throw new ConvexError("Connexion requise.");
  return user;
}
async function ensure(ctx: MutationCtx) {
  const config = await activateRewards(ctx);
  const day = challengeDay();
  const existing = await ctx.db
    .query("challenges")
    .withIndex("by_day", (q) => q.eq("day", day))
    .unique();
  if (existing) return existing._id;
  const opensAt = challengeStart(day);
  const challengeId = await ctx.db.insert("challenges", {
    day,
    opensAt,
    closesAt: opensAt + CHALLENGE_DAY_MS,
    generatorVersion: 1,
    stock: challengeStock(day),
    ...(day >= config.firstDay
      ? {
          rewardAt: opensAt + 2 * CHALLENGE_DAY_MS,
          rewardStatus: "pending" as const,
        }
      : {}),
  });
  if (day >= config.firstDay)
    await ctx.scheduler.runAt(
      opensAt + 2 * CHALLENGE_DAY_MS,
      internal.rewards.settle,
      { challengeId },
    );
  return challengeId;
}
export const ensureToday = mutation({ args: {}, handler: ensure });
export const createToday = internalMutation({ args: {}, handler: ensure });
export function assertOpen(challenge: Doc<"challenges"> | null) {
  if (
    !challenge ||
    Date.now() < challenge.opensAt ||
    Date.now() >= challenge.closesAt
  )
    throw new ConvexError(
      "Les participations à ce défi sont closes. Votre travail privé est conservé.",
    );
}
export async function activeChoices(
  ctx: QueryCtx | MutationCtx,
  choices: Doc<"challengeVotes">["choices"],
) {
  const valid: typeof choices = [];
  for (const choice of choices) {
    const entry = await ctx.db.get(choice.publicationId);
    if (entry?.active && (entry.voteEpoch ?? 0) === choice.epoch)
      valid.push(choice);
  }
  return valid;
}
export const day = query({
  args: { day: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const key = args.day ?? challengeDay();
    challengeStart(key);
    const challenge = await ctx.db
      .query("challenges")
      .withIndex("by_day", (q) => q.eq("day", key))
      .unique();
    const first = await ctx.db
      .query("challenges")
      .withIndex("by_day")
      .order("asc")
      .first();
    const me = await authComponent.safeGetAuthUser(ctx);
    const project =
      challenge && me
        ? await ctx.db
            .query("projects")
            .withIndex("by_owner_challenge", (q) =>
              q.eq("owner", me._id).eq("challengeId", challenge._id),
            )
            .unique()
        : null;
    const votes =
      challenge && me
        ? await ctx.db
            .query("challengeVotes")
            .withIndex("by_owner_challenge", (q) =>
              q.eq("owner", me._id).eq("challengeId", challenge._id),
            )
            .unique()
        : null;
    return {
      challenge,
      firstDay: first?.day ?? challengeDay(),
      today: challengeDay(),
      serverNow: Date.now(),
      projectId: project?._id ?? null,
      choices: await activeChoices(ctx, votes?.choices ?? []),
    };
  },
});
export const start = mutation({
  args: { day: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    if (args.day !== challengeDay())
      throw new ConvexError(
        "Seul le défi du jour est ouvert aux participations.",
      );
    const challengeId = await ensure(ctx);
    const challenge = await ctx.db.get(challengeId);
    assertOpen(challenge);
    const existing = await ctx.db
      .query("projects")
      .withIndex("by_owner_challenge", (q) =>
        q.eq("owner", me._id).eq("challengeId", challengeId),
      )
      .unique();
    return (
      existing?._id ??
      ctx.db.insert("projects", {
        owner: me._id,
        title: `Mon défi du ${args.day}`,
        scene: JSON.stringify(emptyScene()),
        revision: 0,
        updatedAt: Date.now(),
        challengeId,
      })
    );
  },
});
export const entries = query({
  args: {
    challengeId: v.id("challenges"),
    sort: v.union(v.literal("recent"), v.literal("votes")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const results =
      args.sort === "votes"
        ? await ctx.db
            .query("publications")
            .withIndex("by_challenge_votes", (q) =>
              q.eq("challengeId", args.challengeId).eq("active", true),
            )
            .order("desc")
            .paginate({
              ...args.paginationOpts,
              numItems: Math.min(24, args.paginationOpts.numItems),
            })
        : await ctx.db
            .query("publications")
            .withIndex("by_challenge_recent", (q) =>
              q.eq("challengeId", args.challengeId).eq("active", true),
            )
            .order("desc")
            .paginate({
              ...args.paginationOpts,
              numItems: Math.min(24, args.paginationOpts.numItems),
            });
    const avatars = await readAvatars(
      ctx,
      results.page.map((p) => p.owner),
    );
    return {
      ...results,
      page: await Promise.all(
        results.page.map(async (p) => ({
          _id: p._id,
          owner: p.owner,
          title: p.title,
          author: p.author,
          avatar: avatars.get(p.owner)!,
          voteCount: p.voteCount ?? 0,
          commentCount: p.commentCount ?? 0,
          updatedAt: p.updatedAt,
          thumbnailUrl: await ctx.storage.getUrl(p.thumbnail),
        })),
      ),
    };
  },
});
/** Desired state instead of a toggle makes retries and double clicks idempotent. */
export const vote = mutation({
  args: { publicationId: v.id("publications"), voted: v.boolean() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx),
      entry = await ctx.db.get(args.publicationId);
    if (!entry?.active || !entry.challengeId)
      throw new ConvexError("Participation indisponible.");
    if (entry.owner === me._id)
      throw new ConvexError(
        "Vous ne pouvez pas voter pour votre propre création.",
      );
    const record = await ctx.db
      .query("challengeVotes")
      .withIndex("by_owner_challenge", (q) =>
        q.eq("owner", me._id).eq("challengeId", entry.challengeId!),
      )
      .unique();
    let choices = await activeChoices(ctx, record?.choices ?? []);
    const had = choices.some((c) => c.publicationId === entry._id);
    if (had === args.voted) return;
    if (args.voted && choices.length >= 3)
      throw new ConvexError(
        "Vos trois votes sont attribués pour ce défi. Retirez-en un pour changer de choix.",
      );
    choices = args.voted
      ? [...choices, { publicationId: entry._id, epoch: entry.voteEpoch ?? 0 }]
      : choices.filter((c) => c.publicationId !== entry._id);
    if (record) await ctx.db.patch(record._id, { choices });
    else
      await ctx.db.insert("challengeVotes", {
        owner: me._id,
        challengeId: entry.challengeId,
        choices,
      });
    const challenge = await ctx.db.get(entry.challengeId);
    await ctx.db.patch(entry._id, {
      ...(challenge?.rewardAt && Date.now() < challenge.rewardAt
        ? {
            rewardScore: Math.max(
              0,
              (entry.rewardScore ?? 0) + (args.voted ? 1 : -1),
            ),
          }
        : {}),
      voteCount: Math.max(0, (entry.voteCount ?? 0) + (args.voted ? 1 : -1)),
    });
  },
});
