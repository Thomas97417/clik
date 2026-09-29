import { test, expect } from "@playwright/test";

test("la grille reste visible à chaque image pendant des allers-retours de zoom", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto("/editor");
  const canvas = page.locator("canvas").first();
  await expect(canvas).toHaveAttribute("data-rendered", "0");
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (const view of ["perspective", "front", "top"]) {
    await page.getByLabel("Vue de la caméra").selectOption(view);
    await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const recording = page.evaluate(async () => {
      const canvas = document.querySelector("canvas")!;
      const surface = document.createElement("canvas");
      surface.width = canvas.width;
      surface.height = canvas.height;
      const ctx = surface.getContext("2d")!;
      const frames: number[] = [];
      (window as any).__stopGridRecording = false;
      while (!(window as any).__stopGridRecording) {
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
        ctx.drawImage(canvas, 0, 0);
        // Keep clear of the camera widget; the center contains only the empty floor.
        const { data } = ctx.getImageData(
          Math.floor(canvas.width * 0.25),
          Math.floor(canvas.height * 0.4),
          Math.floor(canvas.width * 0.5),
          Math.floor(canvas.height * 0.3),
        );
        let lines = 0;
        for (let i = 0; i < data.length; i += 4)
          if (data[i] < 228 && data[i + 1] < 235) lines++;
        frames.push(lines);
      }
      return frames;
    });
    for (const direction of [1, -1]) {
      for (let i = 0; i < 120; i++) await page.mouse.wheel(0, direction * 120);
      if (direction === 1)
        await page.screenshot({
          path: `/tmp/clik-grid-far-${view}-${info.project.name}.png`,
        });
    }
    await page.evaluate(() => {
      (window as any).__stopGridRecording = true;
    });
    const frames = await recording;
    await test.info().attach(`grid-${view}`, {
      body: JSON.stringify(frames),
      contentType: "application/json",
    });
    await page.screenshot({
      path: `/tmp/clik-grid-sweep-${view}-${info.project.name}.png`,
    });
    expect(frames.length).toBeGreaterThan(40);
    expect(Math.min(...frames), `${view}: images sans grille`).toBeGreaterThan(
      150,
    );
  }
});
