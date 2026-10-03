import { selectCameraView } from "./camera-view";
import { test, expect } from "@playwright/test";
import { dragLibrary } from "./drag-library";

test("les propriétés refusent une pénétration et affichent la position corrigée", async ({
  page,
}) => {
  await page.goto("/editor");
  const brick = page.locator('.piece-card[aria-label="Brique 2 × 2"]');
  await brick.click();
  await brick.click();
  const x = page.getByLabel("position X", { exact: true });
  const y = page.getByLabel("position Y", { exact: true });
  const originalX = await x.inputValue();
  await x.fill("0");
  await x.press("Tab");
  await expect(y).toHaveValue("1.2");
  await y.fill("0");
  await y.press("Tab");
  await expect(y).toHaveValue("1.2");
  await expect(page.locator(".overlap")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  await page.locator(".tree-name").last().click();
  await expect(x).toHaveValue(originalX);
  await expect(y).toHaveValue("0");
});

test("une rotation pendant la prise évite la pièce voisine et reste annulable", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.locator('.piece-card[aria-label="Brique 2 × 2"]').click();
  await page.locator('.piece-card[aria-label="Brique 1 × 4"]').click();
  for (const [axis, value] of [
    ["Z", "2"],
    ["X", "0"],
    ["Y", "0"],
  ]) {
    const input = page.getByLabel(`position ${axis}`, { exact: true });
    await input.fill(value);
    await input.press("Tab");
  }
  await selectCameraView(page, "top");
  await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
  const canvas = page.locator("canvas").first();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.keyboard.press("r");
  await expect(canvas).toHaveAttribute("data-dragging", "true");
  await page.mouse.up();
  await expect(page.getByLabel("rotation Y", { exact: true })).toHaveValue(
    "90",
  );
  await expect(page.getByLabel("position Y", { exact: true })).toHaveValue(
    "1.2",
  );
  await expect(page.locator(".overlap")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  await page.locator(".tree-name").last().click();
  await expect(page.getByLabel("rotation Y", { exact: true })).toHaveValue("0");
  await expect(page.getByLabel("position Y", { exact: true })).toHaveValue("0");
});

for (const snap of [true, false]) {
  test(`une pièce large évite un obstacle à côté du pointeur, aimantation ${snap}`, async ({
    page,
  }) => {
    await page.goto("/editor");
    await page
      .getByRole("button", { name: "Brique 2 × 2", exact: true })
      .click();
    await selectCameraView(page, "top");
    await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
    if (!snap)
      await page
        .getByRole("button", { name: "Aimantation", exact: true })
        .click();
    const canvas = page.locator("canvas").first();
    await expect(canvas).toHaveAttribute("data-rendered", "1");
    const box = (await canvas.boundingBox())!;
    await dragLibrary(
      page,
      "Plaque 4 × 4",
      box.x + box.width / 2 + 200,
      box.y + box.height / 2,
    );
    await page.mouse.up();
    await expect(page.getByLabel("position Y", { exact: true })).toHaveValue(
      "1.2",
    );
    await expect(page.locator(".overlap")).toHaveCount(0);
  });
}
