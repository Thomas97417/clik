import { test, expect } from "@playwright/test";
test("construction, couleurs, historique et récupération du brouillon", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/editor");
  await expect(
    page.getByRole("button", { name: "Brique 1 × 1" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Brique 1 × 1" }).click();
  await expect(page.locator(".viewport-bottom")).toContainText("1 / 500");
  await expect(page.locator("canvas").first()).toBeVisible();
  await page.getByRole("button", { name: "Rouge", exact: true }).click();
  await page.getByRole("button", { name: "Dupliquer", exact: true }).click();
  await expect(page.locator(".viewport-bottom")).toContainText("2 / 500");
  await expect(page.getByLabel("position X", { exact: true })).toHaveValue("2");
  await expect(page.locator(".overlap")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  await expect(page.locator(".viewport-bottom")).toContainText("1 / 500");
  await page.getByRole("button", { name: "Rétablir", exact: true }).click();
  await expect(page.locator(".viewport-bottom")).toContainText("2 / 500");
  await page.getByLabel("Nom du projet").fill("Ma construction test");
  await page.getByLabel("Nom du projet").press("Tab");
  await expect(page.getByRole("status")).toContainText("Enregistré");
  await page.reload();
  await expect(page.locator(".viewport-bottom")).toContainText("2 / 500");
  await expect(page.getByLabel("Nom du projet")).toHaveValue(
    "Ma construction test",
  );
  await expect(page.locator("canvas").first()).toHaveAttribute(
    "data-rendered",
    "2",
  );
  await page.screenshot({
    path: `/tmp/clik-editor-${test.info().project.name}.png`,
  });
  expect(errors).toEqual([]);
});
test("un formulaire ne déclenche pas les raccourcis de suppression", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Brique 1 × 1" }).click();
  const input = page.getByLabel("Nom du projet");
  await input.focus();
  await input.press("Backspace");
  await expect(page.locator(".viewport-bottom")).toContainText("1 / 500");
});
test("conflit entre deux onglets sans écrasement silencieux", async ({
  page,
  context,
}) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Brique 1 × 1" }).click();
  await expect(page.getByRole("status")).toContainText("Enregistré");
  const second = await context.newPage();
  await second.goto("/editor");
  await expect(second.locator(".viewport-bottom")).toContainText("1 / 500");
  await page.getByRole("button", { name: "Brique 2 × 2" }).click();
  await expect(second.getByRole("alert")).toContainText("autre onglet");
  await second.getByRole("button", { name: "Recharger", exact: true }).click();
  await expect(second.locator(".viewport-bottom")).toContainText("2 / 500");
  await second.close();
});
test("galerie et consultation mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/gallery");
  await expect(
    page.getByRole("heading", { name: "La galerie." }),
  ).toBeVisible();
  await page.goto("/editor");
  await expect(
    page.getByRole("heading", { name: "Un peu plus de place pour construire" }),
  ).toBeVisible();
  await expect(page.locator(".editor")).toBeHidden();
});
test("hors ligne : le brouillon local reste enregistré", async ({
  page,
  context,
}) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Brique 1 × 1", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Enregistré");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Brique 2 × 2", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Hors ligne");
  await context.setOffline(false);
  await expect(page.getByRole("status")).toContainText("Enregistré");
  await page.reload();
  await expect(page.locator(".viewport-bottom")).toContainText("2 / 500");
});
test("copie locale en cas de conflit conserve les deux brouillons", async ({
  page,
  context,
}) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Brique 1 × 1", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Enregistré");
  const second = await context.newPage();
  await second.goto("/editor");
  await expect(second.locator(".viewport-bottom")).toContainText("1 / 500");
  await page.getByRole("button", { name: "Brique 2 × 2", exact: true }).click();
  await expect(second.getByRole("alert")).toContainText("autre onglet");
  await second
    .getByRole("button", { name: "Sauvegarder une copie locale" })
    .click();
  await expect(second).toHaveURL(/draft=/);
  await expect(second.locator(".viewport-bottom")).toContainText("1 / 500");
  await expect(page.locator(".viewport-bottom")).toContainText("2 / 500");
  await second.close();
});

test("déposer une pièce et annuler un placement avec Échap", async ({
  page,
}) => {
  await page.goto("/editor");
  const canvas = page.locator("canvas").first();
  await expect(canvas).toHaveAttribute("data-rendered", "0");
  const bounds = (await canvas.boundingBox())!,
    transfer = await page.evaluateHandle(() => new DataTransfer());
  const card = page.getByRole("button", { name: "Brique 2 × 4", exact: true });
  await card.dispatchEvent("dragstart", { dataTransfer: transfer });
  await canvas.dispatchEvent("dragover", {
    dataTransfer: transfer,
    clientX: bounds.x + bounds.width / 2,
    clientY: bounds.y + bounds.height / 2,
  });
  await page.keyboard.press("Escape");
  await expect(page.locator(".piece-card.active")).toHaveCount(0);
  await canvas.dispatchEvent("drop", {
    dataTransfer: transfer,
    clientX: bounds.x + bounds.width / 2,
    clientY: bounds.y + bounds.height / 2,
  });
  await expect(page.locator(".viewport-bottom")).toContainText("0 / 500");
  await card.dispatchEvent("dragstart", { dataTransfer: transfer });
  await canvas.dispatchEvent("drop", {
    dataTransfer: transfer,
    clientX: bounds.x + bounds.width / 2,
    clientY: bounds.y + bounds.height / 2,
  });
  await expect(page.locator(".viewport-bottom")).toContainText("1 / 500");
});
test("groupement, propriétés numériques et dissociation", async ({ page }) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Brique 1 × 1", exact: true }).click();
  await page.getByRole("button", { name: "Brique 2 × 2", exact: true }).click();
  await page
    .locator(".tree-name")
    .first()
    .click({ modifiers: ["Shift"] });
  await page.getByRole("button", { name: "Grouper", exact: true }).click();
  await expect(page.locator(".tree-name")).toHaveCount(3);
  await page.getByLabel("position X", { exact: true }).fill("5");
  await page.getByLabel("position X", { exact: true }).press("Tab");
  await expect(page.getByLabel("position X", { exact: true })).toHaveValue("5");
  await page.getByRole("button", { name: "Dissocier", exact: true }).click();
  await expect(page.locator(".tree-name")).toHaveCount(2);
  await page.locator(".tree-name").first().click();
  await expect(page.getByLabel("position X", { exact: true })).toHaveValue("5");
});

test("WebGL indisponible : message explicite", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type.startsWith("webgl") || type === "experimental-webgl")
        return null;
      return (original as any).call(this, type, ...args);
    } as typeof original;
  });
  await page.goto("/editor");
  await expect(
    page.getByRole("heading", { name: "La 3D n’est pas disponible" }),
  ).toBeVisible();
});
test("accueil Clik et démonstration interactive", async ({ page }, info) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Petites briques. Grandes idées." }),
  ).toBeVisible();
  await expect(page.locator("canvas").first()).toHaveAttribute(
    "data-rendered",
    /\d+/,
  );
  await page.screenshot({ path: `/tmp/clik-home-${info.project.name}.png` });
});

test("duplication d’un groupe à côté de l’original, annuler et rétablir", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Brique 1 × 1", exact: true }).click();
  await page.getByRole("button", { name: "Brique 2 × 2", exact: true }).click();
  await page.getByLabel("position X", { exact: true }).fill("3");
  await page.getByLabel("position X", { exact: true }).press("Tab");
  await page
    .locator(".tree-name")
    .first()
    .click({ modifiers: ["Shift"] });
  await page.getByRole("button", { name: "Grouper", exact: true }).click();
  await page.getByRole("button", { name: "Dupliquer", exact: true }).click();
  await expect(page.locator(".viewport-bottom")).toContainText("4 / 500");
  await expect(page.getByLabel("position Z", { exact: true })).toHaveValue("3");
  await expect(page.locator(".overlap")).toHaveCount(0);
  await expect(page.locator(".tree-name")).toHaveCount(6);
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  await expect(page.locator(".viewport-bottom")).toContainText("2 / 500");
  await page.getByRole("button", { name: "Rétablir", exact: true }).click();
  await expect(page.locator(".viewport-bottom")).toContainText("4 / 500");
  await expect(page.locator(".overlap")).toHaveCount(0);
});
