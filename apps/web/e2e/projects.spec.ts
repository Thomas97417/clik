import { test, expect, type Page } from "@playwright/test";
import { emptyScene, makePart, type PartType, type Vec3 } from "@clik/scene";
import { projectsFixture } from "./fixtures/projects";

function models() {
  const part = (
    type: PartType,
    color: Parameters<typeof makePart>[1],
    position: Vec3,
  ) => makePart(type, color, position);
  const house = [part("plate-4x4", "#41a66b", [0, 0, 0])];
  for (const y of [0.4, 1.6])
    for (const z of [-1, 1])
      house.push(part("brick-2x4", "#f8cc36", [0, y, z]));
  for (const x of [-1, 1])
    for (const z of [-1, 1]) {
      const roof = part("slope-2x2", "#ef4444", [x, 2.8, z]);
      if (z === 1) roof.rotation[1] = Math.PI;
      house.push(roof);
    }
  const bridge = [];
  for (const x of [-4, 4])
    for (const y of [0, 1.2])
      bridge.push(part("brick-2x2", "#4079e8", [x, y, 0]));
  for (const x of [-4, 0, 4])
    bridge.push(part("plate-2x4", "#f8cc36", [x, 2.4, 0]));
  for (const z of [-1, 1])
    bridge.push(part("brick-1x6", "#ef4444", [0, 2.8, z]));
  const tower = [part("plate-4x4", "#58616c", [0, 0, 0])];
  for (let i = 0; i < 5; i++)
    tower.push(
      part("brick-2x2", i % 2 ? "#4079e8" : "#f5f5f3", [0, 0.4 + i * 1.2, 0]),
    );
  tower.push(part("slope-2x2", "#ff882b", [0, 6.4, 0]));
  return [house, bridge, tower].map((nodes) => ({ ...emptyScene(), nodes }));
}

async function seed(page: Page) {
  await page.goto("/projects");
  await expect(page.locator(".projects-count")).toContainText("0 création");
  await page.evaluate(async (scenes) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("clik", 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("drafts", "readwrite");
      const titles = [
        "La maison solaire",
        "Le pont des couleurs",
        "La tour des nuages",
      ];
      scenes.forEach((scene, i) =>
        tx.objectStore("drafts").put(
          {
            scene,
            title: titles[i],
            stamp: crypto.randomUUID(),
            revision: 0,
            dirty: false,
            updatedAt: Date.now() - i * 86400000,
          },
          i === 0 ? "guest" : `guest:model-${i}`,
        ),
      );
      tx.objectStore("drafts").put(
        {
          scene: scenes[0],
          title: "Sauvegarde privée d’un autre compte",
          stamp: "private",
          revision: 0,
          dirty: true,
        },
        "project:other:secret",
      );
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, models());
  await page.reload();
  await expect(page.locator(".project-card")).toHaveCount(3);
}

test("cartes illustrées, filtres, ouverture et présentation mobile", async ({
  page,
}, info) => {
  await seed(page);
  await expect(page.locator(".creation-preview img")).toHaveCount(3);
  const urls = await page
    .locator(".creation-preview img")
    .evaluateAll((images) =>
      images.map((img) => (img as HTMLImageElement).src),
    );
  expect(new Set(urls).size).toBe(3);
  await expect(page.locator("main")).not.toContainText(/brouillon/i);
  await expect(page.locator("main")).not.toContainText(
    "Sauvegarde privée d’un autre compte",
  );
  await page.screenshot({
    path: `/tmp/clik-projects-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "En ligne", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Retrouvez votre collection en ligne." }),
  ).toBeVisible();
  await expect(page.locator(".project-card")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Sur cet appareil", exact: true })
    .click();
  await expect(page.locator(".project-card")).toHaveCount(3);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `/tmp/clik-projects-mobile-${info.project.name}.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("link", { name: "Ouvrir Le pont des couleurs", exact: true })
    .click();
  await expect(page).toHaveURL(/draft=model-1/);
  await expect(page.getByLabel("Nom du projet")).toHaveValue(
    "Le pont des couleurs",
  );
  await expect(page.locator("canvas").first()).toHaveAttribute(
    "data-rendered",
    String(models()[1].nodes.length),
  );
});

test("une nouvelle création préserve les précédentes et obtient son propre aperçu", async ({
  page,
}) => {
  await seed(page);
  await page
    .getByRole("button", { name: "Nouvelle création", exact: true })
    .click();
  await expect(page).toHaveURL(/draft=/);
  await expect(page.locator(".viewport-bottom")).toContainText("0 / 500");
  await page.locator('.piece-card[aria-label="Brique 2 × 2"]').click();
  await page.getByLabel("Nom du projet").fill("Nouvelle sculpture");
  await page.getByLabel("Nom du projet").press("Enter");
  await expect(
    page.getByLabel("Projet et sauvegarde").getByRole("status"),
  ).toContainText("Enregistré");
  await page
    .getByRole("navigation", { name: "Navigation principale" })
    .getByRole("link", { name: "Mes créations", exact: true })
    .click();
  await expect(page.locator(".project-card")).toHaveCount(4);
  await expect(
    page.getByRole("img", {
      name: "Aperçu de Nouvelle sculpture",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Ouvrir La maison solaire", exact: true })
    .click();
  await expect(page.getByLabel("Nom du projet")).toHaveValue(
    "La maison solaire",
  );
  await expect(page.locator("canvas").first()).toHaveAttribute(
    "data-rendered",
    String(models()[0].nodes.length),
  );
});

test("sans WebGL, les créations restent accessibles", async ({ page }) => {
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
  await seed(page);
  await expect(
    page.getByText("Aperçu indisponible", { exact: true }),
  ).toHaveCount(3);
  await expect(
    page.getByRole("link", { name: "Ouvrir La maison solaire", exact: true }),
  ).toHaveAttribute("href", "/editor");
});

test("une création locale propose la connexion avant de publier", async ({
  page,
}) => {
  await seed(page);
  await page
    .getByRole("button", {
      name: "Visibilité de La maison solaire : Sur cet appareil",
    })
    .click();
  await page
    .getByRole("menuitem", { name: "Se connecter pour publier" })
    .click();
  await expect(page).toHaveURL(/\/sign-in$/);
  expect(
    await page.evaluate(() => sessionStorage.getItem("clik-return-to")),
  ).toBe("/projects");
  await page.goto("/projects");
  await expect(
    page.getByRole("heading", { name: "La maison solaire", exact: true }),
  ).toBeVisible();
});

test("tri des créations locales, filtres conservés, clavier et menu mobile", async ({
  page,
}, info) => {
  await seed(page);
  const cards = page.locator(".project-card h2");
  const sort = page.getByRole("combobox", { name: "Trier par" });
  await expect(sort).toHaveText("Les plus récentes");
  await expect(cards).toHaveText([
    "La maison solaire",
    "Le pont des couleurs",
    "La tour des nuages",
  ]);
  const localFilter = page.getByRole("button", {
    name: "Sur cet appareil",
    exact: true,
  });
  await localFilter.click();
  await sort.focus();
  await sort.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("End");
  await expect(
    page.getByRole("option", { name: "Les plus anciennes" }),
  ).toHaveAttribute("data-highlighted", "");
  await page.keyboard.press("Enter");
  await expect(sort).toHaveText("Les plus anciennes");
  await expect(page).toHaveURL(/sort=oldest/);
  await expect(cards).toHaveText([
    "La tour des nuages",
    "Le pont des couleurs",
    "La maison solaire",
  ]);
  await expect(localFilter).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "En ligne", exact: true }).click();
  await expect(cards).toHaveCount(0);
  await expect(sort).toHaveText("Les plus anciennes");
  await page.getByRole("button", { name: "Toutes", exact: true }).click();
  await expect(cards.first()).toHaveText("La tour des nuages");
  await page.reload();
  await expect(sort).toHaveText("Les plus anciennes");
  await expect(cards.first()).toHaveText("La tour des nuages");
  for (const width of [1440, 900, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await sort.click();
    const menu = page.getByRole("listbox");
    await expect(menu).toBeVisible();
    const bounds = (await menu.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    if (width === 1440 || width === 390)
      await page.screenshot({
        path: `/tmp/clik-project-sort-${info.project.name}-${width}.png`,
      });
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
  }
  await sort.click();
  await page.getByRole("option", { name: "Les plus récentes" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(cards.first()).toHaveText("La maison solaire");
});

test("le tri combine les créations locales et en ligne et transmet l’ordre au serveur", async ({
  page,
}) => {
  await seed(page);
  const fixture = await projectsFixture(page);
  await page.reload();
  const cards = page.locator(".project-card h2");
  await expect(cards).toHaveCount(5);
  await expect(cards.first()).toHaveText("Un ancien défi");
  const sort = page.getByRole("combobox", { name: "Trier par" });
  await sort.click();
  await page.getByRole("option", { name: "Les plus anciennes" }).click();
  await expect(cards).toHaveText([
    "La tour des nuages",
    "Le pont des couleurs",
    "La maison solaire",
    "Un ancien défi",
    "Le phare bleu",
  ]);
  await expect
    .poll(() => fixture.calls.lists.some((args) => args.sort === "oldest"))
    .toBe(true);
  await page.getByRole("button", { name: "En ligne", exact: true }).click();
  await expect(cards).toHaveText(["Un ancien défi", "Le phare bleu"]);
  await sort.click();
  await page.getByRole("option", { name: "Les plus récentes" }).click();
  await expect(
    page.getByRole("button", { name: "En ligne", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() => fixture.calls.lists.some((args) => args.sort === "recent"))
    .toBe(true);
});
