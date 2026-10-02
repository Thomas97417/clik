import { test, expect } from "@playwright/test";
import { creatorsFixture } from "./fixtures/creators";

test.use({ hasTouch: true });

test("création publique : boutons de zoom et réinitialisation sur ordinateur et mobile", async ({
  page,
}, info) => {
  await creatorsFixture(page);
  await page.goto("/creations/creation-0");
  const canvas = page.locator(".public-scene canvas");
  await expect(canvas).toHaveAttribute("data-rendered", "1");
  const zoomIn = page.getByRole("button", {
    name: "Zoomer l’aperçu",
    exact: true,
  });
  const zoomOut = page.getByRole("button", {
    name: "Dézoomer l’aperçu",
    exact: true,
  });
  const reset = page.getByRole("button", {
    name: "Réinitialiser la vue",
    exact: true,
  });
  const pixels = () =>
    canvas.evaluate(async (canvas: HTMLCanvasElement) => {
      const image = new Image();
      image.src = canvas.toDataURL();
      await image.decode();
      const surface = document.createElement("canvas");
      surface.width = canvas.width;
      surface.height = canvas.height;
      const ctx = surface.getContext("2d")!;
      ctx.drawImage(image, 0, 0);
      const { data } = ctx.getImageData(0, 0, surface.width, surface.height);
      let count = 0,
        x = 0,
        y = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 2] > data[i] * 1.2 && data[i + 2] > data[i + 1] * 1.1) {
          count++;
          x += (i / 4) % surface.width;
          y += Math.floor(i / 4 / surface.width);
        }
      }
      return { count, x: x / count, y: y / count };
    });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(() =>
        canvas.evaluate((element: HTMLCanvasElement) =>
          Math.abs(
            element.width / element.height -
              element.clientWidth / element.clientHeight,
          ),
        ),
      )
      .toBeLessThan(0.01);
    const frames = Number(await canvas.getAttribute("data-frames"));
    await reset.tap();
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-frames")))
      .toBeGreaterThan(frames + 2);
    await expect.poll(async () => (await pixels()).count).toBeGreaterThan(1000);
    const initial = await pixels();
    await zoomIn.tap();
    await expect
      .poll(async () => (await pixels()).count)
      .toBeGreaterThan(initial.count * 1.1);
    await zoomOut.focus();
    await zoomOut.press("Enter");
    await expect
      .poll(
        async () =>
          Math.abs((await pixels()).count - initial.count) / initial.count,
      )
      .toBeLessThan(0.02);
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.6, {
      steps: 12,
    });
    await page.mouse.up();
    await page.mouse.down({ button: "right" });
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.7, {
      steps: 10,
    });
    await page.mouse.up({ button: "right" });
    await zoomIn.tap();
    await reset.focus();
    await reset.press("Enter");
    await expect
      .poll(
        async () =>
          Math.abs((await pixels()).count - initial.count) / initial.count,
      )
      .toBeLessThan(0.02);
    await expect
      .poll(async () => Math.abs((await pixels()).x - initial.x))
      .toBeLessThan(1);
    await expect
      .poll(async () => Math.abs((await pixels()).y - initial.y))
      .toBeLessThan(1);
    await expect(reset).toBeFocused();
    await page.locator(".public-scene").screenshot({
      path: `/tmp/clik-view-controls-${info.project.name}-${width}.png`,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
