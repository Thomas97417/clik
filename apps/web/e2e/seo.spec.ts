import { test, expect } from "@playwright/test";
import { creatorsFixture } from "./fixtures/creators";

test("le HTML initial expose les créations, auteurs, commentaires et liens sans JavaScript", async ({
  page,
  request,
}) => {
  await creatorsFixture(page);
  for (const [path, text] of [
    ["/gallery", "La maison bleue 1"],
    ["/gallery/user/alice", "Alice"],
    ["/creations/creation-0", "Une très belle idée !"],
    ["/challenges", "Le petit phare 2"],
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const html = await response.text();
    const visibleHtml = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
    expect(visibleHtml).toContain(text);
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html.match(/rel="canonical"/g)).toHaveLength(1);
    expect(html).toContain("https://clik.io");
    expect(html).toContain('property="og:title"');
    expect(html).toContain("application/ld+json");
    expect(html).not.toContain("private@example.test");
    expect(response.headers()["cache-control"]).toBe("private, no-store");
  }
  const html = await (await request.get("/gallery")).text();
  expect(
    (
      await request.get("/gallery", {
        headers: { cookie: "ph_test=anonymous; theme=light" },
      })
    ).status(),
  ).toBe(200);
  expect(html).toContain("cursor=12");
  const next = await (await request.get("/gallery?cursor=12")).text();
  expect(next).toContain("La maison bleue 13");
  expect(next).toContain("noindex, follow");
});

test("404 réelles, espaces privés exclus et sitemap limité aux publications actives", async ({
  page,
  request,
}) => {
  const fixture = await creatorsFixture(page);
  fixture.setPublished("creation-0", false);
  for (const path of [
    "/creations/creation-0",
    "/creations/invalide",
    "/gallery/user/inconnu",
    "/page-inconnue",
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(404);
    expect(response.headers()["x-robots-tag"]).toBe("noindex");
  }
  for (const path of [
    "/editor",
    "/projects",
    "/sign-in",
    "/reset-password?token=secret-test",
  ]) {
    const html = await (await request.get(path)).text();
    expect(html).toContain("noindex, follow");
    const head = html.split("</head>")[0];
    expect(head).not.toContain("secret-test");
  }
  const index = await request.get("/sitemap.xml");
  expect(index.status()).toBe(200);
  expect(await index.text()).toContain("https://clik.io/sitemaps/0.xml");
  const xml = await (await request.get("/sitemaps/0.xml")).text();
  expect(xml).toContain("https://clik.io/creations/creation-1</loc>");
  expect(xml).not.toContain("/creations/creation-0</loc>");
  expect(xml).toContain("/gallery/user/alice");
  expect(xml).not.toContain("/projects");
});

test("les métadonnées suivent la navigation, sans flash de liste vide", async ({
  page,
}) => {
  await creatorsFixture(page);
  await page.goto("/gallery");
  await expect(page.locator(".public-creation-card")).toHaveCount(12);
  await page
    .getByRole("link", { name: "Voir La maison bleue 1", exact: true })
    .click();
  await expect(page).toHaveTitle("La maison bleue 1 — Clik");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://clik.io/creations/creation-0",
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "La maison bleue 1",
  );
});
