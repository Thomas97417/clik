import { createFileRoute } from "@tanstack/react-router";
import { publicRequest } from "@/lib/seo/public-data";
export const Route = createFileRoute("/api/public")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const headers = {
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex",
        };
        let input;
        try {
          input = publicRequest.parse(
            JSON.parse(new URL(request.url).searchParams.get("input") || "{}"),
          );
        } catch {
          return Response.json(
            { error: "Requête invalide" },
            { status: 400, headers },
          );
        }
        try {
          return Response.json(
            await (
              await import("@/lib/seo/public-data-server")
            ).readPublic(input),
            { headers },
          );
        } catch {
          return Response.json(
            { error: "Service temporairement indisponible" },
            { status: 503, headers },
          );
        }
      },
    },
  },
});
