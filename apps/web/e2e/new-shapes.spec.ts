import { test, expect } from "@playwright/test";
import { dragLibrary } from "./drag-library";

test("rondes, angles et arches : glisser, tourner et annuler depuis la bibliothèque", async ({
  page,
}, info) => {
  await page.goto("/editor");
  const canvas = page.locator("canvas").first();
  await expect(canvas).toHaveAttribute("data-rendered", "0");
  const box = (await canvas.boundingBox())!;
  for (const [category, name] of [
    ["Rondes", "Brique ronde 1 × 1"],
    ["Angles", "Plaque d’angle 2 × 2"],
    ["Arches", "Arche 1 × 6 × 3"],
  ]) {
    await page.getByRole("button", { name: category, exact: true }).click();
    await dragLibrary(
      page,
      name,
      box.x + box.width / 2,
      box.y + box.height / 2,
    );
    await page.keyboard.press("r");
    await page.mouse.up();
    await expect(canvas).toHaveAttribute("data-rendered", "1");
    await expect(page.getByLabel("rotation Y", { exact: true })).toHaveValue(
      "90",
    );
    await page.screenshot({
      path: `/tmp/clik-new-${category}-${info.project.name}.png`,
    });
    await page
      .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
      .click();
    await expect(canvas).toHaveAttribute("data-rendered", "0");
  }
});

test("une arche permet de construire sous son ouverture mais protège sa voûte", async ({
  page,
}, info) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Arches", exact: true }).click();
  await page
    .getByRole("button", { name: "Arche 1 × 4 × 3", exact: true })
    .click();
  await page.getByRole("button", { name: "Briques", exact: true }).click();
  await page.getByRole("button", { name: "Brique 1 × 1", exact: true }).click();
  await page.getByRole("button", { name: "Rouge", exact: true }).click();
  for (const [axis, value] of [
    ["Z", "0.5"],
    ["X", "0"],
    ["Y", "0"],
  ]) {
    const field = page.getByLabel(`position ${axis}`, { exact: true });
    await field.fill(value);
    await field.press("Tab");
  }
  await expect(page.getByLabel("position Y", { exact: true })).toHaveValue("0");
  await page.screenshot({
    path: `/tmp/clik-arch-opening-${info.project.name}.png`,
  });
  const y = page.getByLabel("position Y", { exact: true });
  await y.fill("2.2");
  await y.press("Tab");
  await expect(y).toHaveValue("3.6");
  await expect(page.locator(".overlap")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  await page.locator(".tree-name").last().click();
  await expect(y).toHaveValue("0");
});
