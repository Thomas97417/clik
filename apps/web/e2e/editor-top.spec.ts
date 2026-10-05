import { test, expect } from "@playwright/test";

for (const draft of [undefined, "my-workshop"]) {
  test(`nouvelle création depuis ${draft ?? "l’atelier"} : sauvegarde et scènes indépendantes`, async ({
    page,
    context,
  }) => {
    await page.goto(draft ? `/editor?draft=${draft}` : "/editor");
    await page
      .getByRole("button", { name: "Brique 2 × 4", exact: true })
      .click();
    const originalUrl = page.url();
    await page.getByLabel("Nom du projet").fill("Ma construction conservée");
    if (draft) await context.setOffline(true);
    await page
      .getByRole("button", { name: "Nouvelle création", exact: true })
      .click();
    await expect(page).toHaveURL(/\/editor\/?\?draft=[a-f0-9-]{36}$/);
    const nextUrl = page.url();
    expect(new URL(nextUrl).searchParams.get("draft")).not.toBe(draft);
    await expect(page.getByLabel("Nom du projet")).toHaveValue(
      "Ma première création",
    );
    await expect(page.locator(".viewport-bottom")).toContainText("0 / 500");
    await expect(
      page.getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true }),
    ).toBeDisabled();
    if (draft) await context.setOffline(false);
    await page
      .getByRole("button", { name: "Brique 1 × 1", exact: true })
      .click();
    await expect(
      page.getByLabel("Projet et sauvegarde").getByRole("status"),
    ).toContainText("Enregistré");
    await page.goto(originalUrl);
    await expect(page.getByLabel("Nom du projet")).toHaveValue(
      "Ma construction conservée",
    );
    await expect(page.locator(".viewport-bottom")).toContainText("1 / 500");
    await expect(page.locator(".tree-name")).toContainText("Brique 2 × 4");
    await page.goto(nextUrl);
    await expect(page.locator(".viewport-bottom")).toContainText("1 / 500");
    await expect(page.locator(".tree-name")).toContainText("Brique 1 × 1");
  });
}

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
  await title.fill("iiiiiii");
  const narrowWidth = (await title.boundingBox())!.width;
  await title.fill("MMMMMMM");
  await expect
    .poll(async () => (await title.boundingBox())!.width)
    .toBeGreaterThan(narrowWidth + 30);
  await expect(title).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await title.fill("Mon atelier miniature");
  await title.press("Enter");
  await expect(
    page.getByLabel("Projet et sauvegarde").getByRole("status"),
  ).toContainText("Enregistré");
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
    expect((await header.boundingBox())!.height).toBeLessThanOrEqual(56);
    await expect(title).toHaveValue(longTitle);
    await page.screenshot({
      path: `/tmp/clik-editor-top-${width}-${info.project.name}.png`,
    });
  }
});
