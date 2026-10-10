import { test, expect } from "@playwright/test";
import { creatorsFixture } from "./fixtures/creators";

test("créer sa version : connexion directe et page d’origine conservée", async ({
  page,
}) => {
  await creatorsFixture(page);
  await page.goto("/creations/creation-0");
  const create = page.getByRole("link", {
    name: "Créer votre version",
    exact: true,
  });
  await expect(create).toHaveAttribute("href", "/sign-in");
  await expect(page.locator(".creation-remixes-toggle")).toBeEnabled();
  await page
    .locator(".site-header")
    .evaluate((element) =>
      element.setAttribute("data-remix-check", "retained"),
    );
  await create.click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(
    page.getByRole("heading", { name: "Heureux de vous retrouver" }),
  ).toBeVisible();
  await expect(page.locator(".site-header")).toHaveAttribute(
    "data-remix-check",
    "retained",
  );
  await expect(page.locator(".site-header")).toBeInViewport();
  expect(
    await page.evaluate(() => sessionStorage.getItem("clik-return-to")),
  ).toBe("/creations/creation-0");
});

test("créer sa version : copie directe, erreur récupérable et header stable", async ({
  page,
}) => {
  const fixture = await creatorsFixture(page, true);
  await page.goto("/creations/creation-0");
  const create = page
    .locator(".creation-remixes")
    .getByRole("button", { name: "Créer votre version", exact: true });
  const mainCreate = page.locator(".creation-fork-button");
  const header = page.locator(".site-header");
  await expect(create).toBeEnabled();
  await header.evaluate((element) =>
    element.setAttribute("data-remix-check", "retained"),
  );
  fixture.failRemix(true);
  await create.click();
  await expect(
    page.getByText("Votre version n’a pas pu être créée. Réessayez.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/creations\/creation-0$/);
  await expect(create).toBeEnabled();
  await expect(mainCreate).toBeEnabled();
  await expect(header).toBeInViewport();

  fixture.failRemix(false);
  fixture.holdRemix(true);
  await page.setViewportSize({ width: 390, height: 950 });
  await create.click();
  await expect(page.locator(".creation-remixes-create")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await expect(page.locator(".creation-remixes-create")).toBeDisabled();
  await expect(mainCreate).toBeDisabled();
  await expect(mainCreate).toHaveText("Création de votre version…");
  expect(fixture.remixCalls).toEqual([
    { id: "creation-0", versionId: "version-creation-0" },
    { id: "creation-0", versionId: "version-creation-0" },
  ]);
  await mainCreate.evaluate((element: HTMLButtonElement) => element.click());
  expect(fixture.remixCalls).toHaveLength(2);
  await expect(header).toHaveAttribute("data-remix-check", "retained");
  await expect(header).toBeInViewport();
  expect(await page.evaluate(() => scrollY)).toBe(0);

  fixture.holdRemix(false);
  await expect(page).toHaveURL(/\/editor\/remixed-project$/);
  await expect(page.getByLabel("Nom du projet")).toHaveValue(
    "La maison bleue 1 · reprise",
  );
  await expect(page.getByLabel("Nom du projet")).toBeEnabled();
  await expect(page.locator(".tree-row")).toHaveCount(1);
  await expect(header).toHaveAttribute("data-remix-check", "retained");
  await expect(header).toBeInViewport();
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.locator(".project-sources summary").click();
  await expect(
    page
      .locator(".project-sources")
      .getByRole("link", { name: "« La maison bleue 1 » par Alice" }),
  ).toHaveAttribute("href", "/creations/creation-0");
});

test("reprises : pagination, repli au clavier, retrait et navigation", async ({
  page,
}, info) => {
  const fixture = await creatorsFixture(page);
  for (let i = 1; i <= 8; i++) fixture.setOrigin(`creation-${i}`, "creation-0");
  fixture.setPublished("creation-8", false);
  await page.goto("/creations/creation-0");
  const section = page.getByRole("region", {
    name: "À partir de cette création",
  });
  const toggle = section.getByRole("button", {
    name: "À partir de cette création",
  });
  const cards = section.locator(".public-creation-card");
  await expect(cards).toHaveCount(6);
  await expect(cards.first().getByRole("heading")).toHaveText(
    "Le petit phare 2",
  );
  await section.getByRole("button", { name: "Voir plus de versions" }).click();
  await expect(cards).toHaveCount(7);
  await expect(
    section.getByRole("button", { name: "Voir plus de versions" }),
  ).toHaveCount(0);
  await toggle.focus();
  await toggle.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(cards.first()).toBeHidden();
  await toggle.press("Space");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(cards).toHaveCount(7);
  await expect(cards.last()).toBeVisible();
  fixture.setPublished("creation-8", true);
  await expect(cards).toHaveCount(8);
  fixture.setPublished("creation-2", false);
  await expect(cards).toHaveCount(7);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    await toggle.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `/tmp/clik-remixes-${info.project.name}-${width}.png`,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await cards
    .first()
    .getByRole("link", { name: "Voir Le petit phare 2" })
    .click();
  await expect(page).toHaveURL(/\/creations\/creation-1$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Le petit phare 2",
  );
  await expect(
    section.getByText("La prochaine version pourrait être la vôtre."),
  ).toBeVisible();
  await toggle.click();
  await expect(
    section.getByText("La prochaine version pourrait être la vôtre."),
  ).toBeHidden();
});
