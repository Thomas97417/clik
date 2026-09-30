import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export const origin = v.object({
  publicationId: v.id("publications"),
  versionId: v.id("versions"),
  author: v.string(),
  title: v.string(),
});
export const stockItem = v.object({ type: v.string(), quantity: v.number() });
export default defineSchema({
  challenges: defineTable({
    day: v.string(),
    opensAt: v.number(),
    closesAt: v.number(),
    generatorVersion: v.number(),
    stock: v.array(stockItem),
  }).index("by_day", ["day"]),
  challengeVotes: defineTable({
    owner: v.string(),
    challengeId: v.id("challenges"),
    choices: v.array(
      v.object({ publicationId: v.id("publications"), epoch: v.number() }),
    ),
  }).index("by_owner_challenge", ["owner", "challengeId"]),
  comments: defineTable({
    publicationId: v.id("publications"),
    owner: v.string(),
    author: v.string(),
    body: v.string(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index("by_publication", ["publicationId", "createdAt"]),
  projects: defineTable({
    owner: v.string(),
    title: v.string(),
    scene: v.string(),
    challengeId: v.optional(v.id("challenges")),
    revision: v.number(),
    updatedAt: v.number(),
    origin: v.optional(origin),
  })
    .index("by_owner", ["owner", "updatedAt"])
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
    rankTie: v.optional(v.number()),
    voteEpoch: v.optional(v.number()),
    commentCount: v.optional(v.number()),
    publishedAt: v.number(),
    versionId: v.optional(v.id("versions")),
    thumbnail: v.id("_storage"),
    origin: v.optional(origin),
  })
    .index("by_recent", ["active", "publishedAt"])
    .index("by_project", ["projectId"])
    .index("by_challenge_recent", ["challengeId", "active", "submittedAt"])
    .index("by_challenge_votes", [
      "challengeId",
      "active",
      "voteCount",
      "rankTie",
    ])
    .index("by_owner_challenge", ["owner", "challengeId"]),
  versions: defineTable({
    publicationId: v.id("publications"),
    scene: v.string(),
    title: v.string(),
    description: v.string(),
    author: v.string(),
    thumbnail: v.id("_storage"),
    createdAt: v.number(),
    origin: v.optional(origin),
  }),
  thumbnails: defineTable({
    owner: v.string(),
    projectId: v.id("projects"),
    storageId: v.id("_storage"),
  }).index("by_storage", ["storageId"]),
});
