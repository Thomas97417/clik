import { test, expect } from "@playwright/test";
import { CATALOG } from "@clik/scene";

test("catalogue étendu : aperçus entiers, ajout et restauration de chaque modèle", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/editor");
  const canvas = page.locator("canvas").first();
  await expect(canvas).toHaveAttribute("data-rendered", "0");
  let count = 0;
  for (const [category, prefix] of [
    ["Briques", "brick"],
    ["Plaques", "plate"],
    ["Pentes", "slope"],
    ["Tuiles", "tile"],
  ]) {
    await page.getByRole("button", { name: category, exact: true }).click();
    const models = Object.entries(CATALOG).filter(([type]) =>
      type.startsWith(prefix),
    );
    await expect(page.locator(".piece-card")).toHaveCount(models.length);
    await expect(page.locator(".piece-card img")).toHaveCount(models.length);
    // Inspect the rendered PNGs: every model is visible and clear of all edges.
    expect(
      await page.locator(".piece-card img").evaluateAll(async (images) => {
        return Promise.all(
          images.map(async (element) => {
            const image = element as HTMLImageElement;
            await image.decode();
            const surface = document.createElement("canvas");
            surface.width = image.naturalWidth;
            surface.height = image.naturalHeight;
            const ctx = surface.getContext("2d")!;
            ctx.drawImage(image, 0, 0);
            const { data } = ctx.getImageData(
              0,
              0,
              surface.width,
              surface.height,
            );
            let pixels = 0;
            for (let y = 0; y < surface.height; y++)
              for (let x = 0; x < surface.width; x++) {
                if (data[(y * surface.width + x) * 4 + 3] < 10) continue;
                if (
                  x < 2 ||
                  y < 2 ||
                  x >= surface.width - 2 ||
                  y >= surface.height - 2
                )
                  return false;
                pixels++;
              }
            return pixels > 100;
          }),
        );
      }),
    ).toEqual(models.map(() => true));
    await page.screenshot({
      path: `/tmp/clik-catalog-${prefix}-${info.project.name}.png`,
    });
    for (const [, model] of models) {
      await page.locator(`.piece-card[aria-label="${model.name}"]`).click();
      await expect(canvas).toHaveAttribute("data-rendered", String(++count));
      await expect(page.locator(".tree-row.selected .tree-name")).toHaveText(
        model.name,
      );
    }
  }
  await expect(page.getByRole("status")).toContainText("Enregistré");
  await page.reload();
  await expect(canvas).toHaveAttribute("data-rendered", "23");
  await expect(page.locator(".tree-name")).toHaveText(
    Object.values(CATALOG).map((model) => model.name),
  );
  expect(errors).toEqual([]);
});
