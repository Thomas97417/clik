import type { Page } from "@playwright/test";

/** Let React commits and queued pointer previews settle, including an idle canvas. */
export async function waitForSceneUpdate(page: Page) {
  await page.evaluate(async () => {
    for (let i = 0; i < 3; i++)
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
  });
}
