import { selectCameraView } from "./camera-view";
import { dragLibrary } from "./drag-library";
import { test, expect } from "@playwright/test";

test("une pièce pont éclaire les huit plots de ses deux supports", async ({
  page,
}, info) => {
  await page.goto("/editor");
  const brick = page
    .getByRole("region", { name: "Modèles de pièces" })
    .getByRole("button", { name: "Brique 2 × 2", exact: true });
  await brick.click();
  await brick.click();
  const xField = page.getByLabel("position X", { exact: true });
  await xField.fill("2");
  await xField.press("Tab");
  await page
    .locator(".tree-name")
    .first()
    .click({ modifiers: ["Shift"] });
  await selectCameraView(page, "top");
  await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
  const canvas = page.locator("canvas").first();
  await expect(canvas).toHaveAttribute("data-rendered", "2");
  const box = (await canvas.boundingBox())!;
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await dragLibrary(page, "Plaque 2 × 4", x + 15, y + 15);
  await expect(canvas).toHaveAttribute("data-snap-kind", "attachment");
  await expect(canvas).toHaveAttribute("data-snap-points", "8");
  await page.screenshot({
    path: `/tmp/clik-multiple-supports-${info.project.name}.png`,
  });
  await page.mouse.up();
  await expect(page.getByLabel("position Y", { exact: true })).toHaveValue(
    "1.2",
  );
  await expect(xField).toHaveValue("1");
  // Check the same preview when picking up an existing piece.
  await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 15, y + 15, { steps: 5 });
  await expect(canvas).toHaveAttribute("data-snap-kind", "attachment");
  await expect(canvas).toHaveAttribute("data-snap-points", "8");
  await page.mouse.up();
  await expect(page.getByLabel("position Y", { exact: true })).toHaveValue(
    "1.2",
  );
});
