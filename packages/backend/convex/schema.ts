import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export const origin = v.object({
  publicationId: v.id("publications"),
  versionId: v.id("versions"),
  author: v.string(),
  title: v.string(),
});
export default defineSchema({
  projects: defineTable({
    owner: v.string(),
    title: v.string(),
    scene: v.string(),
    revision: v.number(),
    updatedAt: v.number(),
    origin: v.optional(origin),
  }).index("by_owner", ["owner", "updatedAt"]),
  publications: defineTable({
    owner: v.string(),
    projectId: v.id("projects"),
    title: v.string(),
    description: v.string(),
    author: v.string(),
    active: v.boolean(),
    publishedAt: v.number(),
    versionId: v.optional(v.id("versions")),
    thumbnail: v.id("_storage"),
    origin: v.optional(origin),
  })
    .index("by_recent", ["active", "publishedAt"])
    .index("by_project", ["projectId"]),
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
