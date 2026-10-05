import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/sitemaps/$part")({
  server: {
    handlers: {
      GET: async ({ params }) =>
        (await import("@/lib/seo/sitemap-server")).sitemapResponse(params.part),
    },
  },
});
