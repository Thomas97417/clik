// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";

const { client, reports } = vi.hoisted(() => ({
  client: {
    __loaded: false,
    config: {},
    init: vi.fn(),
    capture: vi.fn(),
    set_config: vi.fn(),
  },
  reports: [] as ((metric: {
    name: string;
    value: number;
    rating: string;
  }) => void)[],
}));
vi.mock("posthog-js", () => ({ default: client }));
vi.mock("@tanstack/react-router", () => ({
  useLocation: ({
    select,
  }: {
    select: (value: { pathname: string }) => unknown;
  }) => select({ pathname: location.pathname }),
}));
vi.mock("web-vitals", () => ({
  onCLS: (callback: (typeof reports)[number]) => reports.push(callback),
  onINP: vi.fn(),
  onLCP: vi.fn(),
}));

let root: Root;
let element: HTMLDivElement;
let Provider: (typeof import("../src/components/site-analytics-provider"))["default"];
beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.stubEnv("PROD", true);
  vi.stubEnv("MODE", "production");
  vi.stubEnv("VITE_POSTHOG_PROJECT_TOKEN", undefined);
  vi.stubEnv("VITE_POSTHOG_PROJECT_KEY", undefined);
  vi.stubEnv("VITE_POSTHOG_HOST", undefined);
  vi.stubEnv("VITE_PUBLIC_POSTHOG_KEY", "phc_test");
  vi.stubEnv("VITE_PUBLIC_POSTHOG_HOST", "https://eu.i.posthog.com");
  localStorage.clear();
  sessionStorage.clear();
  history.replaceState(null, "", "/");
  vi.clearAllMocks();
  client.__loaded = false;
  client.config = {};
  client.init.mockImplementation((_key, options) => {
    client.__loaded = true;
    client.config = options;
    options.loaded?.(client);
    return client;
  });
  reports.length = 0;
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  element = document.createElement("div");
  root = createRoot(element);
  Provider = (await import("../src/components/site-analytics-provider"))
    .default;
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
async function render() {
  await act(async () => {
    root.render(
      createElement(Provider, null, createElement("p", null, "Atelier")),
    );
  });
}
async function idle() {
  window.dispatchEvent(new Event("load"));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
}

it("rend le contenu sans configurer PostHog pendant le rendu serveur", () => {
  const html = renderToString(createElement(Provider, null, "Atelier"));
  expect(html).toContain("Atelier");
  expect(client.init).not.toHaveBeenCalled();
  expect(client.capture).not.toHaveBeenCalled();
});

it("garde le contenu accessible sans token, sans init ni événement", async () => {
  vi.stubEnv("VITE_PUBLIC_POSTHOG_KEY", undefined);
  await render();
  await idle();
  expect(element.textContent).toBe("Atelier");
  expect(client.init).not.toHaveBeenCalled();
  expect(client.capture).not.toHaveBeenCalled();
});

it.each([
  {
    mode: "production",
    key: "VITE_PUBLIC_POSTHOG_KEY",
    host: "VITE_PUBLIC_POSTHOG_HOST",
  },
  {
    mode: "development",
    key: "VITE_POSTHOG_PROJECT_TOKEN",
    host: "VITE_POSTHOG_HOST",
  },
  {
    mode: "development",
    key: "VITE_POSTHOG_PROJECT_KEY",
    host: "VITE_POSTHOG_HOST",
  },
])(
  "initialise automatiquement le Provider en $mode avec $key",
  async ({ mode, key, host }) => {
    vi.stubEnv("PROD", mode === "production");
    vi.stubEnv("MODE", mode);
    vi.stubEnv("VITE_PUBLIC_POSTHOG_KEY", undefined);
    vi.stubEnv("VITE_PUBLIC_POSTHOG_HOST", undefined);
    vi.stubEnv(key, "phc_test");
    vi.stubEnv(host, "https://eu.i.posthog.com");
    await render();
    expect(client.init).toHaveBeenCalledTimes(1);
    expect(client.init).toHaveBeenCalledWith(
      "phc_test",
      expect.objectContaining({
        api_host: "https://eu.i.posthog.com",
        autocapture: false,
        capture_pageview: false,
        advanced_disable_flags: true,
        save_campaign_params: false,
        save_referrer: false,
        disable_session_recording: true,
        person_profiles: "never",
        persistence: "memory",
        disable_persistence: true,
        ip: false,
        property_denylist: expect.arrayContaining([
          "$initial_current_url",
          "$session_entry_url",
          "$session_entry_pathname",
          "$prev_pageview_pathname",
        ]),
      }),
    );
    expect(client.capture).toHaveBeenCalledWith(
      "$pageview",
      expect.objectContaining({
        $pathname: "/",
        environment: mode,
      }),
    );
    await idle();
    reports.forEach((report) =>
      report({ name: "LCP", value: 1000, rating: "good" }),
    );
    expect(client.capture).toHaveBeenCalledWith(
      "web_vital",
      expect.objectContaining({
        metric: "LCP",
        environment: mode,
      }),
    );
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  },
);

it("attend que le Provider soit initialisé avant de capturer une visite", async () => {
  client.init.mockImplementation(() => client);
  await render();
  expect(client.capture).not.toHaveBeenCalled();
  await act(async () => client.init.mock.calls[0][1].loaded(client));
  expect(client.capture).toHaveBeenCalledWith("$pageview", expect.any(Object));
});

it("suit les navigations sans réinitialiser le client ni transmettre les identifiants ou paramètres", async () => {
  history.replaceState(null, "", "/creations/secret-id?token=secret");
  await render();
  expect(client.capture).toHaveBeenLastCalledWith(
    "$pageview",
    expect.objectContaining({
      $pathname: "/creations/$publicationId",
      $current_url: `${location.origin}/creations/$publicationId`,
    }),
  );
  await idle();
  history.replaceState(null, "", "/gallery/user/private-id?email=private");
  await render();
  expect(client.capture).toHaveBeenLastCalledWith(
    "$pageview",
    expect.objectContaining({
      $pathname: "/gallery/user/$userId",
      $current_url: `${location.origin}/gallery/user/$userId`,
    }),
  );
  expect(client.init).toHaveBeenCalledTimes(1);
  expect(reports).toHaveLength(1);
  expect(JSON.stringify(client.capture.mock.calls)).not.toMatch(
    /secret-id|private-id|token=|email=/,
  );
});

it("utilise les noms du guide PostHog en priorité", async () => {
  vi.stubEnv("VITE_POSTHOG_PROJECT_TOKEN", "phc_current");
  vi.stubEnv("VITE_POSTHOG_PROJECT_KEY", "phc_alias");
  vi.stubEnv("VITE_POSTHOG_HOST", "https://us.i.posthog.com");
  await render();
  expect(client.init).toHaveBeenCalledWith(
    "phc_current",
    expect.objectContaining({ api_host: "https://us.i.posthog.com" }),
  );
});
