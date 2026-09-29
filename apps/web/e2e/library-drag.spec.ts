import { test, expect } from "@playwright/test";
import { dragLibrary } from "./drag-library";

for (const snap of [true, false])
  for (const direction of [-1, 1]) {
    test(`bibliothèque : molette ${direction}, aimantation ${snap}, sans image native`, async ({
      page,
    }, info) => {
      await page.goto("/editor");
      const canvas = page.locator("canvas").first();
      await expect(canvas).toHaveAttribute("data-rendered", "0");
      await page.evaluate(() => {
        document.addEventListener(
          "dragstart",
          () => (document.body.dataset.nativeDrag = "true"),
          true,
        );
      });
      if (!snap)
        await page
          .getByRole("button", { name: "Aimantation", exact: true })
          .click();
      const box = (await canvas.boundingBox())!;
      const x = box.x + box.width / 2,
        y = box.y + box.height / 2;
      await dragLibrary(page, "Brique 1 × 4", x, y);
      await page.mouse.wheel(0, direction * 100);
      // Leave and re-enter the canvas: keep the quarter turn while hiding the preview.
      await page.mouse.move(180, y, { steps: 4 });
      await page.mouse.move(x + 15, y + 15, { steps: 8 });
      await expect(page.locator("body")).not.toHaveAttribute(
        "data-native-drag",
        "true",
      );
      await page.screenshot({
        path: `/tmp/clik-library-drag-${snap}-${direction}-${info.project.name}.png`,
      });
      await page.mouse.up();
      await expect(canvas).toHaveAttribute("data-rendered", "1");
      await expect(page.getByLabel("rotation Y", { exact: true })).toHaveValue(
        String(-direction * 90),
      );
      await page
        .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
        .click();
      await expect(canvas).toHaveAttribute("data-rendered", "0");
      await expect(
        page.getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true }),
      ).toBeDisabled();
    });
  }

test("annuler ou relâcher hors du plan n’ajoute rien ; clic et clavier ajoutent toujours", async ({
  page,
}) => {
  await page.goto("/editor");
  const canvas = page.locator("canvas").first();
  await expect(canvas).toHaveAttribute("data-rendered", "0");
  const box = (await canvas.boundingBox())!;
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await page.evaluate(() => {
    document.addEventListener(
      "pointerdown",
      (e) => {
        document.body.dataset.libraryPointerId = String(e.pointerId);
      },
      true,
    );
  });
  for (const action of ["escape", "blur", "cancel", "outside"]) {
    await dragLibrary(page, "Brique 1 × 4", x, y);
    if (action === "escape") await page.keyboard.press("Escape");
    if (action === "blur")
      await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    if (action === "cancel")
      await page.evaluate(() => {
        const card = document.querySelector(".piece-card.active")!;
        card.dispatchEvent(
          new PointerEvent("pointercancel", {
            pointerId: Number(document.body.dataset.libraryPointerId),
            bubbles: true,
          }),
        );
      });
    if (action === "outside") await page.mouse.move(180, y);
    await page.mouse.up();
    await expect(page.locator(".piece-card.active")).toHaveCount(0);
    await expect(canvas).toHaveAttribute("data-rendered", "0");
  }
  const card = page.locator('.piece-card[aria-label="Brique 1 × 4"]');
  await card.click();
  await expect(canvas).toHaveAttribute("data-rendered", "1");
  await card.focus();
  await card.press("Enter");
  await expect(canvas).toHaveAttribute("data-rendered", "2");
});
