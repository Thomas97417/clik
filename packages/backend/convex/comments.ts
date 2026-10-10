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
      .withIndex("by_publication_thread", (q) =>
        q.eq("publicationId", p._id).eq("threadId", undefined),
      )
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
export const replies = query({
  args: {
    threadId: v.id("comments"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (
      !thread ||
      thread.threadId !== undefined ||
      !(await ctx.db.get(thread.publicationId))?.active
    )
      return { page: [], isDone: true, continueCursor: "" };
    // Select the latest replies first; the UI displays each loaded conversation
    // chronologically, so a newly sent reply is visible without loading old pages.
    const results = await ctx.db
      .query("comments")
      .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
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
      page: await Promise.all(
        results.page.map(async (c) => {
          const target = c.replyToId ? await ctx.db.get(c.replyToId) : null;
          return {
            ...c,
            avatar: avatars.get(c.owner)!,
            replyTo:
              target && target.deletedAt === undefined
                ? { _id: target._id, author: target.author }
                : null,
          };
        }),
      ),
    };
  },
});
export const add = mutation({
  args: {
    publicationId: v.id("publications"),
    body: v.string(),
    replyToId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx),
      p = await ctx.db.get(args.publicationId);
    if (!p?.active) throw new ConvexError("Création indisponible.");
    const target = args.replyToId ? await ctx.db.get(args.replyToId) : null;
    if (args.replyToId && (!target || target.publicationId !== p._id))
      throw new ConvexError(
        "Le commentaire auquel vous répondez n’est plus disponible.",
      );
    const thread = target?.threadId
      ? await ctx.db.get(target.threadId)
      : target;
    if (
      target &&
      (!thread ||
        thread.threadId !== undefined ||
        thread.publicationId !== p._id)
    )
      throw new ConvexError("Cette discussion n’est plus disponible.");
    const id = await ctx.db.insert("comments", {
      publicationId: p._id,
      ...(thread && target
        ? { threadId: thread._id, replyToId: target._id }
        : {}),
      owner: me._id,
      author: me.name || "Créateur Clik",
      body: body(args.body),
      createdAt: Date.now(),
    });
    if (thread)
      await ctx.db.patch(thread._id, {
        replyCount: (thread.replyCount ?? 0) + 1,
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
      c.deletedAt !== undefined ||
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
    if (!c || c.deletedAt !== undefined || c.owner !== me._id)
      throw new ConvexError("Commentaire indisponible.");
    const p = await ctx.db.get(c.publicationId);
    if (!p?.active) throw new ConvexError("Création indisponible.");
    if (!c.threadId && (c.replyCount ?? 0) > 0) {
      // Removing one's message must not remove other people's replies.
      await ctx.db.patch(c._id, { body: "", deletedAt: Date.now() });
    } else {
      await ctx.db.delete(c._id);
      if (c.threadId) {
        const thread = await ctx.db.get(c.threadId);
        if (thread) {
          const replyCount = Math.max(0, (thread.replyCount ?? 0) - 1);
          if (!replyCount && thread.deletedAt !== undefined)
            await ctx.db.delete(thread._id);
          else await ctx.db.patch(thread._id, { replyCount });
        }
      }
    }
    await ctx.db.patch(p._id, {
      commentCount: Math.max(0, (p.commentCount ?? 0) - 1),
    });
  },
});
