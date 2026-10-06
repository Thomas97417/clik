import { useEffect } from "react";
import {
  analyticsConfigured,
  getAnalyticsConsent,
  useAnalyticsConsent,
} from "../lib/analytics-consent";

// Keep analytics and its optional extensions out of the initial application bundle.
let clientPromise:
  Promise<(typeof import("posthog-js"))["default"]> | undefined;
let initialized = false;
function analyticsClient() {
  clientPromise ??= import("posthog-js").then(({ default: client }) => client);
  return clientPromise;
}

export default function SiteAnalytics() {
  const consent = useAnalyticsConsent();
  useEffect(() => {
    if (!analyticsConfigured() || consent !== "accepted") return;
    let active = true;
    let cancelIdle: (() => void) | undefined;
    const route = location.pathname
      .replace(/\/creations\/[^/]+/, "/creations/$publicationId")
      .replace(/\/gallery\/user\/[^/]+/, "/gallery/user/$userId")
      .replace(/\/editor\/[^/]+/, "/editor/$projectId");
    const start = () => {
      void Promise.all([analyticsClient(), import("web-vitals")])
        .then(([client, { onCLS, onINP, onLCP }]) => {
          if (!active || getAnalyticsConsent() !== "accepted") return;
          if (!initialized) {
            client.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY, {
              api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
              defaults: "2026-01-30",
              autocapture: false,
              capture_pageview: false,
              capture_pageleave: false,
              disable_session_recording: true,
              person_profiles: "never",
              persistence: "memory",
              opt_out_capturing_by_default: true,
              opt_out_persistence_by_default: true,
            });
            initialized = true;
          }
          client.opt_in_capturing({ captureEventName: false });
          client.capture("$pageview", {
            $current_url: `${location.origin}${route}`,
            $pathname: route,
          });
          const report = (metric: {
            name: string;
            value: number;
            rating: string;
          }) => {
            if (active && getAnalyticsConsent() === "accepted")
              client.capture("web_vital", {
                metric: metric.name,
                value: metric.value,
                rating: metric.rating,
                route,
                $current_url: `${location.origin}${route}`,
                $pathname: route,
                $set: undefined,
              });
          };
          // web-vitals reads buffered entries, including paints before this module loaded.
          onCLS(report);
          onINP(report);
          onLCP(report);
        })
        .catch(() => {
          /* Analytics failure must never interrupt the application. */
        });
    };
    const schedule = () => {
      if (typeof window.requestIdleCallback === "function") {
        const id = window.requestIdleCallback(start, { timeout: 3000 });
        cancelIdle = () => window.cancelIdleCallback(id);
      } else {
        const id = window.setTimeout(start, 1500);
        cancelIdle = () => window.clearTimeout(id);
      }
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      active = false;
      // Stop SDK capture as soon as the choice is withdrawn.
      if (initialized)
        void clientPromise?.then((client) => client.opt_out_capturing());
      window.removeEventListener("load", schedule);
      cancelIdle?.();
    };
  }, [consent]);
  return null;
}
