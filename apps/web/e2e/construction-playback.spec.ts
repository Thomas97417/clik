import { waitForSceneUpdate } from "./wait-for-scene";
import { test, expect, type Locator, type Page } from "@playwright/test";
import { emptyScene, makePart } from "@clik/scene";
import { creatorsFixture } from "./fixtures/creators";
import { dragLibrary } from "./drag-library";
import { selectCameraView } from "./camera-view";

test.use({ hasTouch: true });

test.beforeEach(async ({ page }) => {
  // Local editor tests must stay anonymous even while the public HTTP fixture is running.
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({ json: null }),
  );
  await page.route("**/api/auth/convex/token*", (route) =>
    route.fulfill({ json: { token: null } }),
  );
});

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
  await expect(
    page
      .getByRole("complementary", { name: "Bibliothèque de pièces" })
      .getByRole("button", { name: "Brique 1 × 1", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Importer un projet", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Aide de l’atelier", exact: true }),
  ).toBeEnabled();
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

test("atelier : prendre une pièce interrompt la lecture et conserve un dépôt unique annulable", async ({
  page,
}) => {
  await page.goto("/editor?draft=playback-drop");
  const library = page.getByRole("complementary", {
    name: "Bibliothèque de pièces",
  });
  for (const name of ["Brique 1 × 1", "Brique 2 × 2"])
    await library.getByRole("button", { name, exact: true }).click();
  const timeline = page.getByRole("group", {
    name: "Lecture de la construction",
    exact: true,
  });
  const canvas = page.locator(".viewport canvas");
  await expect(canvas).toHaveAttribute("data-rendered", "2");
  await setSpeed(timeline, "0,5×");
  const bounds = (await canvas.boundingBox())!;
  let count = 2;
  for (const mode of ["playing", "paused", "finished"]) {
    await timeline
      .getByRole("button", { name: "Revenir au début de la construction" })
      .click();
    if (mode === "playing")
      await timeline
        .getByRole("button", { name: "Lire la construction", exact: true })
        .click();
    if (mode === "finished") await timeline.getByRole("slider").press("End");
    await expect(timeline).toHaveAttribute("data-active", "true");
    await dragLibrary(
      page,
      "Plaque 2 × 2",
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    await expect(timeline).toHaveAttribute("data-active", "false");
    await expect(canvas).toHaveAttribute("data-rendered", String(count));
    await page.mouse.up();
    await expect(canvas).toHaveAttribute("data-rendered", String(++count));
    await expect(page.locator(".piece-card.active")).toHaveCount(0);
    await expect(
      timeline.getByRole("button", {
        name: "Lire la construction",
        exact: true,
      }),
    ).toBeEnabled();
    await page.keyboard.press("Control+z");
    await expect(canvas).toHaveAttribute("data-rendered", String(count - 1));
    await page.keyboard.press("Control+Shift+z");
    await expect(canvas).toHaveAttribute("data-rendered", String(count));
  }
  // Clicks and keyboard additions also leave playback without an explicit mode change.
  const card = library.getByRole("button", {
    name: "Brique 1 × 1",
    exact: true,
  });
  for (const action of ["click", "keyboard"]) {
    await timeline
      .getByRole("button", { name: "Revenir au début de la construction" })
      .click();
    if (action === "click") await card.click();
    else await card.press("Enter");
    await expect(timeline).toHaveAttribute("data-active", "false");
    await expect(canvas).toHaveAttribute("data-rendered", String(++count));
    await expect(
      timeline.getByRole("button", {
        name: "Lire la construction",
        exact: true,
      }),
    ).toBeEnabled();
  }
  await expect(
    page.getByLabel("Projet et sauvegarde").getByRole("status"),
  ).toContainText("Enregistré");
  await page.reload();
  await expect(canvas).toHaveAttribute("data-rendered", String(count));
});

test("atelier : annuler une pose après lecture ne bloque ni la bibliothèque ni le lecteur", async ({
  page,
}) => {
  await page.goto("/editor?draft=playback-cancel-drop");
  await page.locator('.piece-card[aria-label="Brique 2 × 2"]').click();
  const timeline = page.getByRole("group", {
    name: "Lecture de la construction",
    exact: true,
  });
  const canvas = page.locator(".viewport canvas");
  await expect(canvas).toHaveAttribute("data-rendered", "1");
  const bounds = (await canvas.boundingBox())!;
  await page.evaluate(() =>
    window.addEventListener(
      "pointerdown",
      (event) => {
        document.body.dataset.libraryPointerId = String(event.pointerId);
      },
      true,
    ),
  );
  for (const action of ["escape", "outside", "blur", "cancel", "capture"]) {
    await timeline
      .getByRole("button", { name: "Revenir au début de la construction" })
      .click();
    await dragLibrary(
      page,
      "Brique 1 × 4",
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    if (action === "escape") await page.keyboard.press("Escape");
    if (action === "outside")
      await page.mouse.move(180, bounds.y + bounds.height / 2);
    if (action === "blur")
      await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    if (action === "cancel")
      await page.locator(".piece-card.active").evaluate((card) => {
        card.dispatchEvent(
          new PointerEvent("pointercancel", {
            pointerId: Number(document.body.dataset.libraryPointerId),
            bubbles: true,
          }),
        );
      });
    if (action === "capture")
      await page.locator(".piece-card.active").evaluate((card) => {
        card.releasePointerCapture(
          Number(document.body.dataset.libraryPointerId),
        );
      });
    await page.mouse.up();
    await expect(canvas).toHaveAttribute("data-rendered", "1");
    await expect(page.locator(".piece-card.active")).toHaveCount(0);
    await expect(timeline).toHaveAttribute("data-active", "false");
    await expect(
      timeline.getByRole("button", {
        name: "Lire la construction",
        exact: true,
      }),
    ).toBeEnabled();
  }
  // Reproduce an interrupted press arriving while the reader is already active.
  await timeline
    .getByRole("button", { name: "Revenir au début de la construction" })
    .click();
  await page.evaluate(async () => {
    const path = "/src/lib/clik/store.ts";
    const { useEditor } = await import(/* @vite-ignore */ path);
    useEditor.setState({
      pending: "brick-1x4",
      libraryPointer: { id: 123, type: "brick-1x4", x: 0, y: 0 },
    });
  });
  await expect(timeline).toHaveAttribute("data-active", "false");
  await expect(canvas).toHaveAttribute("data-rendered", "1");
  await page.keyboard.press("Escape");
  await expect(
    timeline.getByRole("button", { name: "Lire la construction", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".piece-card.active")).toHaveCount(0);
  await page.locator('.piece-card[aria-label="Brique 1 × 4"]').click();
  await expect(canvas).toHaveAttribute("data-rendered", "2");
});

test("atelier : déplacer une pièce visible quitte la lecture, tourner la caméra la conserve", async ({
  page,
}) => {
  await page.goto("/editor?draft=playback-move");
  await page.locator('.piece-card[aria-label="Brique 2 × 2"]').click();
  await selectCameraView(page, "top");
  await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
  const position = () =>
    Promise.all(
      ["X", "Y", "Z"].map((axis) =>
        page.getByLabel(`position ${axis}`, { exact: true }).inputValue(),
      ),
    );
  const before = await position();
  const timeline = page.getByRole("group", {
    name: "Lecture de la construction",
    exact: true,
  });
  const canvas = page.locator(".viewport canvas");
  await timeline
    .getByRole("button", { name: "Revenir au début de la construction" })
    .click();
  await timeline.getByRole("slider").press("End");
  await expect(canvas).toHaveAttribute("data-rendered", "1");
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 60, box.y + 120, { steps: 8 });
  await page.mouse.up();
  await expect(timeline).toHaveAttribute("data-active", "true");
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 100, y + 30, { steps: 12 });
  await expect(timeline).toHaveAttribute("data-active", "false");
  await expect(canvas).toHaveAttribute("data-dragging", "true");

  await waitForSceneUpdate(page);
  await page.mouse.up();
  expect(await position()).not.toEqual(before);
  await expect(canvas).toHaveAttribute("data-rendered", "1");
  await page.keyboard.press("Control+z");
  await page.locator(".tree-name").first().click();
  expect(await position()).toEqual(before);
});

test("atelier : propriétés et raccourcis interrompent la lecture pour modifier la scène complète", async ({
  page,
}) => {
  await page.goto("/editor?draft=playback-edit");
  await page.locator('.piece-card[aria-label="Brique 2 × 2"]').click();
  await page.locator('.piece-card[aria-label="Brique 1 × 1"]').click();
  const timeline = page.getByRole("group", {
    name: "Lecture de la construction",
    exact: true,
  });
  const canvas = page.locator(".viewport canvas");
  await timeline
    .getByRole("button", { name: "Revenir au début de la construction" })
    .click();
  const input = page.getByLabel("position X", { exact: true });
  await input.fill("12");
  await input.press("Tab");
  await expect(timeline).toHaveAttribute("data-active", "false");
  await expect(canvas).toHaveAttribute("data-rendered", "2");
  await expect(input).toHaveValue("12");
  await timeline
    .getByRole("button", { name: "Revenir au début de la construction" })
    .click();
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.keyboard.press("Control+d");
  await expect(timeline).toHaveAttribute("data-active", "false");
  await expect(canvas).toHaveAttribute("data-rendered", "3");
  await page.keyboard.press("Control+z");
  await expect(canvas).toHaveAttribute("data-rendered", "2");
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

  await waitForSceneUpdate(page);
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
