import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export const crownId = v.union(
  v.literal("gold"),
  v.literal("silver"),
  v.literal("bronze"),
);
export const ringId = v.union(
  v.literal("participation-1"),
  v.literal("participation-5"),
  v.literal("participation-10"),
  v.literal("participation-25"),
  v.literal("participation-50"),
);
export const origin = v.object({
  publicationId: v.id("publications"),
  versionId: v.id("versions"),
  author: v.string(),
  title: v.string(),
});
export const stockItem = v.object({ type: v.string(), quantity: v.number() });
export const importInput = v.object({
  id: v.string(),
  title: v.string(),
  receiptIds: v.array(v.id("importReceipts")),
});
export const projectImport = v.object({
  id: v.string(),
  title: v.string(),
  receiptIds: v.array(v.id("importReceipts")),
  sources: v.array(origin),
});
export default defineSchema({
  importReceipts: defineTable({
    owner: v.string(),
    title: v.string(),
    sources: v.array(origin),
    origin: v.optional(origin),
    createdAt: v.number(),
  }).index("by_owner", ["owner"]),
  lineageMigration: defineTable({
    key: v.literal("v1"),
    phase: v.union(
      v.literal("projects"),
      v.literal("publications"),
      v.literal("complete"),
    ),
    cursor: v.optional(v.string()),
  }).index("by_key", ["key"]),
  publicationSources: defineTable({
    sourceId: v.id("publications"),
    publicationId: v.id("publications"),
    kind: v.union(v.literal("remix"), v.literal("assembly")),
    active: v.boolean(),
    publishedAt: v.number(),
  })
    .index("by_source_recent", ["sourceId", "active", "publishedAt"])
    .index("by_publication", ["publicationId"]),
  rewardConfig: defineTable({
    key: v.literal("v1"),
    firstDay: v.string(),
    activatedAt: v.number(),
    historyCursor: v.optional(v.string()),
    historyDone: v.boolean(),
  }).index("by_key", ["key"]),
  rewardProgress: defineTable({
    owner: v.string(),
    count: v.number(),
    deleted: v.optional(v.boolean()),
  }).index("by_owner", ["owner"]),
  challengeParticipations: defineTable({
    owner: v.string(),
    challengeId: v.id("challenges"),
  }).index("by_owner_challenge", ["owner", "challengeId"]),
  avatarRewards: defineTable({
    owner: v.string(),
    key: v.string(),
    earnedAt: v.number(),
    challengeId: v.optional(v.id("challenges")),
  }).index("by_owner_key", ["owner", "key"]),
  challengeAwards: defineTable({
    challengeId: v.id("challenges"),
    publicationId: v.id("publications"),
    owner: v.optional(v.string()),
    rank: v.number(),
    score: v.number(),
  })
    .index("by_challenge_rank", ["challengeId", "rank"])
    .index("by_publication", ["publicationId"])
    .index("by_owner", ["owner"]),
  userAvatars: defineTable({
    owner: v.string(),
    seed: v.string(),
    version: v.literal(1),
    crown: v.optional(crownId),
    ring: v.optional(ringId),
  }).index("by_owner", ["owner"]),
  challenges: defineTable({
    day: v.string(),
    opensAt: v.number(),
    closesAt: v.number(),
    generatorVersion: v.number(),
    stock: v.array(stockItem),
    rewardAt: v.optional(v.number()),
    rewardStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("complete"),
      ),
    ),
    rewardCursor: v.optional(v.string()),
    rewardProcessed: v.optional(v.number()),
    rewardLastScore: v.optional(v.number()),
    rewardLastRank: v.optional(v.number()),
  })
    .index("by_day", ["day"])
    .index("by_reward_status", ["rewardStatus", "rewardAt"]),
  challengeVotes: defineTable({
    owner: v.string(),
    challengeId: v.id("challenges"),
    choices: v.array(
      v.object({ publicationId: v.id("publications"), epoch: v.number() }),
    ),
  }).index("by_owner_challenge", ["owner", "challengeId"]),
  comments: defineTable({
    publicationId: v.id("publications"),
    threadId: v.optional(v.id("comments")),
    replyToId: v.optional(v.id("comments")),
    replyCount: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
    owner: v.string(),
    author: v.string(),
    body: v.string(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_publication", ["publicationId", "createdAt"])
    .index("by_publication_thread", ["publicationId", "threadId", "createdAt"])
    .index("by_thread", ["threadId", "createdAt"]),
  projects: defineTable({
    localSourceId: v.optional(v.string()),
    owner: v.string(),
    title: v.string(),
    scene: v.string(),
    challengeId: v.optional(v.id("challenges")),
    revision: v.number(),
    updatedAt: v.number(),
    origin: v.optional(origin),
    originReceiptId: v.optional(v.id("importReceipts")),
    imports: v.optional(v.array(projectImport)),
  })
    .index("by_owner", ["owner", "updatedAt"])
    .index("by_local_source", ["owner", "localSourceId"])
    .index("by_owner_challenge", ["owner", "challengeId"]),
  publications: defineTable({
    owner: v.string(),
    projectId: v.id("projects"),
    title: v.string(),
    description: v.string(),
    author: v.string(),
    active: v.boolean(),
    challengeId: v.optional(v.id("challenges")),
    submittedAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    voteCount: v.optional(v.number()),
    rewardScore: v.optional(v.number()),
    rewardEligible: v.optional(v.boolean()),
    rankTie: v.optional(v.number()),
    voteEpoch: v.optional(v.number()),
    commentCount: v.optional(v.number()),
    publishedAt: v.number(),
    versionId: v.optional(v.id("versions")),
    thumbnail: v.id("_storage"),
    origin: v.optional(origin),
    imports: v.optional(v.array(projectImport)),
  })
    .index("by_recent", ["active", "publishedAt"])
    .index("by_origin_recent", [
      "origin.publicationId",
      "active",
      "publishedAt",
    ])
    .index("by_owner_recent", ["owner", "active", "publishedAt"])
    .index("by_comments", ["active", "commentCount", "publishedAt"])
    .index("by_owner_comments", [
      "owner",
      "active",
      "commentCount",
      "publishedAt",
    ])
    .index("by_project", ["projectId"])
    .index("by_challenge_recent", ["challengeId", "active", "submittedAt"])
    .index("by_challenge_votes", [
      "challengeId",
      "active",
      "voteCount",
      "rankTie",
    ])
    .index("by_owner_challenge", ["owner", "challengeId"])
    .index("by_challenge_rewards", [
      "challengeId",
      "rewardEligible",
      "rewardScore",
    ]),
  versions: defineTable({
    publicationId: v.id("publications"),
    scene: v.string(),
    title: v.string(),
    description: v.string(),
    author: v.string(),
    thumbnail: v.id("_storage"),
    createdAt: v.number(),
    origin: v.optional(origin),
    imports: v.optional(v.array(projectImport)),
  }),
  thumbnails: defineTable({
    owner: v.string(),
    projectId: v.id("projects"),
    storageId: v.id("_storage"),
  }).index("by_storage", ["storageId"]),
});
