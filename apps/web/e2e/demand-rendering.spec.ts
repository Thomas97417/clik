import { test, expect } from "@playwright/test";

test("la scène s’arrête au repos et reprend pour les couleurs, la caméra, la grille et le redimensionnement", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Brique 2 × 2", exact: true }).click();
  const canvas = page.locator(".viewport canvas");
  await expect(canvas).toHaveAttribute("data-rendered", "1");
  const frames = async () => Number(await canvas.getAttribute("data-frames"));
  const pixels = () => canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.waitForTimeout(1000);
  const idle = await frames();
  await page.waitForTimeout(600);
  expect((await frames()) - idle).toBeLessThanOrEqual(1);
  const before = await pixels();
  await page.getByRole("button", { name: "Rouge", exact: true }).click();
  await expect.poll(pixels).not.toBe(before);
  const red = await pixels();
  await canvas.focus();
  const cameraStart = await frames();
  await page.keyboard.down("z");
  await expect.poll(frames).toBeGreaterThan(cameraStart + 5);
  await page.keyboard.up("z");
  await expect.poll(pixels).not.toBe(red);
  const withGrid = await pixels();
  await page.getByRole("button", { name: "Grille", exact: true }).click();
  await expect.poll(pixels).not.toBe(withGrid);
  const resize = await frames();
  await page.setViewportSize({ width: 1100, height: 760 });
  await expect.poll(frames).toBeGreaterThan(resize);
  await page.waitForTimeout(1000);
  const stopped = await frames();
  await page.waitForTimeout(600);
  expect((await frames()) - stopped).toBeLessThanOrEqual(1);
});
