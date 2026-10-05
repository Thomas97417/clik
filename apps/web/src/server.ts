import {
  createStartHandler,
  defaultStreamHandler,
  type RequestHandler,
} from "@tanstack/react-start/server";
import type { Register } from "@tanstack/react-router";
import { INDEXABLE, SITE_URL } from "@/lib/seo/meta";
const handle = createStartHandler(defaultStreamHandler);
const fetch: RequestHandler<Register> = async (request, options) => {
  const url = new URL(request.url),
    canonical = new URL(SITE_URL);
  if (
    INDEXABLE &&
    (url.hostname === canonical.hostname ||
      url.hostname === `www.${canonical.hostname}`) &&
    url.origin !== canonical.origin &&
    (request.method === "GET" || request.method === "HEAD")
  ) {
    return new Response(null, {
      status: 308,
      headers: { Location: `${canonical.origin}${url.pathname}${url.search}` },
    });
  }
  const response = await handle(request, options);
  const headers = new Headers(response.headers);
  if (!INDEXABLE || response.status >= 400 || url.pathname.startsWith("/api/"))
    headers.set("X-Robots-Tag", "noindex");
  if (headers.get("Content-Type")?.includes("text/html"))
    headers.set("Cache-Control", "private, no-store");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
export default { fetch };
