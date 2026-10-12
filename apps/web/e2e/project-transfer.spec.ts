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
  const save = page.getByRole("button", {
    name: "Enregistrer en ligne",
    exact: true,
  });
  await save.press("Enter");
  await expect(page.getByRole("menuitem")).toHaveCount(2);
  await page.keyboard.press("Delete");
  await expect(page.locator(".viewport-bottom")).toContainText("1 / 500");
  await page.keyboard.press("Escape");
  await expect(save).toBeFocused();
  expect(fixture.calls.creations).toHaveLength(0);
  fixture.failCreation(true);
  await page
    .getByRole("button", { name: "Enregistrer en ligne", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Enregistrer en privé", exact: true })
    .click();
  await expect(page.getByText(/Enregistrement indisponible/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enregistrer en ligne", exact: true }),
  ).toBeEnabled();
  await expect(save).toBeFocused();
  expect(await localProject(page)).toEqual(snapshot);
  await expect(page).toHaveURL(/draft=transfer/);
  fixture.failCreation(false);
  await page
    .getByRole("button", { name: "Enregistrer en ligne", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Enregistrer en privé", exact: true })
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

test("publier depuis l’atelier local enregistre une seule fois et permet de reprendre une publication échouée", async ({
  page,
}) => {
  const fixture = await projectsFixture(page);
  await page.goto("/editor?draft=transfer");
  await page.getByRole("button", { name: "Brique 2 × 2", exact: true }).click();
  await page.getByLabel("Nom du projet").fill("Mon atelier à partager");
  await page
    .getByRole("button", { name: "Enregistrer en ligne", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Publier dans la galerie", exact: true })
    .click();

  const dialog = page.getByRole("dialog", { name: "Publier votre création" });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/editor\/imported$/);
  await expect(dialog.getByLabel("Titre", { exact: true })).toHaveValue(
    "Mon atelier à partager",
  );
  await expect(dialog.getByLabel("Titre", { exact: true })).toBeFocused();
  expect(await localProject(page)).toBeNull();
  expect(fixture.calls.creations).toHaveLength(1);
  expect(fixture.calls.publications).toHaveLength(0);

  await dialog.getByLabel("Titre", { exact: true }).fill("Le phare de Camille");
  await dialog.getByLabel("Description").fill("Une construction à partager.");
  fixture.failPublication(true);
  await dialog.getByRole("button", { name: "Publier cette version" }).click();
  await expect(page.getByText(/Publication indisponible/)).toBeVisible();
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Publier cette version" }),
  ).toBeEnabled();
  await expect(dialog.getByLabel("Titre", { exact: true })).toHaveValue(
    "Le phare de Camille",
  );
  await expect(page).toHaveURL(/\/editor\/imported$/);

  fixture.failPublication(false);
  await dialog.getByRole("button", { name: "Publier cette version" }).click();
  await expect(page).toHaveURL(/\/creations\/publication$/);
  await expect(
    page.getByRole("heading", { name: "Le phare de Camille", exact: true }),
  ).toBeVisible();
  expect(fixture.calls.creations).toHaveLength(1);
  expect(fixture.calls.publications).toHaveLength(2);
  expect(fixture.calls.publications[1]).toMatchObject({
    id: "imported",
    title: "Le phare de Camille",
    description: "Une construction à partager.",
  });
  expect(await localProject(page)).toBeNull();
});

test("annuler la publication garde le projet privé et ne rouvre pas la fenêtre au rechargement", async ({
  page,
}) => {
  const fixture = await projectsFixture(page);
  await page.goto("/editor?draft=transfer");
  await page.getByRole("button", { name: "Brique 1 × 1", exact: true }).click();
  await page
    .getByRole("button", { name: "Enregistrer en ligne", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Publier dans la galerie", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Publier votre création" });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/editor\/imported$/);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Publier", exact: true }),
  ).toBeFocused();
  expect(fixture.calls.publications).toHaveLength(0);
  expect(await localProject(page)).toBeNull();
  await page.reload();
  await expect(page.getByLabel("Nom du projet")).toBeEnabled();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".viewport-bottom")).toContainText("1 / 500");
  await page.getByRole("button", { name: "Publier", exact: true }).click();
  await expect(dialog).toBeVisible();
  expect(fixture.calls.creations).toHaveLength(1);
});
