import { useEffect } from "react";
import { usePostHog } from "@posthog/react";
import { useLocation } from "@tanstack/react-router";
import { analyticsPathname } from "../lib/analytics";

export default function SiteAnalytics({ ready }: { ready: boolean }) {
  const client = usePostHog();
  // Le SDK survit au rechargement à chaud, et ne rappelle pas loaded au remontage.
  const initialized = ready || client.__loaded;
  const pathname = useLocation({ select: (location) => location.pathname });
  const route = analyticsPathname(pathname);

  useEffect(() => {
    if (!initialized) return;
    client.capture("$pageview", {
      environment: import.meta.env.MODE,
      $current_url: `${location.origin}${route}`,
      $pathname: route,
    });
  }, [client, initialized, route]);

  useEffect(() => {
    if (!initialized) return;
    let active = true;
    let cancelIdle: (() => void) | undefined;
    const initialRoute = analyticsPathname(location.pathname);
    const start = () => {
      void import("web-vitals")
        .then(({ onCLS, onINP, onLCP }) => {
          if (!active) return;
          const report = (metric: {
            name: string;
            value: number;
            rating: string;
          }) => {
            if (active)
              client.capture("web_vital", {
                environment: import.meta.env.MODE,
                metric: metric.name,
                value: metric.value,
                rating: metric.rating,
                route: initialRoute,
                $current_url: `${location.origin}${initialRoute}`,
                $pathname: initialRoute,
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
  }, [client, initialized]);
  return null;
}
