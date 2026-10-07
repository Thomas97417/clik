export function getPostHogConfig():
  { apiKey: string; apiHost: string | undefined } | undefined {
  const apiKey =
    import.meta.env.VITE_POSTHOG_PROJECT_TOKEN ||
    import.meta.env.VITE_POSTHOG_PROJECT_KEY ||
    import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
  if (!apiKey) return undefined;

  return {
    apiKey,
    apiHost:
      import.meta.env.VITE_POSTHOG_HOST ||
      import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  };
}

export function analyticsPathname(pathname: string) {
  return pathname
    .replace(/\/creations\/[^/]+/, "/creations/$publicationId")
    .replace(/\/gallery\/user\/[^/]+/, "/gallery/user/$userId")
    .replace(/\/editor\/[^/]+/, "/editor/$projectId");
}
