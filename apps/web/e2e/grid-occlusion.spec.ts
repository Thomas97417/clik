import { waitForSceneUpdate } from "./wait-for-scene";
import { selectCameraView } from "./camera-view";
import { test, expect } from "@playwright/test";

test("une pièce opaque masque la grille pendant le zoom sous plusieurs angles", async ({
  page,
}, info) => {
  await page.goto("/editor");
  await page
    .getByRole("button", { name: "Tuile lisse 2 × 2", exact: true })
    .click();
  await page.getByRole("button", { name: "Rouge", exact: true }).click();
  const canvas = page.locator("canvas").first();
  await expect(canvas).toHaveAttribute("data-rendered", "1");
  const box = (await canvas.boundingBox())!;
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  for (const view of ["top", "perspective", "front"]) {
    await selectCameraView(page, view);
    await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();

    await waitForSceneUpdate(page);
    const recording = page.evaluate(async () => {
      const canvas = document.querySelector("canvas")!;
      const surface = document.createElement("canvas");
      surface.width = 10;
      surface.height = 10;
      const ctx = surface.getContext("2d")!;
      (window as any).__stopOcclusionRecording = false;
      const frames: number[] = [];
      while (!(window as any).__stopOcclusionRecording) {
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
        // Stay inside the thin front face, including the editor's wider framing.
        ctx.drawImage(
          canvas,
          canvas.width / 2 - 5,
          canvas.height / 2 - 5,
          10,
          10,
          0,
          0,
          10,
          10,
        );
        const { data } = ctx.getImageData(0, 0, 10, 10);
        let uncovered = 0;
        for (let i = 0; i < data.length; i += 4)
          // Selection and tone mapping lighten red; grid pixels stay neutral.
          if (data[i] - Math.max(data[i + 1], data[i + 2]) < 20) uncovered++;
        frames.push(uncovered);
      }
      return frames;
    });
    await page.mouse.move(x, y);
    for (const direction of [-1, 1])
      for (let i = 0; i < 18; i++) await page.mouse.wheel(0, direction * 120);
    await page.evaluate(() => {
      (window as any).__stopOcclusionRecording = true;
    });
    const frames = await recording;
    await test.info().attach(`occlusion-${view}`, {
      body: JSON.stringify(frames),
      contentType: "application/json",
    });
    await page.screenshot({
      path: `/tmp/clik-grid-occlusion-${view}-${info.project.name}.png`,
    });
    expect(frames.length).toBeGreaterThan(10);
    expect(Math.max(...frames), `${view}: la grille traverse la tuile`).toBe(0);
  }
});
