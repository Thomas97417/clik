import { CATALOG } from "@clik/scene";
import { test, expect, type Page } from "@playwright/test";

async function layout(page: Page) {
  return page.evaluate(() => {
    const rect = (selector: string) => {
      const { x, y, width, height } = document
        .querySelector(selector)!
        .getBoundingClientRect();
      return { x, y, width, height };
    };
    const scroll = document.querySelector<HTMLElement>(".library-scroll")!;
    return {
      card: rect(".piece-card"),
      header: rect(".library-header"),
      palette: rect(".palette"),
      canvas: rect("canvas"),
      overflow: scroll.scrollHeight > scroll.clientHeight,
    };
  });
}

test("bibliothèque : largeur stable quand le défilement apparaît", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto("/editor");
  await expect(page.locator("canvas").first()).toHaveAttribute(
    "data-rendered",
    "0",
  );
  // Exercise a wide native gutter as well as macOS overlay scrollbars.
  await page.addStyleTag({
    content:
      ".library-scroll { scrollbar-width: auto; } .library-scroll::-webkit-scrollbar { width: 16px; }",
  });
  await expect(page.locator(".piece-card")).toHaveCount(
    Object.keys(CATALOG).length,
  );
  await expect.poll(async () => (await layout(page)).overflow).toBe(true);
  const all = await layout(page);
  await page.getByRole("button", { name: "Arches", exact: true }).click();
  await expect(page.locator(".piece-card")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Arches", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".library-header .panel-heading")).toContainText(
    "2 modèles",
  );
  const filtered = await layout(page);
  expect(filtered.overflow).toBe(false);
  expect(filtered.card).toEqual(all.card);
  expect(filtered.header).toEqual(all.header);
  expect(filtered.palette).toEqual(all.palette);
  expect(filtered.canvas).toEqual(all.canvas);
  // Even forcing a scrollbar on the short list must not resize its cards.
  await page
    .locator(".library-scroll")
    .evaluate((element: HTMLElement) => (element.style.overflowY = "scroll"));
  expect((await layout(page)).card).toEqual(filtered.card);
  await page
    .locator(".library-scroll")
    .evaluate((element: HTMLElement) => (element.style.overflowY = "auto"));
  await page
    .getByRole("button", { name: "Toutes", exact: true })
    .press("Enter");
  await expect(page.locator(".piece-card")).toHaveCount(
    Object.keys(CATALOG).length,
  );
  expect((await layout(page)).card).toEqual(all.card);
  await expect
    .poll(() =>
      page
        .locator(".library, .library-scroll, .palette, .piece-tabs")
        .evaluateAll((elements) =>
          elements.every(
            (element) => element.scrollWidth <= element.clientWidth,
          ),
        ),
    )
    .toBe(true);
  await page.screenshot({
    path: `/tmp/clik-library-stable-${info.project.name}.png`,
  });
});

test("bibliothèque : catégories et couleurs restent accessibles pendant le défilement", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto("/editor");
  await expect(page.locator("canvas").first()).toHaveAttribute(
    "data-rendered",
    "0",
  );
  const before = await layout(page);
  const scroll = page.locator(".library-scroll"),
    box = (await scroll.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 1000);
  await expect
    .poll(() => scroll.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  const scrolled = await layout(page);
  expect(scrolled.header).toEqual(before.header);
  expect(scrolled.palette).toEqual(before.palette);
  expect(scrolled.canvas).toEqual(before.canvas);
  await page.getByRole("button", { name: "Rouge", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Rouge", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".palette-section .panel-heading")).toContainText(
    "Rouge",
  );
  await page.locator('.piece-card[aria-label="Pente 2 × 2"]').click();
  await expect(page.locator(".viewport-bottom")).toContainText("1 / 500");
  await expect(page.locator(".tree-row.selected .part-dot")).toHaveCSS(
    "background-color",
    "rgb(239, 68, 68)",
  );
  await page.getByRole("button", { name: "Plaques", exact: true }).click();
  await expect(page.locator(".piece-card")).toHaveCount(
    Object.keys(CATALOG).filter((type) => type.startsWith("plate")).length,
  );
  await expect
    .poll(() => scroll.evaluate((element) => element.scrollTop))
    .toBe(0);
  await expect(page.locator(".library-header .panel-heading")).toContainText(
    `${Object.keys(CATALOG).filter((type) => type.startsWith("plate")).length} modèles`,
  );
  await page.screenshot({
    path: `/tmp/clik-library-palette-${info.project.name}.png`,
  });
});
