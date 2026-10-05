import { selectCameraView } from "./camera-view";
import { test, expect, type Page } from "@playwright/test";

async function pixels(page: Page) {
  return page
    .locator("canvas")
    .first()
    .evaluate(async (canvas: HTMLCanvasElement) => {
      const image = new Image();
      image.src = canvas.toDataURL();
      await image.decode();
      const surface = document.createElement("canvas");
      surface.width = canvas.width;
      surface.height = canvas.height;
      const ctx = surface.getContext("2d")!;
      ctx.drawImage(image, 0, 0);
      const { data } = ctx.getImageData(
        Math.floor(canvas.width * 0.4),
        Math.floor(canvas.height * 0.4),
        Math.floor(canvas.width * 0.2),
        Math.floor(canvas.height * 0.2),
      );
      let grid = 0,
        red = 0,
        brightness = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] < 220 && data[i + 1] < 230) grid++;
        if (data[i] > data[i + 1] * 1.3 && data[i] > data[i + 2] * 1.3) {
          red++;
          brightness += data[i];
        }
      }
      return { grid, red, brightness: red ? brightness / red : 0 };
    });
}

test("l’éclairage uniforme éclaire les côtés et restaure la lumière orientable sans modifier la construction", async ({
  page,
}, info) => {
  await page.goto("/editor");
  const toggle = page.getByRole("button", {
    name: "Éclairage uniforme",
    exact: true,
  });
  const slider = page.getByRole("slider", { name: "Angle de l’éclairage" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(slider).toBeEnabled();
  await page.getByRole("button", { name: "Brique 2 × 2", exact: true }).click();
  await page.getByRole("button", { name: "Rouge", exact: true }).click();
  await page.getByRole("button", { name: "Grille", exact: true }).click();
  await selectCameraView(page, "front");
  await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
  await slider.fill("180");
  await expect.poll(async () => (await pixels(page)).red).toBeGreaterThan(100);
  // Wait for camera damping before comparing the same face across lighting modes.
  await page.waitForTimeout(500);
  const directional = (await pixels(page)).brightness;
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(slider).toBeDisabled();
  await expect
    .poll(async () => (await pixels(page)).brightness - directional)
    .toBeGreaterThan(5);
  const uniform = (await pixels(page)).brightness;
  await selectCameraView(page, "right");
  await expect
    .poll(async () => Math.abs((await pixels(page)).brightness - uniform))
    .toBeLessThan(8);
  await selectCameraView(page, "perspective");
  await page.screenshot({
    path: `/tmp/clik-uniform-lighting-${info.project.name}.png`,
  });
  await selectCameraView(page, "front");
  await toggle.focus();
  await toggle.press("Space");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(slider).toBeEnabled();
  await expect(slider).toHaveValue("180");
  await expect
    .poll(async () => Math.abs((await pixels(page)).brightness - directional))
    .toBeLessThan(2);
  for (const axis of ["X", "Y", "Z"])
    await expect(
      page.getByLabel(`position ${axis}`, { exact: true }),
    ).toHaveValue("0");
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  await expect.poll(async () => (await pixels(page)).red).toBe(0);
});

test("masquer la grille conserve l’aimantation et l’historique des pièces", async ({
  page,
}) => {
  await page.goto("/editor");
  const canvas = page.locator("canvas").first();
  await expect(canvas).toHaveAttribute("data-rendered", "0");
  const grid = page.getByRole("button", { name: "Grille", exact: true });
  await expect(grid).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => (await pixels(page)).grid).toBeGreaterThan(100);
  await grid.click();
  await expect(grid).toHaveAttribute("aria-pressed", "false");
  await expect.poll(async () => (await pixels(page)).grid).toBe(0);
  await expect(
    page.getByRole("button", { name: "Aimantation", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Brique 1 × 2", exact: true }).click();
  await expect(page.getByLabel("position Z", { exact: true })).toHaveValue(
    "0.5",
  );
  await grid.click();
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-rendered", "0");
  await expect.poll(async () => (await pixels(page)).grid).toBeGreaterThan(100);
  await expect(
    page.getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true }),
  ).toBeDisabled();
});

test("le curseur éclaire l’autre côté sans déplacer la pièce, y compris au clavier", async ({
  page,
}, info) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Brique 2 × 2", exact: true }).click();
  await page.getByRole("button", { name: "Rouge", exact: true }).click();
  await page.getByRole("button", { name: "Grille", exact: true }).click();
  await selectCameraView(page, "front");
  await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
  await expect.poll(async () => (await pixels(page)).red).toBeGreaterThan(100);
  const before = (await pixels(page)).brightness;
  const slider = page.getByRole("slider", { name: "Angle de l’éclairage" });
  await expect(slider).toHaveValue("0");
  await slider.fill("180");
  await expect(slider).toHaveAttribute("aria-valuetext", "180 degrés");
  await expect
    .poll(async () => Math.abs((await pixels(page)).brightness - before))
    .toBeGreaterThan(10);
  for (const axis of ["X", "Y", "Z"])
    await expect(
      page.getByLabel(`position ${axis}`, { exact: true }),
    ).toHaveValue("0");
  await slider.focus();
  await slider.press("ArrowRight");
  await expect(slider).toHaveValue("185");
  await slider.press("End");
  await expect(slider).toHaveValue("360");
  await expect
    .poll(async () => Math.abs((await pixels(page)).brightness - before))
    .toBeLessThan(2);
  await page.setViewportSize({ width: 900, height: 760 });
  const viewport = (await page.locator(".viewport").boundingBox())!;
  const controls = (await page.locator(".scene-light-control").boundingBox())!;
  const toolbar = (await page.locator(".scene-toolbar").boundingBox())!;
  expect(controls.x).toBeGreaterThanOrEqual(viewport.x);
  expect(controls.x + controls.width).toBeLessThanOrEqual(
    viewport.x + viewport.width,
  );
  expect(controls.y).toBeGreaterThan(toolbar.y + toolbar.height);
  expect(controls.y).toBeGreaterThan(viewport.y + viewport.height - 100);
  expect(controls.y + controls.height).toBeLessThanOrEqual(
    viewport.y + viewport.height,
  );
  await expect(
    page.locator(".viewport-bottom").getByLabel("Vue de la caméra"),
  ).toBeVisible();
  await expect(page.locator(".viewport-bottom")).not.toContainText(
    "Glisser une pièce",
  );
  await page.screenshot({
    path: `/tmp/clik-display-controls-${info.project.name}.png`,
  });
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  // The last scene edit was the color; changing the lighting adds no undo step.
  await expect.poll(async () => (await pixels(page)).red).toBe(0);
  await expect(slider).toHaveValue("360");
});
