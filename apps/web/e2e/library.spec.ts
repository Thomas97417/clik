import { CATALOG } from "@clik/scene";
import { test, expect, type Page } from "@playwright/test";
import { selectPieceFamily } from "./piece-family";

test("la bibliothèque permet de poser et de sauvegarder la 1 000e pièce", async ({
  page,
}) => {
  await page.goto("/editor?draft=mille-pieces");
  const canvas = page.locator(".viewport canvas");
  await expect(canvas).toHaveAttribute("data-rendered", "0");
  await page.evaluate(async () => {
    const path = "/e2e/performance-scene.ts";
    const { loadHierarchyBenchmark } = await import(/* @vite-ignore */ path);
    loadHierarchyBenchmark(1, 999);
  });
  const counter = page.getByRole("meter", {
    name: "Pièces dans la construction",
  });
  const brick = page
    .getByRole("complementary", { name: "Bibliothèque de pièces" })
    .getByRole("button", { name: "Brique 1 × 1", exact: true });
  await expect(counter).toHaveAttribute("aria-valuenow", "999");
  await brick.click();
  await expect(counter).toHaveText("1 000 / 1 000 pièces");
  await expect(brick).toBeDisabled();
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  await expect(brick).toBeEnabled();
  await page.getByRole("button", { name: "Rétablir", exact: true }).click();
  await expect(brick).toBeDisabled();
  await expect(
    page.getByLabel("Projet et sauvegarde").getByRole("status"),
  ).toContainText("Enregistré");
  await page.reload();
  await expect(counter).toHaveText("1 000 / 1 000 pièces");
  await expect(canvas).toHaveAttribute("data-rendered", "1001"); // Includes the group.
});

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
    { timeout: 30000 },
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
  await selectPieceFamily(page, "Arches");
  await expect(page.locator(".piece-card")).toHaveCount(2);
  await expect(
    page.getByRole("combobox", { name: "Famille de pièces", exact: true }),
  ).toHaveText("Arches");
  await expect(page.locator(".library-count")).toHaveText("2");
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
  await selectPieceFamily(page, "Toutes les familles");
  await expect(page.locator(".piece-card")).toHaveCount(
    Object.keys(CATALOG).length,
  );
  expect((await layout(page)).card).toEqual(all.card);
  await expect
    .poll(() =>
      page
        .locator(
          ".library, .library-scroll, .palette, .library-search, .library-category",
        )
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
  await expect(page.locator(".viewport-bottom")).toContainText("1 / 1 000");
  await expect(page.locator(".tree-row.selected .part-dot")).toHaveCSS(
    "background-color",
    "rgb(239, 68, 68)",
  );
  await selectPieceFamily(page, "Plaques");
  await expect(page.locator(".piece-card")).toHaveCount(
    Object.keys(CATALOG).filter((type) => type.startsWith("plate")).length,
  );
  await expect
    .poll(() => scroll.evaluate((element) => element.scrollTop))
    .toBe(0);
  await expect(page.locator(".library-count")).toHaveText(
    String(
      Object.keys(CATALOG).filter((type) => type.startsWith("plate")).length,
    ),
  );
  await page.screenshot({
    path: `/tmp/clik-library-palette-${info.project.name}.png`,
  });
});

test("bibliothèque : recherche par nom et dimensions, filtres et saisie sans action sur la scène", async ({
  page,
}) => {
  await page.goto("/editor");
  const canvas = page.locator("canvas").first();
  await expect(canvas).toHaveAttribute("data-rendered", "0");
  await page.getByRole("button", { name: "Brique 1 × 1", exact: true }).click();
  const input = page.getByRole("searchbox", { name: "Rechercher une pièce" });
  const cards = page.locator(".piece-card");
  await input.fill("2 x 2");
  await expect(cards).toHaveCount(
    Object.values(CATALOG).filter(({ name }) => name.includes("2 × 2")).length,
  );
  await input.press("Escape");
  await expect(input).toHaveValue("");
  await expect(cards).toHaveCount(Object.keys(CATALOG).length);
  await expect(page.locator(".tree-row.selected")).toHaveCount(1);
  await input.fill("MÂÇONNERIE");
  await expect(cards).toHaveCount(2);
  await selectPieceFamily(page, "Briques");
  await page.getByRole("button", { name: "Effacer la recherche" }).click();
  await expect(input).toBeFocused();
  await expect(cards).toHaveCount(
    Object.keys(CATALOG).filter((type) => type.startsWith("brick")).length,
  );
  await input.fill("pente");
  await expect(cards).toHaveCount(0);
  await expect(page.getByText("Aucune pièce correspondante")).toBeVisible();
  await page.getByRole("button", { name: "Réinitialiser les filtres" }).click();
  await expect(input).toHaveValue("");
  await expect(input).toBeFocused();
  await expect(cards).toHaveCount(Object.keys(CATALOG).length);
  await expect(page.locator(".piece-family-heading")).toHaveText(
    [
      ["Briques", "brick"],
      ["Plaques", "plate"],
      ["Pentes", "slope"],
      ["Tuiles", "tile"],
      ["Rondes", "round"],
      ["Angles", "corner"],
      ["Arches", "arch"],
    ].map(
      ([name, prefix]) =>
        name +
        Object.keys(CATALOG).filter((type) => type.startsWith(prefix)).length,
    ),
  );
  await selectPieceFamily(page, "Rondes");
  await input.fill("DÔME");
  await expect(cards).toHaveCount(2);
  await input.press("Enter");
  await page
    .getByRole("button", { name: "Replier la bibliothèque", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Déplier la bibliothèque", exact: true })
    .click();
  await expect(input).toHaveValue("DÔME");
  await expect(cards).toHaveCount(2);
  await expect(canvas).toHaveAttribute("data-rendered", "1");
  await input.press("Escape");
  await expect(cards).toHaveCount(
    Object.keys(CATALOG).filter((type) => type.startsWith("round")).length,
  );
  await input.press("Escape");
  await expect(input).not.toBeFocused();
  await expect(page.locator(".tree-row.selected")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Aide de l’atelier", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Les pièces et leurs couleurs" }),
  ).toBeVisible();
  await expect(cards).toHaveCount(Object.keys(CATALOG).length);
  await expect(
    page.getByRole("combobox", { name: "Famille de pièces", exact: true }),
  ).toHaveText("Toutes les familles");
  await page
    .getByRole("button", { name: "Quitter la visite", exact: true })
    .click();
  await expect(page.locator(".driver-popover")).toHaveCount(0);
  await expect(cards).toHaveCount(
    Object.keys(CATALOG).filter((type) => type.startsWith("round")).length,
  );
});

test("bibliothèque : élargir ajoute des colonnes en conservant la taille des aperçus", async ({
  page,
}, info) => {
  await page.goto("/editor");
  await expect(page.locator("canvas").first()).toHaveAttribute(
    "data-rendered",
    "0",
  );
  const columns = () =>
    page
      .locator(".piece-grid")
      .first()
      .evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.split(" ").length,
      );
  const before = await columns();
  const preview = page.locator(".piece-preview").first();
  const initial = (await preview.boundingBox())!;
  const border = page.getByRole("separator", {
    name: "Redimensionner la bibliothèque",
  });
  await border.focus();
  for (let i = 0; i < 5; i++) await border.press("Shift+ArrowRight");
  await expect.poll(columns).toBeGreaterThan(before);
  const after = (await preview.boundingBox())!;
  expect(after.width).toBeCloseTo(initial.width, 2);
  expect(after.height).toBeCloseTo(initial.height, 2);
  expect(
    await page
      .locator(".library")
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
  await page
    .locator(".library")
    .screenshot({ path: `/tmp/clik-library-compact-${info.project.name}.png` });
});
