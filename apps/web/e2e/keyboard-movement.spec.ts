import { test, expect } from "@playwright/test";

test("flèches : grille, hauteur, répétition et annuler/rétablir", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.locator('.piece-card[aria-label="Brique 2 × 2"]').click();
  const position = (axis: string) =>
    page.getByLabel(`position ${axis}`, { exact: true });
  await page.keyboard.press("ArrowRight");
  await expect(position("X")).toHaveValue("1");
  await page.keyboard.press("ArrowLeft");
  await expect(position("X")).toHaveValue("0");
  await page.keyboard.press("ArrowUp");
  await expect(position("Z")).toHaveValue("-1");
  await page.keyboard.press("ArrowDown");
  await expect(position("Z")).toHaveValue("0");
  await page.keyboard.press("Shift+ArrowDown");
  await expect(position("Y")).toHaveValue("0");
  await page.keyboard.press("Shift+ArrowUp");
  await expect(position("Y")).toHaveValue("1.2");
  await page.keyboard.press("Shift+ArrowDown");
  await expect(position("Y")).toHaveValue("0");
  await page.keyboard.press("Shift+ArrowUp");
  await page.keyboard.press("Control+z");
  await page.locator(".tree-name").click();
  await expect(position("Y")).toHaveValue("0");
  await page.keyboard.press("Control+Shift+z");
  await page.locator(".tree-name").click();
  await expect(position("Y")).toHaveValue("1.2");
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("ArrowRight");
  await page.keyboard.up("ArrowRight");
  await expect(position("X")).toHaveValue("2");
});

test("les champs, les contrôles et les modificateurs gardent leurs flèches", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.locator('.piece-card[aria-label="Brique 2 × 2"]').click();
  const position = (axis: string) =>
    page.getByLabel(`position ${axis}`, { exact: true });
  await page.getByLabel("Nom du projet").focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Shift+ArrowUp");
  await expect(position("X")).toHaveValue("0");
  await expect(position("Y")).toHaveValue("0");
  await page.getByLabel("Vue de la caméra").focus();
  await page.keyboard.press("ArrowDown");
  await expect(position("Z")).toHaveValue("0");
  await page.locator(".tree-name").click();
  await page.keyboard.press("Control+ArrowRight");
  await page.keyboard.press("Alt+ArrowUp");
  await page.keyboard.press("Shift+ArrowRight");
  await expect(position("X")).toHaveValue("0");
  await expect(position("Y")).toHaveValue("0");
  await expect(position("Z")).toHaveValue("0");
});
