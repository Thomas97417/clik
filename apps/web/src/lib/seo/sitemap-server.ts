import type { FunctionReturnType } from "convex/server";
import { publicClient } from "./public-data-server";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { absolute } from "./meta";
export const xmlEscape = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[character]!,
  );
type Entry = { path: string; modified?: number };
export function urlset(entries: Entry[]) {
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map((entry) => `<url><loc>${xmlEscape(absolute(entry.path))}</loc>${entry.modified ? `<lastmod>${new Date(entry.modified).toISOString()}</lastmod>` : ""}</url>`).join("")}</urlset>`;
}
let cache: { expires: number; files: string[] } | undefined;
let pending: Promise<string[]> | undefined;
export async function sitemapFiles() {
  if (cache && cache.expires > Date.now()) return cache.files;
  if (pending) return pending;
  pending = (async () => {
    const client = publicClient();
    const entries: Entry[] = [
      { path: "/" },
      { path: "/gallery" },
      { path: "/challenges" },
    ];
    const owners = new Set<string>();
    let cursor: string | null = null;
    do {
      const result: FunctionReturnType<typeof api.projects.sitemapPage> =
        await client.query(api.projects.sitemapPage, { cursor });
      entries.push(
        ...result.page.map((p) => ({
          path: `/creations/${p.id}`,
          modified: p.modified,
        })),
      );
      result.owners.forEach((owner) => owners.add(owner));
      if (result.isDone) break;
      if (cursor === result.continueCursor)
        throw Error("Sitemap pagination stalled");
      cursor = result.continueCursor;
    } while (cursor);
    entries.push(
      ...[...owners]
        .sort()
        .map((id) => ({ path: `/gallery/user/${encodeURIComponent(id)}` })),
    );
    cursor = null;
    const today = new Date().toISOString().slice(0, 10);
    do {
      const result: FunctionReturnType<typeof api.challenges.sitemapPage> =
        await client.query(api.challenges.sitemapPage, { cursor });
      entries.push(
        ...result.page
          .filter((c) => c.day !== today)
          .map((c) => ({ path: `/challenges?date=${c.day}` })),
      );
      if (result.isDone) break;
      if (cursor === result.continueCursor)
        throw Error("Sitemap pagination stalled");
      cursor = result.continueCursor;
    } while (cursor);
    const files = [];
    for (let i = 0; i < entries.length; i += 10000)
      files.push(urlset(entries.slice(i, i + 10000)));
    cache = { files, expires: Date.now() + 300000 };
    return files;
  })();
  try {
    return await pending;
  } finally {
    pending = undefined;
  }
}
export async function sitemapResponse(part?: string) {
  try {
    const files = await sitemapFiles();
    if (
      part !== undefined &&
      (!/^\d+\.xml$/.test(part) || !files[Number(part.slice(0, -4))])
    )
      return new Response("Introuvable", {
        status: 404,
        headers: { "X-Robots-Tag": "noindex" },
      });
    const body =
      part === undefined
        ? `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${files.map((_, i) => `<sitemap><loc>${xmlEscape(absolute(`/sitemaps/${i}.xml`))}</loc></sitemap>`).join("")}</sitemapindex>`
        : files[Number(part.slice(0, -4))];
    // Browser/CDN revalidation never extends the five-minute server snapshot.
    return new Response(body, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=0, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Sitemap temporairement indisponible", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "60" },
    });
  }
}
