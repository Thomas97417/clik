import { test, expect } from "@playwright/test";
import { dragLibrary } from "./drag-library";

for (const library of [false, true]) {
  test(`R et Maj+R pendant la prise, répétition ignorée, bibliothèque ${library}`, async ({
    page,
  }) => {
    await page.goto("/editor");
    const canvas = page.locator("canvas").first();
    await expect(canvas).toHaveAttribute("data-rendered", "0");
    if (!library) {
      await page
        .getByRole("button", { name: "Brique 2 × 2", exact: true })
        .click();
      await page.getByLabel("Vue de la caméra").selectOption("top");
      await page
        .getByRole("button", { name: "Cadrer la sélection (F)" })
        .click();
    }
    const box = (await canvas.boundingBox())!;
    const x = box.x + box.width / 2,
      y = box.y + box.height / 2;
    if (library) await dragLibrary(page, "Brique 1 × 4", x, y);
    else {
      await page.mouse.move(x, y);
      await page.mouse.down();
    }
    await page.keyboard.down("r");
    await page.keyboard.down("r"); // Keyboard repeat must not produce a second turn.
    await page.keyboard.up("r");
    await page.keyboard.press("Shift+R");
    await page.keyboard.press("Shift+R");
    await page.mouse.move(x + 15, y + 10, { steps: 5 });
    const frame = Number(await canvas.getAttribute("data-frames"));
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-frames")))
      .toBeGreaterThan(frame + 2);
    await page.mouse.up();
    await expect(page.getByLabel("rotation Y", { exact: true })).toHaveValue(
      "-90",
    );
    await page
      .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
      .click();
    if (library) {
      await expect(canvas).toHaveAttribute("data-rendered", "0");
      await expect(
        page.getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true }),
      ).toBeDisabled();
    } else {
      await page.locator(".tree-name").first().click();
      await expect(page.getByLabel("rotation Y", { exact: true })).toHaveValue(
        "0",
      );
    }
  });
}

test("R laisse les champs éditables et Échap annule la rotation de bibliothèque", async ({
  page,
}, info) => {
  await page.goto("/editor");
  const canvas = page.locator("canvas").first();
  await expect(canvas).toHaveAttribute("data-rendered", "0");
  const box = (await canvas.boundingBox())!;
  await dragLibrary(
    page,
    "Brique 1 × 4",
    box.x + box.width / 2,
    box.y + box.height / 2,
  );
  const title = page.getByRole("textbox", { name: "Nom du projet" });
  await title.focus();
  // Focus selects the whole title; ArrowRight collapses it to the end on every OS.
  await title.press("ArrowRight");
  const before = await title.inputValue();
  await page.keyboard.press("r");
  await expect(title).toHaveValue(`${before}r`);
  await canvas.focus();
  await page.keyboard.press("r");
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(canvas).toHaveAttribute("data-rendered", "0");
  await page.setViewportSize({ width: 900, height: 760 });
  await expect(page.locator(".editor-footer")).toContainText("R / Maj + R");
  await page.screenshot({
    path: `/tmp/clik-keyboard-rotation-${info.project.name}.png`,
  });
});
