import { test, expect } from "@playwright/test";

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
  for (const width of [1440, 900, 768, 641, 640, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of ["L’atelier", "La galerie", "Mes créations"]) {
      await expect(nav.getByRole("link", { name })).toBeVisible();
      await expect(nav.getByRole("link", { name })).toBeInViewport();
    }
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
  await nav.getByRole("link", { name: "La galerie" }).click();
  await expect(page).toHaveURL(/\/gallery$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "La galerie",
  );
  await page.screenshot({
    path: `/tmp/clik-header-mobile-${info.project.name}.png`,
  });
  await nav.getByRole("link", { name: "Mes créations" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await header.getByRole("link", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  expect(
    await page.evaluate(() => sessionStorage.getItem("clik-return-to")),
  ).toBe("/projects");
});
