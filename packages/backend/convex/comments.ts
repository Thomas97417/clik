import { readAvatars } from "./lib/avatars";
import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query, mutation } from "./_generated/server";
import { requireUser } from "./challenges";
function body(value: string) {
  const text = value.trim();
  if (!text || text.length > 1000)
    throw new ConvexError(
      "Un commentaire doit contenir entre 1 et 1 000 caractères.",
    );
  return text;
}
export const list = query({
  args: {
    publicationId: v.id("publications"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const p = await ctx.db.get(args.publicationId);
    if (!p?.active) return { page: [], isDone: true, continueCursor: "" };
    const results = await ctx.db
      .query("comments")
      .withIndex("by_publication", (q) => q.eq("publicationId", p._id))
      .order("desc")
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(20, args.paginationOpts.numItems),
      });
    const avatars = await readAvatars(
      ctx,
      results.page.map((c) => c.owner),
    );
    return {
      ...results,
      page: results.page.map((c) => ({ ...c, avatar: avatars.get(c.owner)! })),
    };
  },
});
export const add = mutation({
  args: { publicationId: v.id("publications"), body: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx),
      p = await ctx.db.get(args.publicationId);
    if (!p?.active) throw new ConvexError("Création indisponible.");
    const id = await ctx.db.insert("comments", {
      publicationId: p._id,
      owner: me._id,
      author: me.name || "Créateur Clik",
      body: body(args.body),
      createdAt: Date.now(),
    });
    await ctx.db.patch(p._id, { commentCount: (p.commentCount ?? 0) + 1 });
    return id;
  },
});
export const edit = mutation({
  args: { id: v.id("comments"), body: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx),
      c = await ctx.db.get(args.id);
    if (
      !c ||
      c.owner !== me._id ||
      !(await ctx.db.get(c.publicationId))?.active
    )
      throw new ConvexError("Commentaire indisponible.");
    await ctx.db.patch(c._id, { body: body(args.body), updatedAt: Date.now() });
  },
});
export const remove = mutation({
  args: { id: v.id("comments") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx),
      c = await ctx.db.get(args.id);
    if (!c || c.owner !== me._id)
      throw new ConvexError("Commentaire indisponible.");
    const p = await ctx.db.get(c.publicationId);
    if (!p?.active) throw new ConvexError("Création indisponible.");
    await ctx.db.delete(c._id);
    await ctx.db.patch(p._id, {
      commentCount: Math.max(0, (p.commentCount ?? 0) - 1),
    });
  },
});
