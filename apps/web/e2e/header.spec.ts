import { test, expect } from "@playwright/test";
import { projectsFixture } from "./fixtures/projects";

test("la navigation reste accessible au clavier et indique la page courante", async ({
  page,
}, info) => {
  await page.goto("/projects");
  await expect(page.locator(".projects-count")).toContainText("affichée");
  const header = page.locator(".site-header");
  const nav = header.getByRole("navigation", { name: "Navigation principale" });
  await expect(
    nav.getByRole("link", { name: "Mes créations" }),
  ).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "La galerie" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/gallery$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "La galerie",
  );
  await expect(nav.getByRole("link", { name: "La galerie" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(
    nav.getByRole("link", { name: "Mes créations" }),
  ).not.toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "L’atelier" }).click();
  await expect(page.getByLabel("Nom du projet")).toBeEnabled();
  await expect(nav.getByRole("link", { name: "L’atelier" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  for (const width of [1440, 1100, 900]) {
    await page.setViewportSize({ width, height: 1000 });
    const footer = (await page.locator(".editor-footer").boundingBox())!;
    expect(footer.y + footer.height).toBeLessThanOrEqual(1001);
    await expect(page.locator(".editor-footer")).toBeInViewport();
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: `/tmp/clik-header-editor-${info.project.name}.png`,
  });
  await header.getByRole("link", { name: "clik. — Accueil" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Un petit clik.",
  );
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(0);
  await page.screenshot({
    path: `/tmp/clik-header-home-${info.project.name}.png`,
  });
});

test("toutes les rubriques restent disponibles sur mobile et la connexion garde le retour", async ({
  page,
}, info) => {
  await page.goto("/projects");
  await expect(page.locator(".projects-count")).toContainText("affichée");
  const header = page.locator(".site-header");
  const nav = header.getByRole("navigation", { name: "Navigation principale" });
  for (const width of [
    1440, 1200, 1101, 1100, 1024, 900, 800, 761, 760, 681, 680, 640, 390, 320,
  ]) {
    await page.setViewportSize({ width, height: 900 });
    const compact = width <= 680;
    const trigger = nav.getByRole("button", { name: "Explorer les rubriques" });
    const before = (await header.boundingBox())!;
    expect(before.height).toBeLessThanOrEqual(76);
    const brand = (await header.locator(".brand").boundingBox())!;
    const account = (await header.locator(".header-account").boundingBox())!;
    expect(
      Math.abs(brand.y + brand.height / 2 - account.y - account.height / 2),
    ).toBeLessThan(2);
    if (compact) await trigger.click();
    for (const name of [
      "L’atelier",
      "La galerie",
      "Les défis",
      "Mes créations",
    ]) {
      const item = compact
        ? page.getByRole("menuitem", { name })
        : nav.getByRole("link", { name });
      await expect(item).toBeVisible();
      await expect(item).toBeInViewport();
    }
    if (compact) {
      await expect(
        page.getByRole("menuitem", { name: "Mes créations" }),
      ).toHaveAttribute("aria-current", "page");
      expect((await header.boundingBox())!.height).toBe(before.height);
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
    }
    if ([1440, 900, 681, 680, 320].includes(width))
      await header.screenshot({
        path: `/tmp/clik-header-simple-${width}-${info.project.name}.png`,
      });
    await expect(
      header.getByRole("link", { name: "Se connecter" }),
    ).toBeInViewport();
    expect(
      await header.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await nav
    .getByRole("button", { name: "Explorer les rubriques" })
    .press("Enter");
  await page.getByRole("menuitem", { name: "La galerie" }).click();
  await expect(page.getByRole("menu")).toBeHidden();
  await expect(page).toHaveURL(/\/gallery$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "La galerie",
  );
  await page.screenshot({
    path: `/tmp/clik-header-mobile-${info.project.name}.png`,
  });
  await nav.getByRole("button", { name: "Explorer les rubriques" }).click();
  await page.getByRole("menuitem", { name: "Mes créations" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await nav.getByRole("button", { name: "Explorer les rubriques" }).click();
  await page.setViewportSize({ width: 900, height: 900 });
  // Wait for the compact menu to unmount, not only for its CSS to hide it.
  await expect(
    nav.getByRole("button", { name: "Explorer les rubriques" }),
  ).toHaveCount(0);
  await expect(page.getByRole("menu")).toBeHidden();
  await expect(nav.getByRole("link", { name: "Mes créations" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await header.getByRole("link", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  expect(
    await page.evaluate(() => sessionStorage.getItem("clik-return-to")),
  ).toBe("/projects");
});

test("le compte reste utilisable avec un nom long et son menu tient sur mobile", async ({
  page,
}, info) => {
  const name = "Camille de la Vallée des Constructions Extraordinaires";
  const email = "camille.constructions.extraordinaires@example.test";
  await projectsFixture(page, { userName: name, userEmail: email });
  await page.goto("/");
  const account = page.getByRole("button", {
    name: `Compte de ${name}`,
    exact: true,
  });
  await expect(account).toBeVisible();
  for (const width of [1440, 1101, 1100, 900, 761, 760, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(account).toBeInViewport();
    expect(
      await page
        .locator(".site-header")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await account.click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByText(email, { exact: true })).toBeVisible();
    for (const label of [
      "Mes créations",
      "Ma page publique",
      "Paramètres",
      "Se déconnecter",
    ]) {
      await expect(
        menu.getByRole("menuitem", { name: label, exact: true }),
      ).toBeInViewport();
    }
    const box = (await menu.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    if ([1440, 900, 320].includes(width))
      await page.screenshot({
        path: `/tmp/clik-header-account-${width}-${info.project.name}.png`,
      });
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(account).toBeFocused();
  }
  await account.press("Enter");
  await page
    .getByRole("menuitem", { name: "Mes créations", exact: true })
    .click();
  await expect(page).toHaveURL(/\/projects$/);
});
