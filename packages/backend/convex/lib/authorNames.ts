import { authComponent } from "../auth";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/** Resolve current display names while preserving stored version attribution. */
export async function readAuthorName(
  ctx: QueryCtx | MutationCtx,
  owner: string,
): Promise<string | undefined> {
  if (!owner || owner.length > 128) return undefined;
  try {
    const account = await authComponent.getAnyUserById(ctx, owner);
    if (!account || typeof account.name !== "string") return undefined;
    return account.name.trim() || "Créateur Clik";
  } catch (error) {
    // Legacy identities can contain an invalid Better Auth document ID.
    if (
      /invalid.*(?:id|document)|(?:id|document).*invalid/i.test(String(error))
    )
      return undefined;
    throw error;
  }
}

export async function readAuthorNames(ctx: QueryCtx, owners: string[]) {
  return new Map(
    await Promise.all(
      [...new Set(owners)].map(
        async (owner) => [owner, await readAuthorName(ctx, owner)] as const,
      ),
    ),
  );
}
