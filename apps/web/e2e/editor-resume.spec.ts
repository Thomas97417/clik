import { test, expect, type Page } from "@playwright/test";
import { creatorsFixture } from "./fixtures/creators";

const navigation = (page: Page, name: string) =>
  page
    .getByRole("navigation", { name: "Navigation principale" })
    .getByRole("link", { name, exact: true });

async function renameAndSave(page: Page, title: string) {
  await page.getByLabel("Nom du projet").fill(title);
  await page.getByLabel("Nom du projet").press("Enter");
  await expect(
    page.getByLabel("Projet et sauvegarde").getByRole("status"),
  ).toContainText("Enregistré");
}

test("l’atelier reprend la dernière création locale après la galerie et un rechargement", async ({
  page,
}) => {
  await creatorsFixture(page);
  await page.goto("/editor");
  await page.getByRole("button", { name: "Brique 2 × 4", exact: true }).click();
  await renameAndSave(page, "Premier essai");
  const firstUrl = page.url();
  await navigation(page, "Mes créations").click();
  await expect(
    page.getByRole("link", { name: "Ouvrir Premier essai" }),
  ).toBeVisible();
  await navigation(page, "L’atelier").click();
  await expect(page.getByLabel("Nom du projet")).toHaveValue("Premier essai");
  await expect(page).toHaveURL(firstUrl);

  await page
    .getByRole("button", { name: "Nouvelle création", exact: true })
    .click();
  await expect(page.locator(".viewport-bottom")).toContainText("0 / 500");
  await page.getByRole("button", { name: "Brique 1 × 1", exact: true }).click();
  await page.getByRole("button", { name: "Brique 2 × 2", exact: true }).click();
  await renameAndSave(page, "Dernière construction");
  const lastUrl = page.url();
  expect(lastUrl).not.toBe(firstUrl);
  await navigation(page, "La galerie").click();
  await expect(
    page.getByRole("heading", { name: "La galerie.", exact: true }),
  ).toBeVisible();
  await navigation(page, "L’atelier").click();
  await expect(page.getByLabel("Nom du projet")).toHaveValue(
    "Dernière construction",
  );
  await expect(page.locator(".viewport-bottom")).toContainText("2 / 500");
  await expect(page).toHaveURL(lastUrl);

  await navigation(page, "La galerie").click();
  await page.reload();
  await expect(page.locator(".public-creation-card")).toHaveCount(12);
  await page.goto("/editor", { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Nom du projet")).toHaveValue(
    "Dernière construction",
  );
  await expect(page).toHaveURL(lastUrl);
  // Recover existing creations from before the resume preference was introduced.
  await navigation(page, "La galerie").click();
  await page.evaluate(() => localStorage.removeItem("clik:last-local-draft"));
  await page.goto("/editor", { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Nom du projet")).toHaveValue(
    "Dernière construction",
  );
  await expect(page).toHaveURL(lastUrl);
  await navigation(page, "Mes créations").click();
  await expect(page.locator(".project-card")).toHaveCount(2);
  await page
    .getByRole("link", { name: "Ouvrir Premier essai", exact: true })
    .click();
  await expect(page.getByLabel("Nom du projet")).toHaveValue("Premier essai");
  await expect(page.locator(".viewport-bottom")).toContainText("1 / 500");
  await navigation(page, "La galerie").click();
  await navigation(page, "L’atelier").click();
  await expect(page.getByLabel("Nom du projet")).toHaveValue("Premier essai");
  await expect(page).toHaveURL(firstUrl);
});

for (const draft of ["", "to-remove"]) {
  test(`supprimer la création active ${draft || "initiale"} retire aussi sa reprise`, async ({
    page,
  }) => {
    await page.goto(`/editor?draft=${draft}`);
    await page
      .getByRole("button", { name: "Brique 1 × 1", exact: true })
      .click();
    await renameAndSave(page, "Projet à supprimer");
    await navigation(page, "Mes créations").click();
    await page
      .getByRole("button", {
        name: "Visibilité de Projet à supprimer : Sur cet appareil",
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
    await expect(page.locator(".project-card")).toHaveCount(0);
    await navigation(page, "L’atelier").click();
    await expect(page.getByLabel("Nom du projet")).toHaveValue(
      "Ma première création",
    );
    await expect(page.locator(".viewport-bottom")).toContainText("0 / 500");
    expect(new URL(page.url()).searchParams.get("draft")).toBe("");
    await navigation(page, "Mes créations").click();
    await expect(page.locator(".project-card")).toHaveCount(0);
  });
}
