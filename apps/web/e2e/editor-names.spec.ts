import { test, expect, type Page } from "@playwright/test";
import { emptyScene } from "@clik/scene";
import { projectsFixture } from "./fixtures/projects";

async function savePart(page: Page) {
  await page.getByRole("button", { name: "Brique 1 × 1", exact: true }).click();
  await expect(
    page.getByLabel("Projet et sauvegarde").getByRole("status"),
  ).toHaveText("Enregistré sur cet appareil");
}

async function create(page: Page, title: string) {
  await page
    .getByRole("button", { name: "Nouvelle création", exact: true })
    .click();
  await expect(page.getByLabel("Nom du projet")).toHaveValue(title);
  await savePart(page);
  return page.url();
}

for (const action of ["renommer", "supprimer"] as const) {
  test(`les noms continuent après ${action} Nouvelle création 2 et après un rechargement`, async ({
    page,
  }) => {
    await projectsFixture(page);
    await page.goto("/editor");
    await expect(page.getByLabel("Nom du projet")).toHaveValue(
      "Ma première création",
    );
    await page.reload();
    await expect(page.getByLabel("Nom du projet")).toHaveValue(
      "Ma première création",
    );
    await savePart(page);
    await create(page, "Nouvelle création");
    const second = await create(page, "Nouvelle création 2");
    await create(page, "Nouvelle création 3");
    if (action === "renommer") {
      await page.goto(second);
      await page.getByLabel("Nom du projet").fill("Ma maison");
      await page.getByLabel("Nom du projet").press("Enter");
    } else {
      await page.goto("/projects");
      await page
        .getByRole("button", { name: "Sur cet appareil", exact: true })
        .click();
      await page
        .getByRole("button", {
          name: "Visibilité de Nouvelle création 2 : Sur cet appareil",
          exact: true,
        })
        .click();
      await page
        .getByRole("menuitem", { name: "Supprimer", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("button", {
          name: "Supprimer la création",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("heading", { name: "Nouvelle création 2", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("heading", { name: "Nouvelle création 3", exact: true }),
      ).toBeVisible();
    }
    await create(page, "Nouvelle création 4");
    await page.reload();
    await expect(page.getByLabel("Nom du projet")).toHaveValue(
      "Nouvelle création 4",
    );
    await page.getByLabel("Nom du projet").fill("Mon projet renommé");
    await page.getByLabel("Nom du projet").press("Enter");
    await create(page, "Nouvelle création 5");
  });
}

test("les anciennes créations numérotées et les renommages vers un numéro supérieur sont pris en compte", async ({
  page,
}) => {
  await projectsFixture(page);
  await page.goto("/projects");
  await expect(
    page.getByRole("heading", { name: "Le phare bleu", exact: true }),
  ).toBeVisible();
  await page.evaluate(async (scene) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("clik", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("drafts");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("drafts", "readwrite");
        for (const [id, title] of [
          ["old-first", "Nouvelle création"],
          ["old-third", "Nouvelle Création 3"],
        ])
          tx.objectStore("drafts").put(
            {
              title,
              scene,
              revision: 0,
              stamp: crypto.randomUUID(),
              dirty: false,
              updatedAt: Date.now(),
            },
            `guest:${id}`,
          );
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }, emptyScene());
  await create(page, "Nouvelle création 4");
  await page.getByLabel("Nom du projet").fill("Nouvelle Création 12");
  await page.getByLabel("Nom du projet").press("Enter");
  await create(page, "Nouvelle création 13");
});

test("deux onglets réservent des noms distincts sans changer les noms au rechargement", async ({
  page,
  context,
}) => {
  await projectsFixture(page);
  await page.goto("/editor");
  await expect(page.getByLabel("Nom du projet")).toHaveValue(
    "Ma première création",
  );
  const second = await context.newPage();
  const third = await context.newPage();
  await projectsFixture(second);
  await projectsFixture(third);
  await Promise.all([
    second.goto("/editor?draft=second-tab"),
    third.goto("/editor?draft=third-tab"),
  ]);
  await expect(second.getByLabel("Nom du projet")).toBeEnabled();
  await expect(third.getByLabel("Nom du projet")).toBeEnabled();
  const titles = await Promise.all([
    second.getByLabel("Nom du projet").inputValue(),
    third.getByLabel("Nom du projet").inputValue(),
  ]);
  expect(titles.sort()).toEqual(["Nouvelle création", "Nouvelle création 2"]);
  for (const tab of [second, third]) {
    const title = await tab.getByLabel("Nom du projet").inputValue();
    await tab.reload();
    await expect(tab.getByLabel("Nom du projet")).toHaveValue(title);
  }
  await create(page, "Nouvelle création 3");
});
