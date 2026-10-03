import { selectCameraView } from "./camera-view";
import { test, expect } from "@playwright/test";

test("panneaux indépendants, scène agrandie et état conservé à la réouverture", async ({
  page,
}, info) => {
  await page.goto("/editor");
  await page.locator('.piece-card[aria-label="Brique 2 × 2"]').click();
  await page.getByRole("button", { name: "Pentes", exact: true }).click();
  const position = () =>
    Promise.all(
      ["X", "Y", "Z"].map((axis) =>
        page.getByLabel(`position ${axis}`, { exact: true }).inputValue(),
      ),
    );
  const original = await position();
  await page
    .getByRole("button", { name: "Replier les propriétés", exact: true })
    .click();
  const canvas = page.locator("canvas").first();
  const originalWidth = (await canvas.boundingBox())!.width;
  const closeLibrary = page.getByRole("button", {
    name: "Replier la bibliothèque",
    exact: true,
  });
  await closeLibrary.focus();
  await closeLibrary.press("Enter");
  const openLibrary = page.getByRole("button", {
    name: "Déplier la bibliothèque",
    exact: true,
  });
  await expect(openLibrary).toBeFocused();
  await expect(openLibrary).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("complementary", { name: "Bibliothèque de pièces" }),
  ).toBeHidden();
  await expect(
    page.getByRole("complementary", { name: "Construction et propriétés" }),
  ).toBeVisible();
  await expect
    .poll(async () => (await canvas.boundingBox())!.width)
    .toBeGreaterThan(originalWidth + 150);
  await page
    .getByRole("button", {
      name: "Replier le panneau de construction",
      exact: true,
    })
    .click();
  const openInspector = page.getByRole("button", {
    name: "Déplier le panneau de construction",
    exact: true,
  });
  await expect(
    page.getByRole("complementary", { name: "Construction et propriétés" }),
  ).toBeHidden();
  for (const width of [1600, 900, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(async () => Math.round((await canvas.boundingBox())!.width))
      .toBe(width);
    await expect(openLibrary).toBeInViewport();
    await expect(openInspector).toBeInViewport();
  }
  await page.screenshot({
    path: `/tmp/clik-panels-folded-${info.project.name}.png`,
  });
  // The same scene stays interactive after resizing, while both panels are hidden.
  await selectCameraView(page, "top");
  await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 100,
    box.y + box.height / 2 + 60,
    { steps: 12 },
  );
  await expect(canvas).toHaveAttribute("data-dragging", "true");
  const frame = Number(await canvas.getAttribute("data-frames"));
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-frames")))
    .toBeGreaterThan(frame + 2);
  await page.mouse.up();
  await openInspector.focus();
  await openInspector.press("Enter");
  await expect(page.locator(".tree-row.selected")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Déplier les propriétés", exact: true })
    .click();
  expect(await position()).not.toEqual(original);
  await expect(openLibrary).toHaveAttribute("aria-expanded", "false");
  await openLibrary.focus();
  await openLibrary.press("Space");
  await expect(
    page.getByRole("button", { name: "Pentes", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(async () => (await canvas.boundingBox())!.width)
    .toBe(originalWidth);
  await page.screenshot({
    path: `/tmp/clik-panels-open-${info.project.name}.png`,
  });
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  await page.locator(".tree-name").first().click();
  expect(await position()).toEqual(original);
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  await expect(page.locator(".viewport-bottom")).toContainText("0 / 500");
});
