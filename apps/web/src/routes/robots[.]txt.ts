import { createFileRoute } from "@tanstack/react-router";
import { absolute, INDEXABLE } from "@/lib/seo/meta";
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(
          INDEXABLE
            ? `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /_serverFn/\nSitemap: ${absolute("/sitemap.xml")}\n`
            : "User-agent: *\nDisallow: /\n",
          {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "public, max-age=300",
            },
          },
        ),
    },
  },
});
