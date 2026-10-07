import { useMemo, useState, type ReactNode } from "react";
import { PostHogProvider } from "@posthog/react";
import type { PostHogConfig } from "posthog-js";
import { getPostHogConfig } from "../lib/analytics";
import SiteAnalytics from "./site-analytics";

export default function SiteAnalyticsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const config = getPostHogConfig();
  const [ready, setReady] = useState(false);
  const options = useMemo<Partial<PostHogConfig>>(
    () => ({
      api_host: config?.apiHost,
      defaults: "2026-01-30",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      advanced_disable_flags: true,
      save_campaign_params: false,
      save_referrer: false,
      disable_session_recording: true,
      person_profiles: "never",
      persistence: "memory",
      disable_persistence: true,
      ip: false,
      property_denylist: [
        "$referrer",
        "$initial_referrer",
        "$initial_current_url",
        "$initial_pathname",
        "$session_entry_url",
        "$session_entry_pathname",
        "$session_entry_referrer",
        "$prev_pageview_pathname",
      ],
      loaded: () => setReady(true),
    }),
    [config?.apiHost],
  );

  if (!config) return children;

  return (
    <PostHogProvider apiKey={config.apiKey} options={options}>
      {children}
      <SiteAnalytics ready={ready} />
    </PostHogProvider>
  );
}
