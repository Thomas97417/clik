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
    await page.getByLabel("Vue de la caméra").selectOption(view);
    await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
    const ready = Number(await canvas.getAttribute("data-frames"));
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-frames")))
      .toBeGreaterThan(ready + 2);
    const recording = page.evaluate(async () => {
      const canvas = document.querySelector("canvas")!;
      const surface = document.createElement("canvas");
      surface.width = 20;
      surface.height = 20;
      const ctx = surface.getContext("2d")!;
      (window as any).__stopOcclusionRecording = false;
      const frames: number[] = [];
      while (!(window as any).__stopOcclusionRecording) {
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
        // The central patch stays inside the solid red tile at every tested zoom.
        ctx.drawImage(
          canvas,
          canvas.width / 2 - 10,
          canvas.height / 2 - 10,
          20,
          20,
          0,
          0,
          20,
          20,
        );
        const { data } = ctx.getImageData(0, 0, 20, 20);
        let uncovered = 0;
        for (let i = 0; i < data.length; i += 4)
          if (data[i] < data[i + 1] * 1.3 || data[i] < data[i + 2] * 1.3)
            uncovered++;
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
