import { test, expect } from "@playwright/test";
import { selectCameraView } from "./camera-view";
import { dragLibrary } from "./drag-library";

test("nouvelles familles : glisser, tourner, emboîter et annuler chaque forme", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto("/editor");
  const canvas = page.locator("canvas").first();
  await expect(canvas).toHaveAttribute("data-rendered", "0");
  await page.getByRole("button", { name: "Plaque 4 × 4", exact: true }).click();
  await selectCameraView(page, "top");

  for (const [category, name, points] of [
    ["Pentes", "Pente inversée 2 × 2", 2],
    ["Pentes", "Pente courbe 2 × 2", 4],
    ["Rondes", "Plaque quart de cercle 2 × 2", 3],
    ["Rondes", "Cône 2 × 2", 4],
    ["Rondes", "Dôme 2 × 2", 4],
    ["Tuiles", "Tuile grille 1 × 2", 2],
    ["Briques", "Brique maçonnerie 1 × 2", 2],
  ] as const) {
    await page.getByRole("button", { name: category, exact: true }).click();
    await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
    const bounds = (await canvas.boundingBox())!;
    await dragLibrary(
      page,
      name,
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    await page.keyboard.press("r");
    await expect(canvas, name).toHaveAttribute("data-snap-kind", "attachment");
    await expect(canvas, name).toHaveAttribute(
      "data-snap-points",
      String(points),
    );
    await page.mouse.up();
    await expect(canvas).toHaveAttribute("data-rendered", "2");
    await expect(
      page.getByLabel("position Y", { exact: true }),
      name,
    ).toHaveValue("0.4");
    await expect(
      page.getByLabel("rotation Y", { exact: true }),
      name,
    ).toHaveValue("90");
    await expect(page.locator(".tree-row.selected .tree-name")).toHaveText(
      name,
    );
    await page
      .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
      .click();
    await expect(canvas).toHaveAttribute("data-rendered", "1");
  }
  await page.screenshot({
    path: `/tmp/clik-new-families-${info.project.name}.png`,
  });
});
