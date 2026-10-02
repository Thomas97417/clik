import { test, expect } from "@playwright/test";
import { creatorsFixture } from "./fixtures/creators";

test("paramètres : dialogue responsive, focus clavier et abandon des changements", async ({
  page,
}, info) => {
  const fixture = await creatorsFixture(page, true);
  fixture.setRewards(10, ["gold", "bronze"]);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Compte de Camille", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Paramètres", exact: true }).click();
  const main = page.locator(".settings-page");
  const customize = page.getByRole("button", {
    name: "Personnaliser mon avatar",
  });
  const dialog = page.getByRole("dialog", { name: "Un avatar à votre façon." });
  const shuffle = dialog.getByRole("button", {
    name: "Nouveau motif",
    exact: true,
  });
  const save = dialog.getByRole("button", {
    name: "Valider les changements",
    exact: true,
  });
  const current = main.locator(".avatar-settings-current .brick-avatar");
  await expect(current).toBeVisible();
  const seed = await current.getAttribute("data-avatar-seed");
  await expect(page.getByLabel("Nom public", { exact: true })).toHaveValue(
    "Camille",
  );
  await expect(page.getByLabel("Adresse e-mail", { exact: true })).toHaveValue(
    "private@example.test",
  );
  await expect(page.getByText("Cet appareil", { exact: true })).toBeVisible();
  await customize.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await shuffle.click();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(customize).toBeFocused();
  await expect(current).toHaveAttribute("data-avatar-seed", seed!);
  await customize.click();
  await expect(save).toBeDisabled();
  await shuffle.click();
  await dialog
    .getByRole("button", { name: "Fermer la personnalisation", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await customize.click();
  await shuffle.click();
  await page.mouse.click(2, 2);
  await expect(dialog).toBeHidden();
  expect(fixture.avatarSaves).toHaveLength(0);
  for (const width of [1440, 768, 390, 320]) {
    const height = width === 320 ? 640 : 800;
    await page.setViewportSize({ width, height });
    await main.locator("h1").scrollIntoViewIfNeeded();
    expect(await main.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `/tmp/clik-settings-page-${width}-${info.project.name}.png`,
    });
    await customize.click();
    await expect(dialog).toBeVisible();
    expect(
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.width + bounds!.x).toBeLessThanOrEqual(width);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height + 1);
    await dialog
      .getByRole("button", {
        name: "Architecte 10 défis · Débloqué",
        exact: true,
      })
      .click();
    await expect(save).toBeInViewport();
    // Keyboard focus stays inside the modal, including after wrapping.
    await dialog.getByRole("button", { name: "Fermer", exact: true }).focus();
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
      await expect
        .poll(() =>
          dialog.evaluate((el) => el.contains(document.activeElement)),
        )
        .toBe(true);
    }
    await dialog.locator(".avatar-settings-preview").scrollIntoViewIfNeeded();
    await dialog.screenshot({
      path: `/tmp/clik-avatar-dialog-${width}-${info.project.name}.png`,
    });
    await dialog.getByRole("button", { name: "Fermer", exact: true }).click();
    await expect(dialog).toBeHidden();
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator(".settings-security-grid").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `/tmp/clik-settings-security-${info.project.name}.png`,
  });
  await page
    .getByRole("navigation", { name: "Sections des paramètres" })
    .getByRole("link", { name: "Votre compte" })
    .click();
  await page
    .locator(".settings-danger-card")
    .getByRole("button", { name: "Supprimer mon compte" })
    .click();
  const confirmation = page.getByRole("alertdialog");
  await expect(
    confirmation.getByRole("heading", { name: "Supprimer votre compte ?" }),
  ).toBeVisible();
  await confirmation.getByRole("button", { name: "Annuler" }).click();
  expect(fixture.avatarSaves).toHaveLength(0);
});

test("paramètres : validation et enregistrement du nom public", async ({
  page,
}) => {
  await creatorsFixture(page, true);
  const names: string[] = [];
  await page.route("**/api/auth/update-user", async (route) => {
    names.push(route.request().postDataJSON().name);
    await route.fulfill({ json: { status: true } });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Compte de Camille", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Paramètres", exact: true }).click();
  const input = page.getByLabel("Nom public", { exact: true });
  const form = page.locator("form").filter({ has: input });
  const save = form.getByRole("button", { name: "Enregistrer", exact: true });
  await expect(save).toBeDisabled();
  await input.fill("A");
  await save.click();
  await expect(form).toContainText(
    "Votre nom doit contenir au moins 2 caractères.",
  );
  expect(names).toEqual([]);
  await input.fill("  Camille Clik  ");
  await save.click();
  await expect(input).toHaveValue("Camille Clik");
  await expect(save).toBeDisabled();
  expect(names).toEqual(["Camille Clik"]);
});
