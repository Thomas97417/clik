import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { RouteSessionCache } from "./auth-session";

export const authClient = createAuthClient({
  plugins: [convexClient()],
});

export function observeRouteSession(cache: RouteSessionCache) {
  const { session, $sessionSignal } = authClient.$store.atoms;
  let sessionId: string | null | undefined;
  const update = (state: ReturnType<typeof session.get>) => {
    if (state.isPending || state.isRefetching || state.error) return;
    const nextId = state.data?.session.id ?? null;
    if (sessionId !== undefined && nextId !== sessionId) cache.invalidate();
    sessionId = nextId;
    const expiresAt = state.data?.session.expiresAt;
    cache.reconcile(
      nextId,
      expiresAt ? new Date(expiresAt).getTime() : Infinity,
    );
  };
  // Better Auth emits this signal for auth actions and changes in another tab.
  const stopSignal = $sessionSignal.listen(() => cache.invalidate());
  const stopSession = session.listen(update);
  update(session.get());
  return () => {
    stopSignal();
    stopSession();
  };
}
