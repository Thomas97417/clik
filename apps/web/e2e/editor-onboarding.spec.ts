import { expect, test, type Page } from "@playwright/test";

const help = (page: Page) =>
  page.getByRole("button", { name: "Aide de l’atelier", exact: true });
const welcome = (page: Page) =>
  page.getByRole("complementary", {
    name: "Bienvenue dans l’atelier",
    exact: true,
  });
const tour = (page: Page) => page.locator(".editor-tour-popover");

async function openEditor(page: Page, draft?: string) {
  await page.goto(draft ? `/editor?draft=${draft}` : "/editor");
  await expect(page.getByLabel("Nom du projet", { exact: true })).toBeEnabled({
    timeout: 30000,
  });
}

async function snapshot(page: Page) {
  return page.evaluate(async () => {
    const path = "/src/lib/clik/store.ts";
    const { useEditor } = await import(/* @vite-ignore */ path);
    const state = useEditor.getState();
    return JSON.parse(
      JSON.stringify({
        scene: state.scene,
        title: state.title,
        selection: state.selection,
        color: state.color,
        serial: state.serial,
        past: state.past,
        future: state.future,
      }),
    );
  });
}

test("accueil discret une seule fois, bibliothèque utilisable et visite chargée à la demande", async ({
  page,
}, info) => {
  const loaded: string[] = [];
  page.on("request", (request) => {
    if (/editor-tour|driver[_.]js|\/driver\.js\//.test(request.url()))
      loaded.push(request.url());
  });
  await openEditor(page);
  await expect(welcome(page)).toBeVisible();
  await expect(page.locator(".driver-overlay")).toHaveCount(0);
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  expect(loaded).toEqual([]);
  await page.screenshot({ path: `/tmp/clik-welcome-${info.project.name}.png` });
  await page.getByRole("button", { name: "Brique 1 × 1", exact: true }).click();
  await expect(page.locator(".viewport-bottom")).toContainText("1 / 500");
  await expect(welcome(page)).toHaveCount(0);
  expect(loaded).toEqual([]);
  await page.reload();
  await expect(help(page)).toBeEnabled({ timeout: 30000 });
  await expect(welcome(page)).toHaveCount(0);
  await page
    .getByRole("button", { name: "Nouvelle création", exact: true })
    .click();
  await expect(page.locator(".viewport-bottom")).toContainText("0 / 500");
  await expect(welcome(page)).toHaveCount(0);
  expect(loaded).toEqual([]);
  await help(page).click();
  await expect(tour(page)).toBeVisible();
  expect(loaded.some((url) => url.includes("editor-tour"))).toBe(true);
  await tour(page)
    .getByRole("button", { name: "Quitter la visite", exact: true })
    .click();
  await expect(help(page)).toBeFocused();
});

test("les trois étapes et le clavier préservent la scène, la sélection et l’historique", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openEditor(page);
  await welcome(page)
    .getByRole("button", { name: "Compris", exact: true })
    .click();
  await expect(tour(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Brique 2 × 4", exact: true }).click();
  const before = await snapshot(page);
  await help(page).click();
  await expect(tour(page)).toHaveAttribute("aria-modal", "true");
  await expect(tour(page)).toHaveAccessibleName("Les pièces et leurs couleurs");
  await expect(tour(page)).toContainText("Étape 1 sur 3");
  await expect(page.locator(".driver-active-element")).toHaveAttribute(
    "data-editor-tour",
    "library",
  );
  await expect(
    tour(page).getByRole("button", { name: "Suivant", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect
    .poll(() =>
      page.evaluate(
        () => !!document.activeElement?.closest(".editor-tour-popover"),
      ),
    )
    .toBe(true);
  await page.keyboard.press("d");
  await page.keyboard.press("r");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("ArrowRight");
  await expect(tour(page)).toHaveAccessibleName(
    "Votre construction, en détail",
  );
  await expect(page.locator(".driver-active-element")).toHaveAttribute(
    "data-editor-tour",
    "inspector",
  );
  await expect(tour(page)).toContainText("Étape 2 sur 3");
  await page.keyboard.press("ArrowLeft");
  await expect(tour(page)).toHaveAccessibleName("Les pièces et leurs couleurs");
  await tour(page)
    .getByRole("button", { name: "Suivant", exact: true })
    .click();
  await tour(page)
    .getByRole("button", { name: "Suivant", exact: true })
    .click();
  await expect(tour(page)).toHaveAccessibleName(
    "Les raccourcis à portée de main",
  );
  await expect(page.locator(".driver-active-element")).toHaveAttribute(
    "data-editor-tour",
    "shortcuts",
  );
  await expect(tour(page)).toContainText("Étape 3 sur 3");
  await page.screenshot({
    path: `/tmp/clik-tour-shortcuts-${info.project.name}.png`,
  });
  await tour(page)
    .getByRole("button", { name: "Terminer", exact: true })
    .click();
  await expect(tour(page)).toHaveCount(0);
  await expect(help(page)).toBeFocused();
  expect(await snapshot(page)).toEqual(before);
  expect(errors).toEqual([]);
  // The editor's keyboard controls work again after the visit.
  await page.keyboard.press("d");
  await expect(page.locator(".viewport-bottom")).toContainText("2 / 500");
});

test("visite sans pièces : panneaux ouverts temporairement et nettoyage sur navigation", async ({
  page,
}) => {
  await openEditor(page, "before-tour");
  await page
    .getByRole("button", { name: "Nouvelle création", exact: true })
    .click();
  await expect(help(page)).toBeEnabled();
  await page
    .getByRole("button", { name: "Replier les propriétés", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Replier la bibliothèque", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Replier le panneau de construction",
      exact: true,
    })
    .click();
  await help(page).click();
  await expect(tour(page)).toBeVisible();
  await expect(
    page.getByRole("complementary", {
      name: "Bibliothèque de pièces",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", {
      name: "Construction et propriétés",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".properties-toggle")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await page.keyboard.press("Escape");
  await expect(tour(page)).toHaveCount(0);
  await expect(page.locator('[data-editor-tour="library"]')).toBeHidden();
  await expect(page.locator('[data-editor-tour="inspector"]')).toBeHidden();
  await expect(page.locator(".properties-toggle")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(page.locator(".viewport-bottom")).toContainText("0 / 500");
  await help(page).click();
  await expect(tour(page)).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/draft=before-tour$/);
  await expect(help(page)).toBeEnabled();
  await expect(tour(page)).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveClass(/driver-active/);
  await expect(welcome(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Brique 1 × 1", exact: true }).click();
  await expect(page.locator(".viewport-bottom")).toContainText("1 / 500");
});

test("le mobile garde l’accueil pour la première ouverture de l’atelier sur ordinateur", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/editor");
  await expect(
    page.getByRole("heading", { name: "Un peu plus de place pour construire" }),
  ).toBeVisible();
  await expect(welcome(page)).toHaveCount(0);
  await page.setViewportSize({ width: 900, height: 1000 });
  await expect(welcome(page)).toBeVisible();
  await help(page).click();
  await expect(tour(page)).toBeVisible();
  await tour(page)
    .getByRole("button", { name: "Suivant", exact: true })
    .click();
  await tour(page)
    .getByRole("button", { name: "Suivant", exact: true })
    .click();
  await expect(tour(page)).toHaveAccessibleName(
    "Les raccourcis à portée de main",
  );
  const box = (await tour(page).boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(900);
  expect(box.y + box.height).toBeLessThanOrEqual(1000);
  await page.screenshot({
    path: `/tmp/clik-tour-900-${info.project.name}.png`,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(tour(page)).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveClass(/driver-active/);
  await page.setViewportSize({ width: 900, height: 1000 });
  await expect(help(page)).toBeEnabled();
  await expect(welcome(page)).toHaveCount(0);
  await expect(tour(page)).toHaveCount(0);
});
