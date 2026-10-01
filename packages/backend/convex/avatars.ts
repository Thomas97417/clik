import { ConvexError, v } from "convex/values";
import { isAvatarSeed } from "@clik/avatars";
import { mutation } from "./_generated/server";
import { authComponent } from "./auth";

export const save = mutation({
  args: { seed: v.string(), version: v.literal(1) },
  handler: async (ctx, avatar) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new ConvexError("Connexion requise.");
    if (!isAvatarSeed(avatar.seed))
      throw new ConvexError("Cet avatar est invalide.");
    const stored = await ctx.db
      .query("userAvatars")
      .withIndex("by_owner", (q) => q.eq("owner", user._id))
      .unique();
    if (stored) await ctx.db.patch(stored._id, avatar);
    else await ctx.db.insert("userAvatars", { owner: user._id, ...avatar });
    return avatar;
  },
});
