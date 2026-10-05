import { test, expect } from "@playwright/test";
import { creatorsFixture } from "./fixtures/creators";

test("galerie : tri paginé, commentaires, clavier et retour à la liste", async ({
  page,
}, info) => {
  const fixture = await creatorsFixture(page);
  fixture.setComments("creation-16", 23);
  fixture.setComments("creation-0", 0);
  await page.goto("/gallery");
  const cards = page.locator(".public-creation-card");
  const sort = page.getByRole("combobox", { name: "Trier par" });
  await expect(cards).toHaveCount(12);
  await expect(sort).toHaveText("Les plus récentes");
  await expect(cards.first().getByRole("heading")).toHaveText(
    "La maison bleue 1",
  );
  await expect(
    cards
      .first()
      .getByRole("link", { name: "0 commentaires sur La maison bleue 1" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Voir plus de créations" }).click();
  await expect(cards).toHaveCount(17);

  await sort.click();
  await page.getByRole("option", { name: "Les plus commentées" }).click();
  await expect(page).toHaveURL(/sort=comments/);
  await expect(cards).toHaveCount(12);
  await expect(cards.first().getByRole("heading")).toHaveText(
    "Le petit phare 17",
  );
  await expect(cards.first().locator(".public-card-comments")).toHaveText("23");
  fixture.setComments("creation-16", 24);
  await expect(cards.first().locator(".public-card-comments")).toHaveText("24");
  await cards
    .first()
    .getByRole("link", { name: "24 commentaires sur Le petit phare 17" })
    .click();
  await expect(page).toHaveURL(/\/creations\/creation-16#comments$/);
  await expect(page.locator("#comments")).toBeInViewport();
  await page.goBack();
  await expect(sort).toHaveText("Les plus commentées");

  await sort.focus();
  await sort.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(sort).toHaveText("Les plus anciennes");
  await expect(cards.first().getByRole("heading")).toHaveText(
    "Le petit phare 17",
  );
  await page.reload();
  await expect(sort).toHaveText("Les plus anciennes");
  await expect(cards).toHaveCount(12);
  for (const width of [1440, 900, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `/tmp/clik-gallery-${info.project.name}-${width}.png`,
      fullPage: width === 390,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await sort.click();
    const menu = page.getByRole("listbox");
    await expect(menu).toBeVisible();
    const bounds = await menu.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await page.keyboard.press("Escape");
  }
});
