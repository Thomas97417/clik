import { selectCameraView } from "./camera-view";
import { test, expect } from "@playwright/test";

test("horizon sans moiré pendant l’inertie de la caméra", async ({
  page,
}, info) => {
  await page.goto("/editor");
  const canvas = page.locator("canvas").first();
  await expect(canvas).toHaveAttribute("data-rendered", "0");
  await selectCameraView(page, "front");
  const ready = Number(await canvas.getAttribute("data-frames"));
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-frames")))
    .toBeGreaterThan(ready + 3);
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.65);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height * 0.65, {
    steps: 8,
  });
  await page.mouse.up();
  const variations = await canvas.evaluate(
    async (canvas: HTMLCanvasElement) => {
      const surface = document.createElement("canvas");
      surface.width = canvas.width;
      surface.height = canvas.height;
      const ctx = surface.getContext("2d")!;
      const x = Math.floor(canvas.width * 0.2),
        y = Math.floor(canvas.height * 0.34);
      const width = Math.floor(canvas.width * 0.6),
        height = Math.floor(canvas.height * 0.015);
      let previous: Uint8ClampedArray | undefined;
      const changes: { elapsed: number; value: number }[] = [];
      const start = performance.now();
      while (performance.now() - start < 2200) {
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
        ctx.drawImage(canvas, 0, 0);
        const { data } = ctx.getImageData(x, y, width, height);
        if (previous) {
          const differences = [];
          for (let i = 0; i < data.length; i += 4)
            differences.push(Math.abs(data[i] - previous[i]));
          differences.sort((a, b) => a - b);
          changes.push({
            elapsed: performance.now() - start,
            value: differences[Math.floor(differences.length * 0.95)],
          });
        }
        previous = data;
      }
      return changes;
    },
  );
  await test.info().attach("horizon-variation", {
    body: JSON.stringify(variations),
    contentType: "application/json",
  });
  await page.screenshot({
    path: `/tmp/clik-grid-horizon-${info.project.name}.png`,
  });
  expect(variations.length).toBeGreaterThan(20);
  // Initial motion can move resolvable major lines, but must stay below a
  // tenth of the luminance range and decay without renewed flashes. Use wall
  // time for settling: WebKit and Firefox do not render at the same cadence.
  const values = variations.map((sample) => sample.value);
  expect(Math.max(...values)).toBeLessThanOrEqual(25);
  expect(
    Math.max(...values.slice(1).map((value, i) => value - values[i])),
  ).toBeLessThanOrEqual(2);
  const settled = variations.filter((sample) => sample.elapsed >= 1200);
  expect(settled.length).toBeGreaterThan(5);
  expect(
    Math.max(...settled.map((sample) => sample.value)),
  ).toBeLessThanOrEqual(2);
});
