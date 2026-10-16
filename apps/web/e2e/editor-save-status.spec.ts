import { expect, test, type Page } from "@playwright/test";
import { projectsFixture } from "./fixtures/projects";

async function headerPositions(page: Page) {
  return page
    .locator(
      ".editor-project, .editor-import-action, .save-status, .editor-primary-action",
    )
    .evaluateAll((elements) =>
      elements.map((element) => {
        const { x, y, width, height } = element.getBoundingClientRect();
        return { x, y, width, height };
      }),
    );
}

for (const width of [1440, 900]) {
  test(`sauvegarde : copie locale confirmée pendant la synchronisation et barre stable à ${width} px`, async ({
    page,
    context,
  }, info) => {
    const fixture = await projectsFixture(page);
    fixture.holdSaves(true);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/editor/project");
    const status = page.locator(".save-status");
    await expect(status).toHaveAttribute("data-state", "saved");
    await expect(status).toHaveAttribute("data-sync-state", "synced");
    const before = await headerPositions(page);
    const stable = async () => {
      const current = await headerPositions(page);
      expect(current).toHaveLength(before.length);
      for (const [index, bounds] of current.entries())
        for (const axis of ["x", "y", "width", "height"] as const)
          expect(bounds[axis]).toBeCloseTo(before[index][axis], 1);
    };
    await page
      .getByRole("button", { name: "Brique 1 × 1", exact: true })
      .click();
    await expect(status).toContainText("Enregistré sur cet appareil");
    await expect.poll(() => fixture.calls.saves.length).toBe(1);
    await expect(status).toContainText("Synchronisation en cours…");
    await stable();
    await expect
      .poll(() =>
        page.evaluate(async () => {
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
                .get("project:viewer:project");
              request.onsuccess = () => resolve(request.result?.dirty);
              request.onerror = () => reject(request.error);
            });
          } finally {
            db.close();
          }
        }),
      )
      .toBe(true);
    await page.screenshot({
      path: `/private/tmp/clik-save-status-${width}-${info.project.name}.png`,
    });
    fixture.holdSaves(false);
    await expect(status).toHaveAttribute("data-sync-state", "synced");
    await stable();

    fixture.failSave(true);
    await page.getByRole("button", { name: "Rouge", exact: true }).click();
    await expect(status).toHaveAttribute("data-sync-state", "error");
    await expect(status).toContainText("Enregistré sur cet appareil");
    await expect(status).toContainText("Synchronisation impossible");
    await stable();

    await context.setOffline(true);
    await expect(status).toContainText("Hors ligne · en attente");
    await expect(status).toHaveAttribute("data-state", "saved");
    await stable();
    fixture.failSave(false);
    await context.setOffline(false);
    await expect(status).toHaveAttribute("data-sync-state", "synced");
    await stable();
  });
}

test("sauvegarde : la création locale garde un indicateur stable et fonctionne hors ligne", async ({
  page,
  context,
}) => {
  const fixture = await projectsFixture(page);
  await page.goto("/editor?draft=save-status");
  const status = page.locator(".save-status");
  await expect(status).toHaveText("Enregistré sur cet appareil");
  const before = await headerPositions(page);
  await page.getByRole("button", { name: "Brique 1 × 1", exact: true }).click();
  await expect(status).toHaveText("Enregistré sur cet appareil");
  expect(await headerPositions(page)).toEqual(before);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Brique 2 × 2", exact: true }).click();
  await expect(status).toHaveText("Enregistré sur cet appareil");
  expect(await headerPositions(page)).toEqual(before);
  expect(fixture.calls.saves).toHaveLength(0);
  await context.setOffline(false);
  await page.reload();
  await expect(page.locator(".viewport-bottom")).toContainText("2 / 500");
});
