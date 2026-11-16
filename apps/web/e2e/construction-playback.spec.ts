import { test, expect, type Locator, type Page } from "@playwright/test";
import { emptyScene, makePart } from "@clik/scene";
import { creatorsFixture } from "./fixtures/creators";

test.use({ hasTouch: true });

async function scrub(page: Page, slider: Locator, fraction: number) {
  const box = (await slider.boundingBox())!;
  // Keep clear of the native range's thumb inset.
  await page.mouse.move(box.x + 8, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + 8 + (box.width - 16) * fraction,
    box.y + box.height / 2,
    { steps: 8 },
  );
  await page.mouse.up();
}

test("atelier : dates persistantes, lecture, pause, déplacement souris et retour à l’édition sans modification", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/editor?draft=playback");
  for (const name of ["Brique 1 × 1", "Brique 2 × 2", "Brique 2 × 4"])
    await page.getByRole("button", { name, exact: true }).click();
  const status = page.getByLabel("Projet et sauvegarde").getByRole("status");
  await expect(status).toContainText("Enregistré");
  const saved = () =>
    page.evaluate(
      () =>
        new Promise<any>((resolve, reject) => {
          const request = indexedDB.open("clik", 1);
          request.onsuccess = () => {
            const db = request.result;
            const read = db
              .transaction("drafts")
              .objectStore("drafts")
              .get("guest:playback");
            read.onsuccess = () => {
              resolve(read.result);
              db.close();
            };
            read.onerror = () => {
              reject(read.error);
              db.close();
            };
          };
          request.onerror = () => reject(request.error);
        }),
    );
  const before = await saved();
  const dates = before.scene.nodes.map((part: any) => part.createdAt);
  expect(
    dates.every((stamp: number) => Number.isSafeInteger(stamp) && stamp > 0),
  ).toBe(true);
  expect(dates[1]).toBeGreaterThan(dates[0]);
  expect(dates[2]).toBeGreaterThan(dates[1]);
  await page.reload();
  const timeline = page.getByRole("group", {
    name: "Lecture de la construction",
    exact: true,
  });
  const slider = timeline.getByRole("slider");
  const canvas = page.locator(".viewport canvas");
  await expect(canvas).toHaveAttribute("data-rendered", "3");
  await expect(timeline.locator(".construction-progress")).toHaveText(
    "3 / 3 pièces",
  );
  await timeline
    .getByRole("button", { name: "Revenir au début de la construction" })
    .click();
  await expect(canvas).toHaveAttribute("data-rendered", "0");
  await page.keyboard.press("Delete");
  await page.keyboard.press("Control+d");
  await expect(
    page
      .getByRole("complementary", { name: "Bibliothèque de pièces" })
      .getByRole("button", { name: "Brique 1 × 1", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Importer un projet", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Aide de l’atelier", exact: true }),
  ).toBeDisabled();
  await timeline
    .getByRole("button", { name: "Lire la construction", exact: true })
    .click();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-rendered")))
    .toBeGreaterThan(0);
  await timeline
    .getByRole("button", { name: "Mettre en pause la construction" })
    .click();
  const paused = await slider.inputValue();
  await page.waitForTimeout(200);
  expect(await slider.inputValue()).toBe(paused);
  await scrub(page, slider, 0);
  await expect(canvas).toHaveAttribute("data-rendered", "0");
  await slider.focus();
  await slider.press("End");
  await expect(canvas).toHaveAttribute("data-rendered", "3");
  await timeline.getByLabel("Vitesse de lecture").selectOption("4");
  await timeline
    .getByRole("button", { name: "Lire la construction", exact: true })
    .click();
  await expect(
    timeline.getByRole("button", { name: "Lire la construction", exact: true }),
  ).toBeVisible();
  await expect(canvas).toHaveAttribute("data-rendered", "3");
  await timeline.getByRole("button", { name: "Revenir à l’édition" }).click();
  await timeline
    .getByRole("button", { name: "Revenir au début de la construction" })
    .click();
  await page.keyboard.press("Escape");
  await expect(canvas).toHaveAttribute("data-rendered", "3");
  await expect(
    timeline.getByRole("button", { name: "Revenir à l’édition" }),
  ).toHaveCount(0);
  await expect(
    page
      .getByRole("complementary", { name: "Bibliothèque de pièces" })
      .getByRole("button", { name: "Brique 1 × 1", exact: true }),
  ).toBeEnabled();
  expect((await saved()).scene).toEqual(before.scene);
  expect((await saved()).stamp).toBe(before.stamp);
  await page.locator(".viewport").screenshot({
    path: `/tmp/clik-construction-editor-${info.project.name}.png`,
  });
  expect(errors).toEqual([]);
});

test("galerie : lecture publique, timeline tactile et clavier sur mobile", async ({
  page,
}, info) => {
  const scene = {
    ...emptyScene(),
    nodes: [
      { ...makePart("brick-2x4", "#4079e8"), id: "base", createdAt: 1000 },
      {
        ...makePart("brick-2x2", "#ef4444", [0, 1.2, 0]),
        id: "middle",
        createdAt: 2000,
      },
      {
        ...makePart("brick-1x1", "#f8cc36", [0, 2.4, 0]),
        id: "top",
        createdAt: 86400000,
      },
    ],
  };
  await creatorsFixture(page, false, { scene });
  await page.goto("/gallery");
  await page
    .locator('.public-creation-card a[href="/creations/creation-0"]')
    .first()
    .click();
  const timeline = page.getByRole("group", {
    name: "Lecture de la construction",
    exact: true,
  });
  const canvas = page.locator(".public-scene canvas");
  await expect(canvas).toHaveAttribute("data-rendered", "3");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const slider = timeline.getByRole("slider");
    await timeline
      .getByRole("button", { name: "Revenir au début de la construction" })
      .click();
    await expect(canvas).toHaveAttribute("data-rendered", "0");
    if (width === 390) {
      const box = (await slider.boundingBox())!;
      await page.touchscreen.tap(
        box.x + 8 + (box.width - 16) * 0.6,
        box.y + box.height / 2,
      );
    } else await scrub(page, slider, 0.6);
    await expect(canvas).toHaveAttribute("data-rendered", "2");
    await page
      .getByRole("button", { name: "Réinitialiser la vue", exact: true })
      .click();
    await expect(canvas).toHaveAttribute("data-rendered", "2");
    await slider.focus();
    await slider.press("End");
    await expect(canvas).toHaveAttribute("data-rendered", "3");
    await timeline.getByLabel("Vitesse de lecture").selectOption("4");
    await timeline
      .getByRole("button", { name: "Lire la construction", exact: true })
      .click();
    await expect(
      timeline.getByRole("button", { name: "Mettre en pause la construction" }),
    ).toBeVisible();
    await expect(
      timeline.getByRole("button", {
        name: "Lire la construction",
        exact: true,
      }),
    ).toBeVisible();
    await expect(canvas).toHaveAttribute("data-rendered", "3");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.locator(".creation-preview-panel").screenshot({
      path: `/tmp/clik-construction-public-${info.project.name}-${width}.png`,
    });
  }
});

test("les publications anciennes sans dates n’affichent pas de lecteur", async ({
  page,
}) => {
  await creatorsFixture(page);
  await page.goto("/creations/creation-0");
  await expect(page.locator(".public-scene canvas")).toHaveAttribute(
    "data-rendered",
    "1",
  );
  await expect(
    page.getByRole("group", {
      name: "Lecture de la construction",
      exact: true,
    }),
  ).toHaveCount(0);
});
