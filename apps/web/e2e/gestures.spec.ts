import { test, expect, type Page } from "@playwright/test";

async function setup(page: Page) {
  await page.goto("/editor");
  await page.locator('.piece-card[aria-label="Brique 2 × 2"]').click();
  await page.getByLabel("Vue de la caméra").selectOption("top");
  await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
  const canvas = page.locator("canvas").first();
  await expect(canvas).toHaveAttribute("data-rendered", "1");
  const box = (await canvas.boundingBox())!;
  return { canvas, box, x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
const position = async (page: Page) =>
  Promise.all(
    ["X", "Y", "Z"].map((axis) =>
      page.getByLabel(`position ${axis}`, { exact: true }).inputValue(),
    ),
  );

test("clic, seuil, aperçu et un seul geste annulable", async ({
  page,
}, info) => {
  const { canvas, x, y } = await setup(page);
  const before = await position(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 3, y);
  await expect(canvas).not.toHaveAttribute("data-dragging", "true");
  await page.mouse.up();
  expect(await position(page)).toEqual(before);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 100, y + 40, { steps: 12 });
  await expect(canvas).toHaveAttribute("data-dragging", "true");
  await expect(canvas).toHaveAttribute("data-snap-kind", "grid");
  await page.screenshot({
    path: `/tmp/clik-drag-preview-${info.project.name}.png`,
  });
  await page.mouse.up();
  const after = await position(page);
  expect(after).not.toEqual(before);
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  await page.locator(".tree-name").first().click();
  expect(await position(page)).toEqual(before);
  await page.getByRole("button", { name: "Rétablir", exact: true }).click();
  await page.locator(".tree-name").first().click();
  expect(await position(page)).toEqual(after);
});

test("annulation par Échap, pointercancel et perte de focus ; dépôt hors canvas", async ({
  page,
}) => {
  const { canvas, box, x, y } = await setup(page);
  const before = await position(page);
  for (const action of ["escape", "cancel", "blur"]) {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 80, y + 20, { steps: 5 });
    await expect(canvas).toHaveAttribute("data-dragging", "true");
    if (action === "escape") await page.keyboard.press("Escape");
    else if (action === "cancel") await canvas.dispatchEvent("pointercancel");
    else await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await page.mouse.up();
    expect(await position(page)).toEqual(before);
    await expect(canvas).toHaveAttribute("data-snap-kind", "none");
  }
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 30, y, { steps: 15 });
  await page.mouse.up();
  expect(await position(page)).not.toEqual(before);
  await expect(canvas).not.toHaveAttribute("data-dragging", "true");
});

test("priorité caméra, geste figé, verrouillage et espace dans les formulaires", async ({
  page,
}) => {
  const { canvas, x, y } = await setup(page);
  const before = await position(page);
  for (const mode of ["space", "right"]) {
    await page.mouse.move(x, y);
    if (mode === "space") {
      await canvas.focus();
      await page.keyboard.down("Space");
    }
    await page.mouse.down({ button: mode === "right" ? "right" : "left" });
    await page.keyboard.up("Space");
    await page.mouse.move(x + 70, y + 30, { steps: 6 });
    await page.mouse.up({ button: mode === "right" ? "right" : "left" });
    expect(await position(page)).toEqual(before);
    await expect(page.locator(".tree-row.selected")).toHaveCount(1);
    await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
  }
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.keyboard.down("Space");
  await page.mouse.move(x + 60, y + 10, { steps: 5 });
  await expect(canvas).toHaveAttribute("data-dragging", "true");
  await page.keyboard.up("Space");
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await page.getByTitle("Verrouiller", { exact: true }).click();
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 60, y, { steps: 5 });
  await page.mouse.up();
  expect(await position(page)).toEqual(before);
  const input = page.getByLabel("Nom du projet");
  await input.fill("Mon");
  await input.press("End");
  await input.press("Space");
  await expect(input).toHaveValue("Mon ");
});

test("sélection immédiate, Maj-clic et désélection dans le vide", async ({
  page,
}) => {
  const { canvas, box, x, y } = await setup(page);
  await page.mouse.click(box.x + 50, box.y + 250);
  await expect(page.locator(".tree-row.selected")).toHaveCount(0);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await expect(page.locator(".tree-row.selected")).toHaveCount(1);
  await page.mouse.up();
  await page.keyboard.down("Shift");
  await page.mouse.down();
  await page.mouse.move(x + 80, y, { steps: 4 });
  await page.mouse.up();
  await page.keyboard.up("Shift");
  await expect(page.locator(".tree-row.selected")).toHaveCount(0);
  await expect(canvas).not.toHaveAttribute("data-dragging", "true");
});

test("empilement : plots éclairés, dépôt et désactivation de l’aimantation", async ({
  page,
}, info) => {
  const { canvas, x, y } = await setup(page);
  await page.locator('.piece-card[aria-label="Brique 2 × 2"]').click();
  await page.getByLabel("position X", { exact: true }).fill("0");
  await page.getByLabel("position X", { exact: true }).press("Tab");
  await page.getByLabel("position Y", { exact: true }).fill("0");
  await page.getByLabel("position Y", { exact: true }).press("Tab");
  await page.getByLabel("position Z", { exact: true }).fill("-3");
  await page.getByLabel("position Z", { exact: true }).press("Tab");
  await page.locator(".tree-name").first().click();
  await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 320, y, { steps: 25 });
  await expect(canvas).toHaveAttribute("data-snap-kind", "attachment");
  await expect(canvas).toHaveAttribute("data-snap-points", /[1-9]/);
  await page.screenshot({
    path: `/tmp/clik-attachment-${info.project.name}.png`,
  });
  await page.mouse.up();
  await expect(page.getByLabel("position Y", { exact: true })).toHaveValue(
    "1.2",
  );
  await page.getByRole("button", { name: "Aimantation", exact: true }).click();
  await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 60, y + 30, { steps: 6 });
  await expect(canvas).toHaveAttribute("data-dragging", "true");
  await expect(canvas).toHaveAttribute("data-snap-kind", "none");
  await page.mouse.up();
});

test("glisser un enfant conserve la sélection du groupe ; bibliothèque avec aperçu", async ({
  page,
}) => {
  const { canvas, x, y } = await setup(page);
  await page.locator('.piece-card[aria-label="Brique 2 × 2"]').click();
  await page.getByLabel("position X", { exact: true }).fill("0");
  await page.getByLabel("position X", { exact: true }).press("Tab");
  await page.getByLabel("position Y", { exact: true }).fill("1.2");
  await page.getByLabel("position Y", { exact: true }).press("Tab");
  await page
    .locator(".tree-name")
    .first()
    .click({ modifiers: ["Shift"] });
  await page.getByRole("button", { name: "Grouper", exact: true }).click();
  await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 140, y + 60, { steps: 12 });
  await expect(canvas).toHaveAttribute("data-dragging", "true");
  await expect(page.locator(".tree-row.selected .tree-name")).toHaveText(
    "Nouveau groupe",
  );
  await page.mouse.up();
  const moved = await position(page);
  expect(moved).not.toEqual(["0", "0", "0"]);
  await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
  const transfer = await page.evaluateHandle(() => new DataTransfer());
  await page
    .locator('.piece-card[aria-label="Brique 2 × 2"]')
    .dispatchEvent("dragstart", { dataTransfer: transfer });
  await canvas.dispatchEvent("dragover", {
    dataTransfer: transfer,
    clientX: x,
    clientY: y,
  });
  await expect(canvas).toHaveAttribute("data-snap-kind", "attachment");
  await canvas.dispatchEvent("drop", {
    dataTransfer: transfer,
    clientX: x + 100,
    clientY: y + 100,
  });
  await expect(page.locator(".viewport-bottom")).toContainText("3 / 500");
  await expect(page.getByLabel("position Y", { exact: true })).toHaveValue(
    "2.4",
  );
});

test("anneaux de rotation : aperçu, annulation et caméra prioritaire", async ({
  page,
}, info) => {
  const { canvas, box, x, y } = await setup(page);
  await page.getByRole("button", { name: "Tourner", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-tool", "rotate");
  const radius = (box.height * 1.9 * 0.8) / 14;
  await page.mouse.move(x + radius * 0.707, y + radius * 0.707);
  await page.mouse.down();
  await page.mouse.move(x - radius * 0.3, y + radius, { steps: 12 });
  await expect(canvas).toHaveAttribute("data-snap-kind", "grid");
  await page.screenshot({
    path: `/tmp/clik-rotation-${info.project.name}.png`,
  });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.getByLabel("rotation Y", { exact: true })).toHaveValue("0");
  await page.mouse.move(x + radius * 0.707, y + radius * 0.707);
  await canvas.focus();
  await page.keyboard.down("Space");
  await page.mouse.down();
  await page.mouse.move(x + radius, y + radius, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up("Space");
  await expect(canvas).toHaveAttribute("data-snap-kind", "none");
  await expect(page.getByLabel("rotation Y", { exact: true })).toHaveValue("0");
  await expect(page.locator(".tree-row.selected")).toHaveCount(1);
  await page.getByRole("button", { name: "Déplacer", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-tool", "translate");
});

test("prise décentrée sans saut et orientation conservée", async ({ page }) => {
  const { canvas, x, y } = await setup(page);
  await page.getByLabel("rotation Y", { exact: true }).fill("30");
  await page.getByLabel("rotation Y", { exact: true }).press("Tab");
  await page.getByRole("button", { name: "Aimantation", exact: true }).click();
  await page.mouse.move(x + 40, y - 20);
  await page.mouse.down();
  const frames = Number(await canvas.getAttribute("data-frames"));
  await page.mouse.move(x + 45, y - 20);
  await expect(canvas).toHaveAttribute("data-dragging", "true");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-frames")))
    .toBeGreaterThan(frames + 1);
  await page.mouse.up();
  const delta = (await position(page)).map(Number);
  expect(Math.hypot(...delta)).toBeLessThan(0.1);
  expect(Math.hypot(...delta)).toBeGreaterThan(0.001);
  await expect(page.getByLabel("rotation Y", { exact: true })).toHaveValue(
    "30",
  );
});

test("accroche sur une surface tournée autour de plusieurs axes", async ({
  page,
}) => {
  const { canvas, x, y } = await setup(page);
  await page.locator('.piece-card[aria-label="Brique 2 × 2"]').click();
  await page.getByLabel("position X", { exact: true }).fill("0");
  await page.getByLabel("position X", { exact: true }).press("Tab");
  for (const [label, value] of [
    ["position Z", "-3"],
    ["rotation X", "20"],
    ["rotation Z", "15"],
  ]) {
    await page.getByLabel(label, { exact: true }).fill(value);
    await page.getByLabel(label, { exact: true }).press("Tab");
  }
  await page.locator(".tree-name").first().click();
  await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 320, y, { steps: 25 });
  await expect(canvas).toHaveAttribute("data-snap-kind", "attachment");
  await page.mouse.up();
  await expect(page.getByLabel("rotation X", { exact: true })).toHaveValue(
    "20",
  );
  await expect(page.getByLabel("rotation Z", { exact: true })).toHaveValue(
    "15",
  );
});

test("déplacement rigide d’une sélection multiple sans groupe", async ({
  page,
}) => {
  const { canvas, x, y } = await setup(page);
  await page.locator('.piece-card[aria-label="Brique 2 × 2"]').click();
  await page.getByLabel("position X", { exact: true }).fill("0");
  await page.getByLabel("position X", { exact: true }).press("Tab");
  await page.getByLabel("position Y", { exact: true }).fill("1.2");
  await page.getByLabel("position Y", { exact: true }).press("Tab");
  await page
    .locator(".tree-name")
    .first()
    .click({ modifiers: ["Shift"] });
  await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 140, y + 60, { steps: 12 });
  await expect(canvas).toHaveAttribute("data-snap-kind", "grid");
  await page.mouse.up();
  await expect(page.locator(".tree-row.selected")).toHaveCount(2);
  await page.locator(".tree-name").first().click();
  const a = (await position(page)).map(Number);
  await page.locator(".tree-name").nth(1).click();
  const b = (await position(page)).map(Number);
  expect(a[0]).toBe(b[0]);
  expect(a[2]).toBe(b[2]);
  expect(b[1] - a[1]).toBeCloseTo(1.2);
  expect(Math.hypot(a[0], a[2])).toBeGreaterThan(0.5);
});

test("rotation déposée en une opération et caméra réutilisable après perte de focus", async ({
  page,
}) => {
  const { canvas, box, x, y } = await setup(page);
  await page.getByRole("button", { name: "Tourner", exact: true }).click();
  const radius = (box.height * 1.9 * 0.8) / 14;
  await page.mouse.move(x + radius * 0.707, y + radius * 0.707);
  await page.mouse.down();
  await page.mouse.move(x - radius * 0.3, y + radius, { steps: 12 });
  await expect(canvas).toHaveAttribute("data-snap-kind", "grid");
  await page.mouse.up();
  await expect(page.getByLabel("rotation Y", { exact: true })).not.toHaveValue(
    "0",
  );
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  await page.locator(".tree-name").first().click();
  await expect(page.getByLabel("rotation Y", { exact: true })).toHaveValue("0");
  await page.getByRole("button", { name: "Déplacer", exact: true }).click();
  await page.mouse.move(x, y);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(x + 50, y + 30, { steps: 5 });
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.mouse.up({ button: "right" });
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 100, y, { steps: 8 });
  await expect(canvas).toHaveAttribute("data-snap-kind", "grid");
  await page.mouse.up();
});

test("le repère d’orientation conserve la sélection et l’historique", async ({
  page,
}) => {
  const { box } = await setup(page);
  await page.mouse.click(box.x + box.width - 65, box.y + box.height - 25);
  await expect(page.locator(".tree-row.selected")).toHaveCount(1);
  expect(await position(page)).toEqual(["0", "0", "0"]);
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  await expect(page.locator(".viewport-bottom")).toContainText("0 / 500");
});

async function wheelTurn(page: Page, deltaY: number) {
  const canvas = page.locator("canvas").first();
  const frames = Number(await canvas.getAttribute("data-frames"));
  await page.mouse.wheel(0, deltaY);
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-frames")))
    .toBeGreaterThan(frames + 1);
}

test("molette pendant la prise : +90°, −90° et un seul historique", async ({
  page,
}) => {
  const { canvas, x, y } = await setup(page);
  const before = await position(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  // No pointer displacement is necessary to start a quarter turn.
  await wheelTurn(page, -100);
  await expect(canvas).toHaveAttribute("data-snap-kind", "grid");
  await page.mouse.up();
  await expect(page.getByLabel("rotation Y", { exact: true })).toHaveValue(
    "90",
  );
  expect(await position(page)).toEqual(before);
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  await page.locator(".tree-name").first().click();
  await expect(page.getByLabel("rotation Y", { exact: true })).toHaveValue("0");
  await page.getByRole("button", { name: "Rétablir", exact: true }).click();
  await page.locator(".tree-name").first().click();
  await expect(page.getByLabel("rotation Y", { exact: true })).toHaveValue(
    "90",
  );
  await page.mouse.move(x, y);
  await page.mouse.down();
  await wheelTurn(page, 100);
  await wheelTurn(page, 100);
  await page.mouse.up();
  await expect(page.getByLabel("rotation Y", { exact: true })).toHaveValue(
    "-90",
  );
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  await page.locator(".tree-name").first().click();
  await expect(page.getByLabel("rotation Y", { exact: true })).toHaveValue(
    "90",
  );
});

test("molette et déplacement : rotation conservée, annulation et verrouillage", async ({
  page,
}) => {
  const { canvas, x, y } = await setup(page);
  await page.getByRole("button", { name: "Aimantation", exact: true }).click();
  const before = await position(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 80, y + 40, { steps: 8 });
  await wheelTurn(page, 100);
  await page.mouse.move(x + 140, y + 60, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByLabel("rotation Y", { exact: true })).toHaveValue(
    "-90",
  );
  expect(await position(page)).not.toEqual(before);
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  await page.locator(".tree-name").first().click();
  expect(await position(page)).toEqual(before);
  await expect(page.getByLabel("rotation Y", { exact: true })).toHaveValue("0");
  await page.mouse.move(x, y);
  await page.mouse.down();
  await wheelTurn(page, -100);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.getByLabel("rotation Y", { exact: true })).toHaveValue("0");
  await expect(canvas).toHaveAttribute("data-snap-kind", "none");
  await page.getByTitle("Verrouiller", { exact: true }).click();
  await page.mouse.move(x, y);
  await page.mouse.down();
  await wheelTurn(page, -100);
  await page.mouse.up();
  await expect(page.getByLabel("rotation Y", { exact: true })).toHaveValue("0");
});

test("molette : sélection rigide et zoom préservé hors prise", async ({
  page,
}) => {
  const { canvas, x, y } = await setup(page);
  await page.locator('.piece-card[aria-label="Brique 2 × 2"]').click();
  await page.getByLabel("position X", { exact: true }).fill("0");
  await page.getByLabel("position X", { exact: true }).press("Tab");
  await page.getByLabel("position Y", { exact: true }).fill("1.2");
  await page.getByLabel("position Y", { exact: true }).press("Tab");
  await page
    .locator(".tree-name")
    .first()
    .click({ modifiers: ["Shift"] });
  await page.getByRole("button", { name: "Grouper", exact: true }).click();
  await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
  await page.mouse.move(x, y);
  const imageBefore = await canvas.evaluate((c: HTMLCanvasElement) =>
    c.toDataURL(),
  );
  await page.mouse.down();
  await wheelTurn(page, -100);
  await wheelTurn(page, 100);
  await page.mouse.up();
  // Opposite turns cancel each other; the camera must not have zoomed.
  await expect
    .poll(() =>
      canvas.evaluate(
        (c: HTMLCanvasElement, before) => c.toDataURL() === before,
        imageBefore,
      ),
    )
    .toBe(true);
  await page.mouse.down();
  await wheelTurn(page, -100);
  await page.mouse.up();
  await expect(page.locator(".tree-row.selected .tree-name")).toHaveText(
    "Nouveau groupe",
  );
  await expect(page.getByLabel("rotation Y", { exact: true })).toHaveValue(
    "90",
  );
  await page.locator(".tree-name").nth(1).click();
  await expect(page.getByLabel("rotation Y", { exact: true })).toHaveValue("0");
  await page.mouse.move(x, y);
  const zoomBefore = await canvas.evaluate((c: HTMLCanvasElement) =>
    c.toDataURL(),
  );
  await wheelTurn(page, 100);
  await expect
    .poll(() =>
      canvas.evaluate(
        (c: HTMLCanvasElement, before) => c.toDataURL() === before,
        zoomBefore,
      ),
    )
    .toBe(false);
});
