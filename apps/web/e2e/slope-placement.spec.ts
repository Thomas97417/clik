import { selectCameraView } from "./camera-view";
import { dragLibrary } from "./drag-library";
import { test, expect } from "@playwright/test";

for (const snap of [true, false]) {
  test(`une pièce reste au-dessus de la rampe (aimantation ${snap})`, async ({
    page,
  }, info) => {
    await page.goto("/editor");
    await page
      .getByRole("button", { name: "Pente 3 × 2", exact: true })
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
    const x = box.x + box.width / 2,
      y = box.y + box.height / 2;
    await dragLibrary(page, "Brique 1 × 1", x, y);
    await expect(canvas).toHaveAttribute(
      "data-snap-kind",
      snap ? "grid" : "none",
    );
    await expect(canvas).toHaveAttribute("data-snap-points", "0");
    await page.mouse.up();
    const height = page.getByLabel("position Y", { exact: true });
    expect(Number(await height.inputValue())).toBeGreaterThanOrEqual(1.19);
    await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 15, y + 10, { steps: 8 });
    await expect(canvas).toHaveAttribute("data-dragging", "true");
    const frame = Number(await canvas.getAttribute("data-frames"));
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-frames")))
      .toBeGreaterThan(frame + 2);
    await page.mouse.up();
    const z = Number(
      await page.getByLabel("position Z", { exact: true }).inputValue(),
    );
    // Ramp center is z=0.5; check its height under the brick's uphill edge.
    const localEdge = Math.min(0.5, z - 0.5 + 0.49);
    const roof = 0.25 + (0.95 * (localEdge + 1.5)) / 2;
    expect(Number(await height.inputValue())).toBeGreaterThanOrEqual(
      roof - 0.002,
    );
    await selectCameraView(page, "perspective");
    await page.screenshot({
      path: `/tmp/clik-ramp-placement-${snap}-${info.project.name}.png`,
    });
  });
}
