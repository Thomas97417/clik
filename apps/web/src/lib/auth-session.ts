export type RouteSession = {
  isAuthenticated: boolean;
  token: string | undefined;
};

export function canReuseRouteSession(pathname: string) {
  return /^(?:\/|\/(?:terms|privacy|gallery|challenges)\/?|\/gallery\/user\/[^/]+\/?|\/creations\/[^/]+\/?)$/.test(
    pathname,
  );
}

function tokenClaims(token: string) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as {
      exp?: number;
      sessionId?: string;
    };
  } catch {
    return undefined;
  }
}

// Owned by one router. Never share authentication state between SSR requests.
export class RouteSessionCache {
  private session: RouteSession | undefined;
  private sessionId: string | undefined;
  private expiresAt = 0;
  private initialized = false;
  private generation = 0;
  private pending: Promise<RouteSession> | undefined;

  prime(token: string | undefined) {
    // A later root render must not restore a session invalidated by Better Auth.
    if (!this.initialized) this.remember(token);
  }

  invalidate() {
    this.initialized = true;
    this.generation++;
    this.session = undefined;
    this.sessionId = undefined;
    this.pending = undefined;
  }

  reconcile(sessionId: string | null, expiresAt = Infinity) {
    if (!this.read()) return;
    if ((this.sessionId ?? null) !== sessionId) this.invalidate();
    else this.expiresAt = Math.min(this.expiresAt, expiresAt);
  }

  async resolve(
    pathname: string,
    getToken: () => Promise<string | undefined>,
  ): Promise<RouteSession> {
    const known = canReuseRouteSession(pathname) ? this.read() : undefined;
    return known ?? this.refresh(getToken);
  }

  private read() {
    if (this.session && Date.now() >= this.expiresAt) this.invalidate();
    return this.session;
  }

  private remember(token: string | undefined) {
    const claims = token ? tokenClaims(token) : undefined;
    this.session = { isAuthenticated: !!token, token };
    this.sessionId = claims?.sessionId;
    this.expiresAt = token
      ? typeof claims?.exp === "number" && Number.isFinite(claims.exp)
        ? claims.exp * 1000
        : 0
      : Infinity;
    this.initialized = true;
    return this.session;
  }

  private async refresh(getToken: () => Promise<string | undefined>) {
    if (this.pending) return this.pending;
    const generation = this.generation;
    const pending = (async (): Promise<RouteSession> => {
      const token = await getToken();
      // A login/logout can finish while an older check is still in flight.
      if (generation !== this.generation)
        return this.read() ?? this.refresh(getToken);
      return this.remember(token);
    })();
    this.pending = pending;
    try {
      return await pending;
    } finally {
      if (this.pending === pending) this.pending = undefined;
    }
  }
}
