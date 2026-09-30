import { v, ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import {
  query,
  mutation,
  internalMutation,
  action,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { authComponent } from "./auth";
import {
  validateScene,
  validateChallengeStock,
  inherited,
  type ChallengeStock,
} from "@clik/scene";
import { assertOpen } from "./challenges";
async function user(ctx: QueryCtx | MutationCtx) {
  const u = await authComponent.safeGetAuthUser(ctx);
  if (!u) throw new ConvexError("Connexion requise.");
  return u;
}
export async function owned(ctx: QueryCtx | MutationCtx, id: Id<"projects">) {
  const u = await user(ctx),
    p = await ctx.db.get(id);
  if (!p || p.owner !== u._id) throw new ConvexError("Projet introuvable.");
  return p;
}
function title(value: string) {
  const s = value.trim();
  if (!s || s.length > 100)
    throw new ConvexError("Le titre doit contenir entre 1 et 100 caractères.");
  return s;
}
function scene(value: string) {
  return JSON.stringify(validateScene(JSON.parse(value)));
}
export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, a) => {
    const u = await user(ctx);
    // 12 × 512 KiB stays comfortably below the transaction read limit.
    const result = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("owner", u._id))
      .order("desc")
      .paginate({
        ...a.paginationOpts,
        numItems: Math.min(12, a.paginationOpts.numItems),
      });
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (p) => {
          const publication = await ctx.db
            .query("publications")
            .withIndex("by_project", (q) => q.eq("projectId", p._id))
            .unique();
          return {
            _id: p._id,
            title: p.title,
            scene: p.scene,
            revision: p.revision,
            updatedAt: p.updatedAt,
            origin: p.origin,
            challenge: p.challengeId ? await ctx.db.get(p.challengeId) : null,
            publicationId: publication?.active ? publication._id : null,
          };
        }),
      ),
    };
  },
});
export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, { id }) => {
    const p = await owned(ctx, id);
    const publication = await ctx.db
      .query("publications")
      .withIndex("by_project", (q) => q.eq("projectId", id))
      .unique();
    return {
      ...p,
      challenge: p.challengeId ? await ctx.db.get(p.challengeId) : null,
      publicationId: publication?.active ? publication._id : null,
      serverNow: Date.now(),
    };
  },
});
export const create = mutation({
  args: { title: v.string(), scene: v.string() },
  handler: async (ctx, a) => {
    const u = await user(ctx);
    return ctx.db.insert("projects", {
      owner: u._id,
      title: title(a.title),
      scene: scene(a.scene),
      revision: 0,
      updatedAt: Date.now(),
    });
  },
});
export const save = mutation({
  args: {
    id: v.id("projects"),
    title: v.string(),
    scene: v.string(),
    revision: v.number(),
  },
  handler: async (ctx, a) => {
    const p = await owned(ctx, a.id);
    if (p.revision !== a.revision)
      throw new ConvexError({
        code: "CONFLICT",
        message: "Ce projet a été modifié dans un autre onglet.",
      });
    if (p.challengeId) {
      const challenge = await ctx.db.get(p.challengeId);
      if (!challenge) throw new ConvexError("Défi introuvable.");
      validateChallengeStock(
        validateScene(JSON.parse(a.scene)),
        challenge.stock as ChallengeStock,
      );
    }
    await ctx.db.patch(a.id, {
      title: title(a.title),
      scene: scene(a.scene),
      revision: p.revision + 1,
      updatedAt: Date.now(),
    });
    return p.revision + 1;
  },
});
export const registerThumbnail = internalMutation({
  args: { projectId: v.id("projects"), storageId: v.id("_storage") },
  handler: async (ctx, a) => {
    const p = await owned(ctx, a.projectId);
    await ctx.db.insert("thumbnails", { owner: p.owner, ...a });
    return a.storageId;
  },
});
export const uploadThumbnail = action({
  args: { projectId: v.id("projects"), bytes: v.bytes() },
  handler: async (ctx, a): Promise<Id<"_storage">> => {
    await ctx.runQuery(api.projects.get, { id: a.projectId });
    const bytes = new Uint8Array(a.bytes);
    if (
      bytes.length > 512 * 1024 ||
      bytes.length < 24 ||
      ![137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b)
    )
      throw new ConvexError("Miniature PNG invalide (512 Kio maximum).");
    const view = new DataView(a.bytes);
    if (view.getUint32(16) > 1600 || view.getUint32(20) > 1600)
      throw new ConvexError("Miniature trop grande.");
    const storageId = await ctx.storage.store(
      new Blob([a.bytes], { type: "image/png" }),
    );
    try {
      return await ctx.runMutation(internal.projects.registerThumbnail, {
        projectId: a.projectId,
        storageId,
      });
    } catch (e) {
      await ctx.storage.delete(storageId);
      throw e;
    }
  },
});
export const publish = mutation({
  args: {
    id: v.id("projects"),
    title: v.string(),
    description: v.string(),
    thumbnail: v.id("_storage"),
    revision: v.number(),
  },
  handler: async (ctx, a) => {
    const p = await owned(ctx, a.id),
      u = await user(ctx);
    if (p.challengeId) {
      const challenge = await ctx.db.get(p.challengeId);
      assertOpen(challenge);
      const document = validateChallengeStock(
        validateScene(JSON.parse(p.scene)),
        challenge!.stock as ChallengeStock,
      );
      if (
        !document.nodes.some(
          (n) => n.kind === "part" && !inherited(document, n.id, "hidden"),
        )
      )
        throw new ConvexError(
          "Ajoutez au moins une pièce visible avant de participer.",
        );
      const other = await ctx.db
        .query("publications")
        .withIndex("by_owner_challenge", (q) =>
          q.eq("owner", p.owner).eq("challengeId", p.challengeId),
        )
        .unique();
      if (other && other.projectId !== p._id)
        throw new ConvexError("Vous avez déjà une participation à ce défi.");
    }
    if (p.revision !== a.revision)
      throw new ConvexError(
        "La création a changé. Enregistrez puis réessayez.",
      );
    const thumb = await ctx.db
      .query("thumbnails")
      .withIndex("by_storage", (q) => q.eq("storageId", a.thumbnail))
      .unique();
    if (!thumb || thumb.owner !== p.owner || thumb.projectId !== p._id)
      throw new ConvexError("Miniature non autorisée.");
    if (a.description.length > 2000)
      throw new ConvexError("Description trop longue.");
    const existing = await ctx.db
      .query("publications")
      .withIndex("by_project", (q) => q.eq("projectId", p._id))
      .unique();
    const data = {
      owner: p.owner,
      projectId: p._id,
      title: title(a.title),
      description: a.description,
      author: u.name || "Créateur Clik",
      active: true,
      publishedAt: Date.now(),
      ...(p.challengeId
        ? {
            challengeId: p.challengeId,
            submittedAt: existing?.submittedAt ?? Date.now(),
            rankTie: existing?.rankTie ?? -Date.now(),
            updatedAt: Date.now(),
            voteCount: existing?.voteCount ?? 0,
            voteEpoch: existing?.voteEpoch ?? 0,
          }
        : {}),
      thumbnail: a.thumbnail,
      ...(p.origin ? { origin: p.origin } : {}),
    };
    const id = existing
      ? existing._id
      : await ctx.db.insert("publications", data);
    const versionId = await ctx.db.insert("versions", {
      publicationId: id,
      scene: p.scene,
      title: data.title,
      description: data.description,
      author: data.author,
      thumbnail: a.thumbnail,
      createdAt: data.publishedAt,
      ...(p.origin ? { origin: p.origin } : {}),
    });
    await ctx.db.patch(id, { ...data, versionId });
    return id;
  },
});
export const withdraw = mutation({
  args: { id: v.id("publications") },
  handler: async (ctx, { id }) => {
    const u = await user(ctx),
      p = await ctx.db.get(id);
    if (!p || p.owner !== u._id)
      throw new ConvexError("Publication introuvable.");
    await ctx.db.patch(id, {
      active: false,
      ...(p.challengeId
        ? { voteCount: 0, voteEpoch: (p.voteEpoch ?? 0) + 1 }
        : {}),
    });
  },
});
export const gallery = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, a) => {
    const results = await ctx.db
      .query("publications")
      .withIndex("by_recent", (q) => q.eq("active", true))
      .order("desc")
      .paginate({
        ...a.paginationOpts,
        numItems: Math.min(24, a.paginationOpts.numItems),
      });
    return {
      ...results,
      page: await Promise.all(
        results.page.map(async (p) => ({
          _id: p._id,
          title: p.title,
          author: p.author,
          publishedAt: p.publishedAt,
          challenge: p.challengeId ? await ctx.db.get(p.challengeId) : null,
          commentCount: p.commentCount ?? 0,
          thumbnailUrl: await ctx.storage.getUrl(p.thumbnail),
        })),
      ),
    };
  },
});
export const creation = query({
  args: { id: v.id("publications"), versionId: v.optional(v.id("versions")) },
  handler: async (ctx, a) => {
    const p = await ctx.db.get(a.id);
    if (!p?.active) return null;
    const version = await ctx.db.get(a.versionId ?? p.versionId!);
    if (!version || version.publicationId !== p._id) return null;
    return {
      ...version,
      owner: p.owner,
      challenge: p.challengeId ? await ctx.db.get(p.challengeId) : null,
      voteCount: p.voteCount ?? 0,
      commentCount: p.commentCount ?? 0,
      updatedAt: p.updatedAt,
      submittedAt: p.submittedAt,
      thumbnailUrl: await ctx.storage.getUrl(version.thumbnail),
    };
  },
});
export const remix = mutation({
  args: { id: v.id("publications"), versionId: v.id("versions") },
  handler: async (ctx, a) => {
    const u = await user(ctx),
      p = await ctx.db.get(a.id),
      version = await ctx.db.get(a.versionId);
    if (!p?.active || !version || version.publicationId !== p._id)
      throw new ConvexError("Cette version est indisponible.");
    return ctx.db.insert("projects", {
      owner: u._id,
      title: title(`${version.title.slice(0, 85)} · reprise`),
      scene: version.scene,
      revision: 0,
      updatedAt: Date.now(),
      origin: {
        publicationId: p._id,
        versionId: version._id,
        author: version.author,
        title: version.title,
      },
    });
  },
});
