import { defaultAvatar, type AvatarDescriptor } from "@clik/avatars";
import type { QueryCtx, MutationCtx } from "../_generated/server";

export async function readAvatar(
  ctx: Pick<QueryCtx, "db">,
  owner: string,
): Promise<AvatarDescriptor> {
  const stored = await ctx.db
    .query("userAvatars")
    .withIndex("by_owner", (q) => q.eq("owner", owner))
    .unique();
  return stored
    ? {
        seed: stored.seed,
        version: stored.version,
        ...(stored.crown ? { crown: stored.crown } : {}),
        ...(stored.ring ? { ring: stored.ring } : {}),
      }
    : defaultAvatar(owner);
}

export async function readAvatars(ctx: Pick<QueryCtx, "db">, owners: string[]) {
  return new Map(
    await Promise.all(
      [...new Set(owners)].map(
        async (owner) => [owner, await readAvatar(ctx, owner)] as const,
      ),
    ),
  );
}

export async function deleteAvatar(
  ctx: Pick<MutationCtx, "db">,
  owner: string,
) {
  const stored = await ctx.db
    .query("userAvatars")
    .withIndex("by_owner", (q) => q.eq("owner", owner))
    .unique();
  if (stored) await ctx.db.delete(stored._id);
}
