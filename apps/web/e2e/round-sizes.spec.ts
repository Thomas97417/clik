import { selectCameraView } from "./camera-view";
import { test, expect } from "@playwright/test";
import { dragLibrary } from "./drag-library";

for (const [size, sockets] of [
  [2, 4],
  [8, 44],
]) {
  test(`rondes ${size} × ${size} : aperçu, rotation, emboîtement et sauvegarde`, async ({
    page,
  }, info) => {
    await page.goto("/editor");
    const canvas = page.locator("canvas").first();
    await expect(canvas).toHaveAttribute("data-rendered", "0");
    await page.getByRole("button", { name: "Rondes", exact: true }).click();
    await expect(page.locator(".piece-card")).toHaveCount(13);
    await page
      .getByRole("button", {
        name: `Plaque ronde ${size} × ${size}`,
        exact: true,
      })
      .click();
    await selectCameraView(page, "top");
    await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
    const box = (await canvas.boundingBox())!;
    await dragLibrary(
      page,
      `Tuile ronde ${size} × ${size}`,
      box.x + box.width / 2,
      box.y + box.height / 2,
    );
    await page.keyboard.press("r");
    await expect(canvas).toHaveAttribute("data-snap-kind", "attachment");
    await expect(canvas).toHaveAttribute("data-snap-points", String(sockets));
    await page.screenshot({
      path: `/tmp/clik-round-preview-${size}-${info.project.name}.png`,
    });
    await page.mouse.up();
    await expect(canvas).toHaveAttribute("data-rendered", "2");
    await expect(page.getByLabel("position Y", { exact: true })).toHaveValue(
      "0.4",
    );
    await expect(page.getByLabel("rotation Y", { exact: true })).toHaveValue(
      "90",
    );
    await selectCameraView(page, "perspective");
    await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
    await page.screenshot({
      path: `/tmp/clik-round-stack-${size}-${info.project.name}.png`,
    });
    await expect(page.getByRole("status")).toContainText("Enregistré");
    await page.reload();
    await expect(canvas).toHaveAttribute("data-rendered", "2");
    await expect(page.locator(".tree-name")).toHaveText([
      `Plaque ronde ${size} × ${size}`,
      `Tuile ronde ${size} × ${size}`,
    ]);
  });
}
