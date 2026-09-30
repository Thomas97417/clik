import { test, expect } from "@playwright/test";
import { STARTER_MODELS, starterScene } from "../src/lib/clik/starter-models";

test("les modèles et couleurs ouvrent une copie fidèle sans écraser la création existante", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Un petit clik.",
  );
  const preview = page.getByRole("img", {
    name: "Aperçu de La petite maison",
    exact: true,
  });
  await expect(preview).toBeVisible();
  await page.screenshot({ path: `/tmp/clik-home-${info.project.name}.png` });
  const originalImage = await preview.getAttribute("src");
  await page.getByRole("button", { name: "Vert", exact: true }).click();
  await expect(preview).not.toHaveAttribute("src", originalImage!);
  await expect(
    page.getByRole("button", { name: "Vert", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  for (const model of STARTER_MODELS.slice(1)) {
    await page.getByRole("button", { name: model.label, exact: true }).click();
    await expect(
      page.getByRole("img", { name: `Aperçu de ${model.name}`, exact: true }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Phare", exact: true }).click();
  await page.getByRole("button", { name: "Violet", exact: true }).click();
  const interactive = page.getByRole("group", {
    name: "Manipuler Le phare des marées",
    exact: true,
  });
  await interactive.press("ArrowRight");
  await interactive.press("+");
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("clik", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("drafts");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("drafts", "readwrite");
      tx.objectStore("drafts").put(
        {
          title: "Ma création à garder",
          scene: { version: 1, catalog: "clik-1", nodes: [] },
          stamp: "original",
          revision: 0,
          dirty: false,
        },
        "guest",
      );
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page
    .getByRole("button", { name: "Créer ma version", exact: true })
    .click();
  await expect(page).toHaveURL(/\/editor\?draft=/);
  await expect(page.getByLabel("Nom du projet")).toHaveValue(
    "Le phare des marées · ma version",
  );
  await expect(page.locator("canvas").first()).toHaveAttribute(
    "data-rendered",
    String(starterScene("lighthouse", "#8b5bd6").nodes.length),
  );
  const entries = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const req = indexedDB.open("clik", 1);
      req.onsuccess = () => resolve(req.result);
    });
    const result = await new Promise<any[]>((resolve) => {
      const req = db.transaction("drafts").objectStore("drafts").getAll();
      req.onsuccess = () => resolve(req.result);
    });
    db.close();
    return result;
  });
  expect(entries).toHaveLength(2);
  expect(entries.find((entry) => entry.stamp === "original")?.title).toBe(
    "Ma création à garder",
  );
  expect(entries.find((entry) => entry.title.includes("phare"))?.scene).toEqual(
    starterScene("lighthouse", "#8b5bd6"),
  );
  expect(errors).toEqual([]);
});

test("parcours mobile, clavier et démarrage sur une page blanche", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(
    page.getByRole("img", { name: "Aperçu de La petite maison", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Comment ça marche", exact: true })
    .click();
  await expect(page.locator(".home-how")).toBeFocused();
  await page.screenshot({
    path: `/tmp/clik-home-steps-${info.project.name}.png`,
  });
  await page
    .getByRole("link", { name: "Découvrir la galerie", exact: false })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `/tmp/clik-home-bottom-${info.project.name}.png`,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("heading", { level: 1 }).scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("button", { name: "Créer une construction", exact: true }),
  ).not.toBeVisible();
  await expect(
    page
      .locator(".home-mobile-actions")
      .getByRole("link", { name: "Explorer la galerie" }),
  ).toBeVisible();
  await expect(
    page.getByText("Pour construire, ouvrez l’atelier sur ordinateur."),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `/tmp/clik-home-mobile-${info.project.name}.png`,
  });
  await page.getByRole("button", { name: "Château", exact: true }).click();
  await expect(
    page.getByRole("img", {
      name: "Aperçu de Le château des horizons",
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: `/tmp/clik-home-mobile-model-${info.project.name}.png`,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("button", { name: "Créer une construction", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/editor\?draft=/);
  await expect(page.locator(".viewport-bottom")).toContainText("0 / 500");
});

test("sans WebGL, la découverte reste accessible", async ({ page }) => {
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
  await page.goto("/");
  await expect(
    page.getByText("Aperçu indisponible", { exact: true }),
  ).toBeVisible();
  await page
    .locator(".home-buttons")
    .getByRole("link", { name: "Explorer la galerie" })
    .click();
  await expect(page).toHaveURL(/\/gallery/);
});

test("un refus du stockage affiche une erreur et garde les actions disponibles", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("img", { name: "Aperçu de La petite maison", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    IDBFactory.prototype.open = () => {
      throw new DOMException("Storage disabled", "SecurityError");
    };
  });
  await page
    .getByRole("button", { name: "Créer ma version", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Impossible d’ouvrir la création",
  );
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("button", { name: "Créer ma version", exact: true }),
  ).toBeEnabled();
  await page.getByRole("link", { name: "Retrouver mes créations" }).click();
  await expect(page).toHaveURL(/\/projects/);
});
