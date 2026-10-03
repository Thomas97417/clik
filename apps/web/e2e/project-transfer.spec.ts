import { test, expect, type Page } from "@playwright/test";
import { projectsFixture } from "./fixtures/projects";

async function localProject(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("clik", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise((resolve, reject) => {
        const request = db
          .transaction("drafts")
          .objectStore("drafts")
          .get("guest:transfer");
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  });
}

test("conserver un projet le déplace vers le compte, sans doublon local et avec reprise après échec", async ({
  page,
}) => {
  const fixture = await projectsFixture(page);
  await page.goto("/editor?draft=transfer");
  await page.getByRole("button", { name: "Brique 1 × 1", exact: true }).click();
  const title = page.getByLabel("Nom du projet");
  await title.fill("Ma construction transférée");
  await title.press("Enter");
  await expect(
    page.getByLabel("Projet et sauvegarde").getByRole("status"),
  ).toContainText("Enregistré");
  await expect.poll(() => localProject(page)).not.toBeNull();
  const snapshot = await localProject(page);
  fixture.failCreation(true);
  await page
    .getByRole("button", { name: "Conserver le projet", exact: true })
    .click();
  await expect(page.getByText(/Enregistrement indisponible/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Conserver le projet", exact: true }),
  ).toBeEnabled();
  expect(await localProject(page)).toEqual(snapshot);
  await expect(page).toHaveURL(/draft=transfer/);
  fixture.failCreation(false);
  await page
    .getByRole("button", { name: "Conserver le projet", exact: true })
    .click();
  await expect(page).toHaveURL(/\/editor\/imported$/);
  await expect(title).toHaveValue("Ma construction transférée");
  await expect(page.locator(".viewport-bottom")).toContainText("1 / 500");
  expect(await localProject(page)).toBeNull();
  expect(fixture.calls.creations).toHaveLength(2);
  expect(fixture.calls.creations[0].localSourceId).toBe(
    fixture.calls.creations[1].localSourceId,
  );
  await page.getByRole("button", { name: "Brique 2 × 2", exact: true }).click();
  await expect.poll(() => fixture.calls.saves.length).toBeGreaterThan(0);
  await expect(
    page.getByLabel("Projet et sauvegarde").getByRole("status"),
  ).toContainText("Enregistré");
  expect(await localProject(page)).toBeNull();
  await page.goto("/projects");
  await expect(
    page
      .locator(".project-card h2")
      .filter({ hasText: "Ma construction transférée" }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Sur cet appareil", exact: true })
    .click();
  await expect(page.locator(".project-card")).toHaveCount(0);
  await page.getByRole("button", { name: "En ligne", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Ma construction transférée",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page
      .locator(".project-card h2")
      .filter({ hasText: "Ma construction transférée" }),
  ).toHaveCount(1);
});
