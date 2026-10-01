import { ConvexError, v } from "convex/values";
import { defaultAvatar, isAvatarSeed } from "@clik/avatars";
import { mutation } from "./_generated/server";
import { authComponent } from "./auth";
import { crownId, ringId } from "./schema";
import { readAvatar } from "./lib/avatars";

export const save = mutation({
  args: {
    seed: v.optional(v.string()),
    version: v.optional(v.literal(1)),
    crown: v.optional(v.union(crownId, v.null())),
    ring: v.optional(v.union(ringId, v.null())),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new ConvexError("Connexion requise.");
    if (
      (args.seed === undefined) !== (args.version === undefined) ||
      (args.seed !== undefined && !isAvatarSeed(args.seed))
    )
      throw new ConvexError("Cet avatar est invalide.");
    for (const key of [args.crown, args.ring]) {
      if (!key) continue;
      const reward = await ctx.db
        .query("avatarRewards")
        .withIndex("by_owner_key", (q) =>
          q.eq("owner", user._id).eq("key", key),
        )
        .unique();
      if (!reward)
        throw new ConvexError("Cette récompense n’est pas encore débloquée.");
    }
    const stored = await ctx.db
      .query("userAvatars")
      .withIndex("by_owner", (q) => q.eq("owner", user._id))
      .unique();
    const patch = {
      ...(args.seed !== undefined
        ? { seed: args.seed, version: args.version! }
        : {}),
      ...(args.crown !== undefined ? { crown: args.crown ?? undefined } : {}),
      ...(args.ring !== undefined ? { ring: args.ring ?? undefined } : {}),
    };
    if (stored) await ctx.db.patch(stored._id, patch);
    else
      await ctx.db.insert("userAvatars", {
        owner: user._id,
        ...defaultAvatar(user._id),
        ...patch,
      });
    return readAvatar(ctx, user._id);
  },
});
