import { selectCameraView } from "./camera-view";
import { test, expect, type Locator, type Page } from "@playwright/test";

const panelWidth = async (panel: Locator) => (await panel.boundingBox())!.width;

async function dragBorder(page: Page, border: Locator, delta: number) {
  const box = (await border.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + Math.min(box.height / 2, 200);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + delta, y, { steps: 12 });
  await page.mouse.up();
}

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

test("les bordures redimensionnent chaque panneau et conservent les largeurs après repli et rechargement", async ({
  page,
}, info) => {
  await page.goto("/editor");
  await page.locator('.piece-card[aria-label="Brique 2 × 2"]').click();
  const library = page.locator(".editor-side-left");
  const inspector = page.locator(".editor-side-right");
  const left = page.getByRole("separator", {
    name: "Redimensionner la bibliothèque",
  });
  const right = page.getByRole("separator", {
    name: "Redimensionner le panneau de construction",
  });
  const canvas = page.locator("canvas").first();
  await expect
    .poll(() => panelWidth(canvas))
    .toBe(await panelWidth(page.locator(".viewport")));
  const initial = {
    library: await panelWidth(library),
    inspector: await panelWidth(inspector),
    canvas: await panelWidth(canvas),
  };
  await dragBorder(page, left, 120);
  await expect.poll(() => panelWidth(library)).toBe(initial.library + 120);
  expect(await panelWidth(inspector)).toBe(initial.inspector);
  await dragBorder(page, right, -140);
  await expect.poll(() => panelWidth(inspector)).toBe(initial.inspector + 140);
  expect(await panelWidth(library)).toBe(initial.library + 120);
  await expect.poll(() => panelWidth(canvas)).toBe(initial.canvas - 260);
  const saved = {
    library: await panelWidth(library),
    inspector: await panelWidth(inspector),
  };

  await page
    .getByRole("button", { name: "Replier la bibliothèque", exact: true })
    .click();
  await expect(left).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Replier le panneau de construction",
      exact: true,
    })
    .click();
  await expect(right).toHaveCount(0);
  await expect.poll(() => panelWidth(canvas)).toBe(1440);
  await page
    .getByRole("button", { name: "Déplier la bibliothèque", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Déplier le panneau de construction",
      exact: true,
    })
    .click();
  await expect.poll(() => panelWidth(library)).toBe(saved.library);
  await expect.poll(() => panelWidth(inspector)).toBe(saved.inspector);

  for (const width of [900, 1600, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(async () => {
        const sizes = [
          await panelWidth(library),
          await panelWidth(canvas),
          await panelWidth(inspector),
        ];
        return Math.round(sizes.reduce((sum, size) => sum + size, 0));
      })
      .toBe(width);
    expect(await panelWidth(library)).toBeGreaterThanOrEqual(
      Number(await left.getAttribute("aria-valuemin")),
    );
    expect(await panelWidth(inspector)).toBeGreaterThanOrEqual(
      Number(await right.getAttribute("aria-valuemin")),
    );
    expect(await panelWidth(canvas)).toBeGreaterThanOrEqual(
      width <= 1100 ? 280 : 300,
    );
    expect(
      await page
        .locator(".editor-body")
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
  }
  await expect.poll(() => panelWidth(library)).toBe(saved.library);
  await expect.poll(() => panelWidth(inspector)).toBe(saved.inspector);
  await page.screenshot({
    path: `/tmp/clik-panels-resized-${info.project.name}.png`,
  });
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  await expect(page.locator(".viewport-bottom")).toContainText("0 / 500");
  await page.reload();
  await expect.poll(() => panelWidth(library)).toBe(saved.library);
  await expect.poll(() => panelWidth(inspector)).toBe(saved.inspector);
  await expect(page.locator(".viewport-bottom")).toContainText("0 / 500");
});

test("les bordures respectent les limites, se règlent au clavier et annulent un glissement avec Échap", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.locator('.piece-card[aria-label="Brique 2 × 2"]').click();
  const library = page.locator(".editor-side-left");
  const inspector = page.locator(".editor-side-right");
  const left = page.getByRole("separator", {
    name: "Redimensionner la bibliothèque",
  });
  const right = page.getByRole("separator", {
    name: "Redimensionner le panneau de construction",
  });
  const minimum = {
    library: await panelWidth(library),
    inspector: await panelWidth(inspector),
  };
  await dragBorder(page, left, -150);
  expect(await panelWidth(library)).toBe(minimum.library);
  await dragBorder(page, right, 150);
  expect(await panelWidth(inspector)).toBe(minimum.inspector);
  await left.focus();
  await left.press("ArrowRight");
  await left.press("Shift+ArrowRight");
  await expect.poll(() => panelWidth(library)).toBe(minimum.library + 50);
  await right.focus();
  await right.press("ArrowLeft");
  await expect.poll(() => panelWidth(inspector)).toBe(minimum.inspector + 10);
  for (const key of ["r", "d", "Delete", "Control+z"]) await right.press(key);
  await expect(page.locator(".viewport-bottom")).toContainText("1 / 500");
  for (const [axis, value] of [
    ["X", "0"],
    ["Y", "0"],
    ["Z", "0"],
  ]) {
    await expect(
      page.getByLabel(`position ${axis}`, { exact: true }),
    ).toHaveValue(value);
    await expect(
      page.getByLabel(`rotation ${axis}`, { exact: true }),
    ).toHaveValue(value);
  }
  await right.press("End");
  await expect.poll(() => panelWidth(page.locator("canvas").first())).toBe(300);
  await right.press("Home");
  await expect.poll(() => panelWidth(inspector)).toBe(minimum.inspector);
  const before = await panelWidth(library);
  const box = (await left.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 200);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + 200, { steps: 8 });
  await expect.poll(() => panelWidth(library)).toBeGreaterThan(before + 80);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect.poll(() => panelWidth(library)).toBe(before);
  await expect(page.locator(".editor-body")).toHaveAttribute(
    "data-resizing",
    "false",
  );
  await left.dblclick();
  await expect.poll(() => panelWidth(library)).toBe(minimum.library);
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  await expect(page.locator(".viewport-bottom")).toContainText("0 / 500");
});
