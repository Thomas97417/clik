import { test, expect } from "@playwright/test";
import { selectCameraView } from "./camera-view";

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
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(position("Z")).toHaveValue("0");
  await page.keyboard.press("Escape");
  await page.locator(".tree-name").click();
  await page.keyboard.press("Control+ArrowRight");
  await page.keyboard.press("Alt+ArrowUp");
  await page.keyboard.press("Shift+ArrowRight");
  await expect(position("X")).toHaveValue("0");
  await expect(position("Y")).toHaveValue("0");
  await expect(position("Z")).toHaveValue("0");
});

test("les flèches suivent la vue choisie et une rotation libre de 180°", async ({
  page,
}) => {
  await page.goto("/editor");
  const canvas = page.locator("canvas").first();
  await expect(canvas).toHaveAttribute("data-rendered", "0");
  await page.getByRole("button", { name: "Brique 2 × 2", exact: true }).click();
  const position = (axis: string) =>
    page.getByLabel(`position ${axis}`, { exact: true });
  for (const view of ["right", "top"]) {
    await selectCameraView(page, view);
    await page.locator(".tree-name").click();
    await page.keyboard.press("ArrowRight");
    await expect(position("Z")).toHaveValue("-1");
    await expect(position("X")).toHaveValue("0");
    await page.keyboard.press("ArrowUp");
    await expect(position("X")).toHaveValue("-1");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowLeft");
    await expect(position("X")).toHaveValue("0");
    await expect(position("Z")).toHaveValue("0");
  }

  await selectCameraView(page, "front");
  const box = (await canvas.boundingBox())!;
  // OrbitControls turns by 2π for a drag spanning the canvas height.
  const startX = box.x + 60;
  const y = box.y + box.height * 0.2;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX + box.height / 2, y, { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(800); // Let the orbit's residual damping finish.
  await page.locator(".tree-name").click();
  await page.keyboard.press("ArrowRight");
  await expect(position("X")).toHaveValue("-1");
  await expect(position("Z")).toHaveValue("0");
  await page.keyboard.press("ArrowUp");
  await expect(position("Z")).toHaveValue("1");
  await page.keyboard.press("Shift+ArrowUp");
  await expect(position("Y")).toHaveValue("1.2");
  await page.keyboard.press("Control+z");
  await page.locator(".tree-name").click();
  await expect(position("Y")).toHaveValue("0");
  await expect(position("X")).toHaveValue("-1");
  await expect(position("Z")).toHaveValue("1");

  // Resetting the view must immediately restore its corresponding directions.
  await selectCameraView(page, "perspective");
  await page.locator(".tree-name").click();
  await page.keyboard.press("ArrowRight");
  await expect(position("X")).toHaveValue("0");
  await page.keyboard.press("ArrowUp");
  await expect(position("Z")).toHaveValue("0");
});
