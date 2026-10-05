import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("../src/lib/seo/public-data-server", () => ({
  publicClient: () => ({ query }),
}));
beforeEach(() => {
  vi.resetModules();
  query.mockReset();
  vi.stubEnv("VITE_SITE_URL", "https://clik.io");
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-05T12:00:00Z"));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
it("pagine les données et découpe le sitemap sans dupliquer les auteurs ni le défi du jour", async () => {
  query.mockImplementation(async (reference, { cursor }) => {
    if (getFunctionName(reference) === "challenges:sitemapPage")
      return {
        page: [{ day: "2026-10-04" }, { day: "2026-10-05" }],
        isDone: true,
        continueCursor: "",
      };
    const start = Number(cursor ?? 0),
      end = Math.min(start + 250, 10005);
    return {
      page: Array.from({ length: end - start }, (_, i) => ({
        id: `public-${start + i}`,
        modified: 1791201600000,
      })),
      owners: ["alice"],
      isDone: end === 10005,
      continueCursor: String(end),
    };
  });
  const { sitemapFiles, sitemapResponse, xmlEscape } =
    await import("../src/lib/seo/sitemap-server");
  const files = await sitemapFiles();
  expect(files).toHaveLength(2);
  expect(files[0].match(/<url>/g)).toHaveLength(10000);
  expect(files.join("").match(/\/gallery\/user\/alice/g)).toHaveLength(1);
  expect(files.join("")).toContain("/challenges?date=2026-10-04");
  expect(files.join("")).not.toContain("date=2026-10-05");
  expect(files.join("")).not.toContain("/projects");
  expect(xmlEscape('a&b<"')).toBe("a&amp;b&lt;&quot;");
  const calls = query.mock.calls.length;
  expect((await sitemapResponse()).status).toBe(200);
  expect(query).toHaveBeenCalledTimes(calls);
  expect((await sitemapResponse("42.xml")).status).toBe(404);
  vi.setSystemTime(new Date("2026-10-05T12:05:01Z"));
  await sitemapFiles();
  expect(query.mock.calls.length).toBe(calls * 2);
});
it("signale une indisponibilité sans publier un sitemap incomplet", async () => {
  query.mockRejectedValue(new Error("unavailable"));
  const { sitemapResponse } = await import("../src/lib/seo/sitemap-server");
  const response = await sitemapResponse();
  expect(response.status).toBe(503);
  expect(response.headers.get("retry-after")).toBe("60");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.text()).not.toContain("<urlset");
});
