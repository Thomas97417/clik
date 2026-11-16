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

async function expectSingleLine(timeline: Locator) {
  const metrics = await timeline.evaluate((element) => {
    const controls = [...element.querySelectorAll("button, input")].map(
      (control) => {
        const box = control.getBoundingClientRect();
        return box.y + box.height / 2;
      },
    );
    return {
      height: element.getBoundingClientRect().height,
      overflow: element.scrollWidth > element.clientWidth,
      spread: Math.max(...controls) - Math.min(...controls),
    };
  });
  expect(metrics.height).toBeLessThanOrEqual(42);
  expect(metrics.overflow).toBe(false);
  expect(metrics.spread).toBeLessThan(1);
  await expect(timeline.getByRole("combobox")).toHaveCount(0);
}

async function setSpeed(timeline: Locator, speed: string) {
  const button = timeline.getByRole("button", { name: /^Vitesse de lecture/ });
  for (let attempt = 0; attempt < 4; attempt++) {
    if ((await button.textContent()) === speed) return;
    await button.click();
  }
  await expect(button).toHaveText(speed);
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
  await expectSingleLine(timeline);
  const speedButton = timeline.getByRole("button", {
    name: /^Vitesse de lecture/,
  });
  await expect(speedButton).toHaveText("1×");
  await speedButton.press("Enter");
  await expect(speedButton).toHaveText("2×");
  for (const speed of ["4×", "0,5×", "1×"]) {
    await speedButton.click();
    await expect(speedButton).toHaveText(speed);
  }
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
  await setSpeed(timeline, "4×");
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
  ).toBeDisabled();
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
    await expectSingleLine(timeline);
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
    await setSpeed(timeline, "4×");
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

test("atelier : la lecture conserve la caméra, l’éclairage et la taille du canvas", async ({
  page,
}) => {
  await page.goto("/editor?draft=playback-view");
  for (const name of ["Brique 1 × 1", "Brique 2 × 2", "Brique 2 × 4"])
    await page.getByRole("button", { name, exact: true }).click();
  const canvas = page.locator(".viewport canvas");
  await expect(canvas).toHaveAttribute("data-rendered", "3");
  // Clear the selection so its tint does not affect the lighting comparison.
  await canvas.click({ position: { x: 20, y: 100 } });
  await expect(page.locator(".tree-row.selected")).toHaveCount(0);
  await page.keyboard.press("f");
  await page.getByRole("combobox", { name: "Vue de la caméra" }).click();
  await page.getByRole("option", { name: "Dessus", exact: true }).click();
  await page
    .getByRole("button", { name: "Tout éclairer", exact: true })
    .click();
  const pixels = () =>
    canvas.evaluate((canvas: HTMLCanvasElement) => {
      const copy = document.createElement("canvas");
      copy.width = canvas.width;
      copy.height = canvas.height;
      const context = copy.getContext("2d")!;
      context.drawImage(canvas, 0, 0);
      const { data } = context.getImageData(0, 0, copy.width, copy.height);
      let count = 0,
        x = 0,
        y = 0,
        red = 0,
        green = 0,
        blue = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 2] > data[i] * 1.2 && data[i + 2] > data[i + 1] * 1.1) {
          count++;
          x += (i / 4) % copy.width;
          y += Math.floor(i / 4 / copy.width);
          red += data[i];
          green += data[i + 1];
          blue += data[i + 2];
        }
      }
      return {
        count,
        x: x / count,
        y: y / count,
        red: red / count,
        green: green / count,
        blue: blue / count,
      };
    });
  const frame = Number(await canvas.getAttribute("data-frames"));
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-frames")))
    .toBeGreaterThan(frame + 5);
  const before = await pixels();
  const bounds = await canvas.boundingBox();
  const timeline = page.getByRole("group", {
    name: "Lecture de la construction",
    exact: true,
  });
  const slider = timeline.getByRole("slider");
  await slider.focus();
  await slider.press("Home");
  await slider.press("End");
  await expect(
    timeline.getByRole("button", { name: "Revenir à l’édition" }),
  ).toBeEnabled();
  const expectSameView = async () => {
    await expect
      .poll(async () => {
        const current = await pixels();
        return Math.max(
          ...["x", "y", "red", "green", "blue"].map((key) =>
            Math.abs(
              current[key as keyof typeof current] -
                before[key as keyof typeof before],
            ),
          ),
        );
      })
      .toBeLessThan(0.5);
    expect(
      Math.abs((await pixels()).count - before.count) / before.count,
    ).toBeLessThan(0.01);
    expect(await canvas.boundingBox()).toEqual(bounds);
    await expectSingleLine(timeline);
  };
  await expectSameView();
  await timeline.getByRole("button", { name: "Revenir à l’édition" }).click();
  await expectSameView();
  await expect(
    page.getByRole("button", { name: "Tout éclairer", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
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
