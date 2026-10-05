import { useEffect } from "react";

// Keep analytics and its optional extensions out of the initial application bundle.
let clientPromise:
  Promise<(typeof import("posthog-js"))["default"]> | undefined;
function analyticsClient() {
  clientPromise ??= import("posthog-js").then(({ default: client }) => {
    client.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY, {
      api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
      defaults: "2026-01-30",
    });
    return client;
  });
  return clientPromise;
}

export default function SiteAnalytics() {
  useEffect(() => {
    if (!import.meta.env.PROD || !import.meta.env.VITE_PUBLIC_POSTHOG_KEY)
      return;
    let active = true;
    let cancelIdle: (() => void) | undefined;
    const route = location.pathname
      .replace(/\/creations\/[^/]+/, "/creations/$publicationId")
      .replace(/\/gallery\/user\/[^/]+/, "/gallery/user/$userId")
      .replace(/\/editor\/[^/]+/, "/editor/$projectId");
    const start = () => {
      void Promise.all([analyticsClient(), import("web-vitals")])
        .then(([client, { onCLS, onINP, onLCP }]) => {
          if (!active) return;
          const report = (metric: {
            name: string;
            value: number;
            rating: string;
          }) => {
            if (active)
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
      window.removeEventListener("load", schedule);
      cancelIdle?.();
    };
  }, []);
  return null;
}
