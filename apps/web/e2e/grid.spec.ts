import { test, expect, type Page } from "@playwright/test";

const coordinates = (page: Page) =>
  Promise.all(
    ["X", "Y", "Z"].map(async (axis) =>
      Number(
        await page.getByLabel(`position ${axis}`, { exact: true }).inputValue(),
      ),
    ),
  );
async function gridPixels(page: Page) {
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
      const { data, width, height } = ctx.getImageData(
        0,
        0,
        surface.width,
        surface.height,
      );
      let lines = 0;
      // Empty scene: only floor lines can darken this central area, away from the HUD.
      for (let y = Math.floor(height * 0.25); y < height * 0.75; y++)
        for (let x = Math.floor(width * 0.25); x < width * 0.75; x++) {
          const i = (y * width + x) * 4;
          if (data[i] < 220 && data[i + 1] < 230) lines++;
        }
      return lines;
    });
}

test("grille lisible au zoom maximal, au-dessus et en dessous du plan", async ({
  page,
}, info) => {
  await page.goto("/editor");
  const canvas = page.locator("canvas").first();
  await expect(canvas).toHaveAttribute("data-rendered", "0");
  await page.getByLabel("Vue de la caméra").selectOption("top");
  const box = (await canvas.boundingBox())!;
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await expect.poll(() => gridPixels(page)).toBeGreaterThan(200);
  await page.mouse.move(x, y);
  for (let i = 0; i < 30; i++) await page.mouse.wheel(0, -200);
  const frames = Number(await canvas.getAttribute("data-frames"));
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-frames")))
    .toBeGreaterThan(frames + 2);
  await expect.poll(() => gridPixels(page)).toBeGreaterThan(200);
  await page.screenshot({
    path: `/tmp/clik-grid-close-${info.project.name}.png`,
  });
  await page.mouse.down();
  await page.mouse.move(x, y - box.height * 0.48, { steps: 20 });
  await page.mouse.up();
  await expect.poll(() => gridPixels(page)).toBeGreaterThan(200);
  await page.screenshot({
    path: `/tmp/clik-grid-below-${info.project.name}.png`,
  });
});

test("pièce impaire : ajout, déplacement et quart de tour occupent des cases entières", async ({
  page,
}, info) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Brique 1 × 2", exact: true }).click();
  expect(await coordinates(page)).toEqual([0, 0, 0.5]);
  await page.getByLabel("Vue de la caméra").selectOption("top");
  await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
  const canvas = page.locator("canvas").first();
  await expect(canvas).toHaveAttribute("data-rendered", "1");
  const box = (await canvas.boundingBox())!;
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 80, y + 35, { steps: 12 });
  await expect(canvas).toHaveAttribute("data-snap-kind", "grid");
  await page.mouse.wheel(0, -100);
  const frames = Number(await canvas.getAttribute("data-frames"));
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-frames")))
    .toBeGreaterThan(frames + 2);
  await page.screenshot({
    path: `/tmp/clik-grid-footprint-${info.project.name}.png`,
  });
  await page.mouse.up();
  await expect(page.getByLabel("rotation Y", { exact: true })).toHaveValue(
    "90",
  );
  const [px, py, pz] = await coordinates(page);
  expect(px - 0.5).toBe(Math.round(px - 0.5));
  expect(pz).toBe(Math.round(pz));
  expect(py).toBe(0);
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  await page.locator(".tree-name").first().click();
  expect(await coordinates(page)).toEqual([0, 0, 0.5]);
});
