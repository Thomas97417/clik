import { test, expect } from "@playwright/test";
import { projectsFixture } from "./fixtures/projects";

test("la liste charge seulement les aperçus visibles et réutilise leur cache", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 600 });
  const fixture = await projectsFixture(page, {
    privateCount: 120,
    published: true,
  });
  await page.goto("/projects");
  await expect(page.locator(".project-card")).toHaveCount(12);
  await expect(page.locator(".creation-preview img").first()).toBeVisible();
  await page.waitForTimeout(300);
  expect(fixture.calls.lists).toHaveLength(1);
  expect(fixture.calls.lists[0].summaryOnly).toBe(true);
  expect(fixture.calls.gets.length).toBeGreaterThan(0);
  expect(fixture.calls.gets.length).toBeLessThan(12);
  await page
    .getByRole("button", { name: "Dans la galerie", exact: true })
    .click();
  await expect(page.locator(".project-card h2")).toHaveText(["Le phare bleu"]);
  await expect(page.locator(".creation-preview img")).toBeVisible();
  expect(fixture.calls.lists).toHaveLength(2);
  expect(fixture.calls.lists[1]).toMatchObject({
    publishedOnly: true,
    paginationOpts: { cursor: null },
  });
  const loads = fixture.calls.gets.length;
  await page.getByRole("button", { name: "Toutes", exact: true }).click();
  await expect(page.locator(".project-card")).toHaveCount(12);
  await expect(page.locator(".creation-preview img").first()).toBeVisible();
  await page
    .getByRole("button", { name: "Dans la galerie", exact: true })
    .click();
  await expect(page.locator(".creation-preview img")).toBeVisible();
  expect(fixture.calls.gets).toHaveLength(loads);
});

test("les anciennes collections restent accessibles pendant la migration", async ({
  page,
}) => {
  const fixture = await projectsFixture(page, {
    privateCount: 25,
    published: true,
    collectionReady: false,
  });
  await page.goto("/projects");
  await expect(page.locator(".project-card")).toHaveCount(12);
  await page
    .getByRole("button", { name: "Dans la galerie", exact: true })
    .click();
  await expect(page.locator(".project-card h2")).toHaveText(["Le phare bleu"]);
  expect(
    fixture.calls.lists.some((args) => args.paginationOpts.cursor !== null),
  ).toBe(true);
  expect(
    fixture.calls.lists.every(
      (args) => !args.publishedOnly && args.summaryOnly,
    ),
  ).toBe(true);
});
