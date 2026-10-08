import { expect, type Page } from "@playwright/test";

export async function dragLibrary(
  page: Page,
  name: string,
  x: number,
  y: number,
) {
  const card = page.locator(`.piece-card[aria-label="${name}"]`);
  // Hover waits for scrolling and hit testing before pressing the real pointer.
  await card.hover();
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 12 });
  await expect(card).toHaveClass(/(?:^|\s)active(?:\s|$)/);
  const canvas = page.locator("canvas").first();
  const frame = Number(await canvas.getAttribute("data-frames"));
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-frames")))
    .toBeGreaterThan(frame + 2);
}
