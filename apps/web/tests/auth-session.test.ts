import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RouteSessionCache } from "../src/lib/auth-session";
import { observeRouteSession } from "../src/lib/auth-client";

const stores = vi.hoisted(() => {
  function store<T>(value: T) {
    const listeners = new Set<(value: T) => void>();
    return {
      get: () => value,
      set(next: T) {
        value = next;
        listeners.forEach((listener) => listener(next));
      },
      listen(listener: (value: T) => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      listeners,
    };
  }
  return {
    $sessionSignal: store(false),
    session: store({
      data: null as {
        session: { id: string; expiresAt: Date };
      } | null,
      isPending: false,
      isRefetching: false,
      error: null,
    }),
  };
});
vi.mock("better-auth/react", () => ({
  createAuthClient: () => ({ $store: { atoms: stores } }),
}));
vi.mock("@convex-dev/better-auth/client/plugins", () => ({
  convexClient: () => ({}),
}));

function token(sessionId = "alice", expiresIn = 900) {
  const payload = btoa(
    JSON.stringify({ sessionId, exp: Date.now() / 1000 + expiresIn }),
  ).replace(/=+$/, "");
  return `header.${payload}.signature`;
}
const getToken = () =>
  vi.fn<() => Promise<string | undefined>>().mockResolvedValue(undefined);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-09T12:00:00Z"));
  stores.$sessionSignal.listeners.clear();
  stores.session.listeners.clear();
  stores.session.set({
    data: null,
    isPending: false,
    isRefetching: false,
    error: null,
  });
});
afterEach(() => vi.useRealTimers());

it.each([undefined, "authenticated"])(
  "réutilise aussi bien une session anonyme qu’authentifiée sur les sept routes publiques (%s)",
  async (identity) => {
    const cache = new RouteSessionCache();
    const jwt = identity ? token() : undefined;
    cache.prime(jwt);
    const check = getToken();
    for (const path of [
      "/",
      "/terms",
      "/privacy/",
      "/gallery/",
      "/gallery/user/alice",
      "/creations/publication-1/",
      "/challenges",
    ]) {
      expect(await cache.resolve(path, check)).toEqual({
        token: jwt,
        isAuthenticated: !!jwt,
      });
    }
    expect(check).not.toHaveBeenCalled();
  },
);

it.each([
  "/settings",
  "/editor",
  "/editor/project-1",
  "/projects",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/gallery/user/alice/private",
  "/creations/publication-1/edit",
])("vérifie la session avant de naviguer vers %s", async (path) => {
  const cache = new RouteSessionCache();
  cache.prime(token());
  const check = getToken();
  expect(await cache.resolve(path, check)).toEqual({
    isAuthenticated: false,
    token: undefined,
  });
  expect(check).toHaveBeenCalledOnce();
});

it("ne partage pas une session avec un autre routeur", async () => {
  const first = new RouteSessionCache();
  first.prime(token());
  const second = new RouteSessionCache();
  const check = getToken();
  expect((await second.resolve("/privacy", check)).isAuthenticated).toBe(false);
  expect(check).toHaveBeenCalledOnce();
});

it("renouvelle un jeton expiré avant de le réutiliser", async () => {
  const cache = new RouteSessionCache();
  cache.prime(token("alice", 60));
  vi.advanceTimersByTime(60000);
  const next = token();
  const check = getToken().mockResolvedValue(next);
  expect((await cache.resolve("/terms", check)).token).toBe(next);
  expect(check).toHaveBeenCalledOnce();
});

it("respecte aussi l’expiration de la session Better Auth", async () => {
  const cache = new RouteSessionCache();
  cache.prime(token());
  cache.reconcile("alice", Date.now() + 1000);
  vi.advanceTimersByTime(1000);
  const check = getToken();
  expect((await cache.resolve("/privacy", check)).isAuthenticated).toBe(false);
  expect(check).toHaveBeenCalledOnce();
});

it.each(["malformed", "header.bnVsbA.signature", "header.e30.signature"])(
  "ne réutilise pas un jeton dont l’expiration ne peut pas être lue (%s)",
  async (jwt) => {
    const cache = new RouteSessionCache();
    cache.prime(jwt);
    const check = getToken();
    await cache.resolve("/terms", check);
    expect(check).toHaveBeenCalledOnce();
  },
);

it("mutualise les vérifications simultanées et permet de réessayer après un échec", async () => {
  const cache = new RouteSessionCache();
  const check = getToken().mockRejectedValueOnce(new Error("network"));
  await expect(
    Promise.all([
      cache.resolve("/terms", check),
      cache.resolve("/privacy", check),
    ]),
  ).rejects.toThrow("network");
  expect(check).toHaveBeenCalledOnce();
  await cache.resolve("/privacy", check);
  expect(check).toHaveBeenCalledTimes(2);
});

it("une réponse ancienne ne restaure pas la session précédente après une déconnexion", async () => {
  const cache = new RouteSessionCache();
  const old = token();
  let finish!: (jwt: string) => void;
  const check = getToken().mockImplementationOnce(
    () => new Promise((resolve) => (finish = resolve)),
  );
  const pending = cache.resolve("/terms", check);
  cache.invalidate();
  cache.prime(old);
  await cache.resolve("/privacy", check);
  finish(old);
  expect((await pending).isAuthenticated).toBe(false);
  expect((await cache.resolve("/", check)).isAuthenticated).toBe(false);
  expect(check).toHaveBeenCalledTimes(2);
});

it("Better Auth invalide le cache après un signal de connexion ou de changement d’onglet", async () => {
  const cache = new RouteSessionCache();
  cache.prime(undefined);
  const stop = observeRouteSession(cache);
  stores.$sessionSignal.set(true);
  const check = getToken().mockResolvedValue(token());
  expect((await cache.resolve("/privacy", check)).isAuthenticated).toBe(true);
  expect(check).toHaveBeenCalledOnce();
  stop();
  expect(stores.$sessionSignal.listeners.size).toBe(0);
  expect(stores.session.listeners.size).toBe(0);
});

it("détecte une déconnexion ou un changement de compte même sans signal explicite", async () => {
  stores.session.set({
    ...stores.session.get(),
    data: { session: { id: "alice", expiresAt: new Date(Date.now() + 60000) } },
  });
  const cache = new RouteSessionCache();
  cache.prime(token());
  const stop = observeRouteSession(cache);
  const check = getToken().mockResolvedValue(token("bob"));
  await cache.resolve("/terms", check);
  expect(check).not.toHaveBeenCalled();
  stores.session.set({
    ...stores.session.get(),
    data: { session: { id: "bob", expiresAt: new Date(Date.now() + 60000) } },
  });
  expect((await cache.resolve("/privacy", check)).token).toBe(token("bob"));
  stores.session.set({ ...stores.session.get(), data: null });
  check.mockResolvedValue(undefined);
  expect((await cache.resolve("/gallery", check)).isAuthenticated).toBe(false);
  expect(check).toHaveBeenCalledTimes(2);
  stop();
});
