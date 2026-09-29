import { test, expect } from "@playwright/test";

test("renommer avec Entrée, annuler avec Échap et garder un titre long accessible", async ({
  page,
}, info) => {
  await page.goto("/editor");
  const title = page.getByLabel("Nom du projet");
  await expect(title).toBeEnabled();
  await expect(
    page
      .locator(".editor-top")
      .getByRole("link", { name: "Mes créations", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".project-title-field svg")).toHaveCount(0);
  await title.fill("Mon atelier miniature");
  await title.press("Enter");
  await expect(page.getByRole("status")).toContainText("Enregistré");
  await title.fill("Modification abandonnée");
  await title.press("Escape");
  await expect(title).toHaveValue("Mon atelier miniature");
  await page.reload();
  await expect(title).toHaveValue("Mon atelier miniature");
  await page.screenshot({
    path: `/tmp/clik-editor-top-default-${info.project.name}.png`,
  });
  const longTitle =
    "Une très grande construction avec un nom de projet qui doit rester modifiable même sur petit écran";
  await title.fill(longTitle);
  await title.press("Enter");
  for (const width of [1440, 1100, 900]) {
    await page.setViewportSize({ width, height: 1000 });
    const header = page.locator(".editor-top");
    await expect(
      header.getByRole("link", { name: "Se connecter pour sauvegarder" }),
    ).toBeVisible();
    expect(
      await header.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await expect(title).toHaveValue(longTitle);
    await page.screenshot({
      path: `/tmp/clik-editor-top-${width}-${info.project.name}.png`,
    });
  }
});
