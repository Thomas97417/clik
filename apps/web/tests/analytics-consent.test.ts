// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import SiteAnalytics from "../src/components/site-analytics";
import {
  ANALYTICS_CONSENT_KEY,
  getAnalyticsConsent,
  setAnalyticsConsent,
} from "../src/lib/analytics-consent";

const { client, reports } = vi.hoisted(() => ({
  client: {
    init: vi.fn(),
    capture: vi.fn(),
    opt_in_capturing: vi.fn(),
    opt_out_capturing: vi.fn(),
  },
  reports: [] as ((metric: {
    name: string;
    value: number;
    rating: string;
  }) => void)[],
}));
vi.mock("posthog-js", () => ({ default: client }));
vi.mock("web-vitals", () => ({
  onCLS: (callback: (typeof reports)[number]) => reports.push(callback),
  onINP: vi.fn(),
  onLCP: vi.fn(),
}));

let root: Root;
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("PROD", true);
  vi.stubEnv("VITE_PUBLIC_POSTHOG_KEY", "phc_test");
  localStorage.clear();
  vi.clearAllMocks();
  reports.length = 0;
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  root = createRoot(document.createElement("div"));
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
async function start() {
  await act(async () => {
    root.render(createElement(SiteAnalytics));
  });
  window.dispatchEvent(new Event("load"));
}
async function idle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
}

it("ne démarre aucune mesure sans accord ou après un refus", async () => {
  await start();
  await idle();
  expect(client.init).not.toHaveBeenCalled();
  expect(client.capture).not.toHaveBeenCalled();
  await act(async () => setAnalyticsConsent("declined"));
  await idle();
  expect(client.opt_in_capturing).not.toHaveBeenCalled();
  expect(client.capture).not.toHaveBeenCalled();
});

it("limite la mesure après accord et arrête les événements au retrait", async () => {
  setAnalyticsConsent("accepted");
  await start();
  await idle();
  expect(client.init).toHaveBeenCalledWith(
    "phc_test",
    expect.objectContaining({
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      person_profiles: "never",
      persistence: "memory",
    }),
  );
  expect(client.opt_in_capturing).toHaveBeenCalledWith({
    captureEventName: false,
  });
  expect(client.capture).toHaveBeenCalledWith(
    "$pageview",
    expect.objectContaining({ $pathname: "/" }),
  );
  await act(async () => setAnalyticsConsent("declined"));
  expect(client.opt_out_capturing).toHaveBeenCalled();
  const calls = client.capture.mock.calls.length;
  reports.forEach((report) =>
    report({ name: "LCP", value: 1000, rating: "good" }),
  );
  expect(client.capture).toHaveBeenCalledTimes(calls);
  expect(getAnalyticsConsent()).toBe("declined");
});

it("un accord retiré pendant le démarrage différé ne déclenche aucune capture", async () => {
  setAnalyticsConsent("accepted");
  await start();
  act(() => {
    vi.advanceTimersByTime(1500);
    setAnalyticsConsent("declined");
  });
  await idle();
  expect(client.opt_in_capturing).not.toHaveBeenCalled();
  expect(client.capture).not.toHaveBeenCalled();
});

it("un choix expiré ou un stockage invalide ne vaut pas accord", async () => {
  for (const raw of [
    "invalid",
    JSON.stringify({ value: "accepted", expiresAt: Date.now() - 1 }),
    JSON.stringify({ value: "accepted" }),
  ]) {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, raw);
    expect(getAnalyticsConsent()).toBeNull();
    await start();
    await idle();
    expect(client.capture).not.toHaveBeenCalled();
  }
});

it("un refus dans un autre onglet arrête la mesure dans cet onglet", async () => {
  setAnalyticsConsent("accepted");
  await start();
  await idle();
  await act(async () => {
    localStorage.setItem(
      ANALYTICS_CONSENT_KEY,
      JSON.stringify({ value: "declined", expiresAt: Date.now() + 10000 }),
    );
    window.dispatchEvent(
      new StorageEvent("storage", { key: ANALYTICS_CONSENT_KEY }),
    );
  });
  expect(client.opt_out_capturing).toHaveBeenCalled();
  const calls = client.capture.mock.calls.length;
  reports.forEach((report) =>
    report({ name: "LCP", value: 1000, rating: "good" }),
  );
  expect(client.capture).toHaveBeenCalledTimes(calls);
});
