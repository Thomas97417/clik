import { waitForSceneUpdate } from "./wait-for-scene";
import { selectCameraView } from "./camera-view";
import { dragLibrary } from "./drag-library";
import { test, expect, type Page } from "@playwright/test";
import { Matrix4 } from "three";
import { worldMatrix } from "@clik/scene";
import type { PartPoint } from "./rendered-scene";

async function renderedFrame(page: Page) {
  await waitForSceneUpdate(page);
}

async function partPoints(page: Page, points: PartPoint[]) {
  await renderedFrame(page);
  return page.evaluate(async (points) => {
    const path = "/e2e/rendered-scene.ts";
    const { projectPartPoints } = await import(/* @vite-ignore */ path);
    return projectPartPoints(points) as { x: number; y: number }[];
  }, points);
}

async function setup(page: Page) {
  await page.goto("/editor");
  await page.locator('.piece-card[aria-label="Brique 2 × 2"]').click();
  await selectCameraView(page, "top");
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

async function projectState(page: Page) {
  return page.evaluate(async () => {
    const path = "/src/lib/clik/store.ts";
    const { useEditor } = await import(/* @vite-ignore */ path);
    const state = useEditor.getState();
    return JSON.parse(
      JSON.stringify({
        scene: state.scene,
        selection: state.selection,
        color: state.color,
        past: state.past,
        future: state.future,
        serial: state.serial,
      }),
    );
  });
}

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
  // Release after a rendered preview: WebKit can dispatch all synthetic moves
  // before the next animation frame, whereas the gesture deposits that preview.

  await waitForSceneUpdate(page);
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

for (const selection of ["pièce", "pièces", "groupe"]) {
  test(`orbiter conserve la sélection (${selection}), un clic sur le fond la retire au relâchement`, async ({
    page,
  }) => {
    const { canvas, box } = await setup(page);
    if (selection !== "pièce") {
      await page.locator('.piece-card[aria-label="Brique 1 × 1"]').click();
      await page.keyboard.press("a");
      if (selection === "groupe") await page.keyboard.press("g");
      await page
        .getByRole("button", { name: "Cadrer la sélection (F)" })
        .click();
    }
    const before = await projectState(page);
    const image = await canvas.evaluate((c: HTMLCanvasElement) =>
      c.toDataURL(),
    );
    const x = box.x + 50,
      y = box.y + 250;
    await page.mouse.move(x, y);
    await page.mouse.down();
    expect(await projectState(page)).toEqual(before);
    await page.mouse.move(x + 120, y + 80, { steps: 8 });
    expect(await projectState(page)).toEqual(before);
    await page.mouse.up();
    expect(await projectState(page)).toEqual(before);
    await expect
      .poll(() =>
        canvas.evaluate(
          (c: HTMLCanvasElement, previous) => c.toDataURL() !== previous,
          image,
        ),
      )
      .toBe(true);

    await page.mouse.move(x, y);
    await page.mouse.down();
    expect(await projectState(page)).toEqual(before);
    // Small pointer jitter still counts as a click.
    await page.mouse.move(x + 3, y);
    await page.mouse.up();
    await expect(page.locator(".tree-row.selected")).toHaveCount(0);
    expect(await projectState(page)).toEqual({ ...before, selection: [] });
  });
}

test("retour au point de départ, sortie du canvas et annulation de caméra conservent la sélection", async ({
  page,
}) => {
  const { canvas, box } = await setup(page);
  const before = await projectState(page);
  const x = box.x + 50,
    y = box.y + 250;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(box.x - 20, y, { steps: 5 });
  await page.mouse.move(x, y, { steps: 5 });
  await page.mouse.up();
  expect(await projectState(page)).toEqual(before);

  for (const action of ["escape", "pointercancel", "blur", "capture"]) {
    await page.mouse.move(x, y);
    await page.mouse.down();
    // An unrelated pointer release must not complete this pending click.
    await canvas.dispatchEvent("pointerup", { pointerId: 999 });
    expect(await projectState(page)).toEqual(before);
    if (action === "escape") await page.keyboard.press("Escape");
    if (action === "pointercancel") await canvas.dispatchEvent("pointercancel");
    if (action === "blur")
      await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    if (action === "capture") await canvas.dispatchEvent("lostpointercapture");
    await page.mouse.up();
    expect(await projectState(page)).toEqual(before);
  }
  // Cancellation must also leave the next ordinary click usable.
  await page.mouse.click(x, y);
  await expect(page.locator(".tree-row.selected")).toHaveCount(0);
});

test("empilement : plots éclairés, dépôt et désactivation de l’aimantation", async ({
  page,
}, info) => {
  const { canvas } = await setup(page);
  await page.locator('.piece-card[aria-label="Brique 2 × 2"]').click();
  await page.getByLabel("position Z", { exact: true }).fill("-3");
  await page.getByLabel("position Z", { exact: true }).press("Tab");
  await page.getByLabel("position X", { exact: true }).fill("0");
  await page.getByLabel("position X", { exact: true }).press("Tab");
  await page.getByLabel("position Y", { exact: true }).fill("0");
  await page.getByLabel("position Y", { exact: true }).press("Tab");
  await page.locator(".tree-name").first().click();
  await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
  const { scene } = await projectState(page);
  const [moving, support] = scene.nodes;
  const [start, target] = await partPoints(page, [
    { id: moving.id, local: [0, 1.2, 0] },
    { id: support.id, local: [0, 1.2, 0] },
  ]);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 25 });
  await expect(canvas).toHaveAttribute("data-dragging", "true");
  await expect(canvas).toHaveAttribute("data-snap-kind", "attachment");
  await expect(canvas).toHaveAttribute("data-snap-points", "4");
  await renderedFrame(page);
  await page.screenshot({
    path: `/tmp/clik-attachment-${info.project.name}.png`,
  });
  await page.mouse.up();
  await expect(page.getByLabel("position Y", { exact: true })).toHaveValue(
    "1.2",
  );
  await expect(page.getByLabel("position X", { exact: true })).toHaveValue("0");
  await expect(page.getByLabel("position Z", { exact: true })).toHaveValue(
    "-3",
  );
  await page.getByRole("button", { name: "Aimantation", exact: true }).click();
  await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
  const [freeStart, freeTarget] = await partPoints(page, [
    { id: moving.id, local: [0, 1.2, 0] },
    { id: moving.id, local: [0, 1.2, 0], offset: [2, 0, 0] },
  ]);
  await page.mouse.move(freeStart.x, freeStart.y);
  await page.mouse.down();
  await page.mouse.move(freeTarget.x, freeTarget.y, { steps: 6 });
  await expect(canvas).toHaveAttribute("data-dragging", "true");
  await expect(canvas).toHaveAttribute("data-snap-kind", "none");
  await renderedFrame(page);
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
  // Release after a rendered preview: WebKit can dispatch all synthetic moves
  // before the next animation frame, whereas the gesture deposits that preview.

  await waitForSceneUpdate(page);
  await page.mouse.up();
  const moved = await position(page);
  expect(moved).not.toEqual(["0", "0", "0"]);
  await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
  await dragLibrary(page, "Brique 2 × 2", x, y);
  await expect(canvas).toHaveAttribute("data-snap-kind", "attachment");
  await page.mouse.up();
  await expect(page.locator(".viewport-bottom")).toContainText("3 / 1 000");
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
  const { canvas } = await setup(page);
  await page.getByLabel("rotation Y", { exact: true }).fill("30");
  await page.getByLabel("rotation Y", { exact: true }).press("Tab");
  await page.getByRole("button", { name: "Aimantation", exact: true }).click();
  const { scene } = await projectState(page);
  const moving = scene.nodes[0];
  const offset: [number, number, number] = [0, 0, -0.2];
  const [start, target] = await partPoints(page, [
    { id: moving.id, local: [0.45, 1.2, 0.1] },
    { id: moving.id, local: [0.45, 1.2, 0.1], offset },
  ]);
  expect(Math.hypot(target.x - start.x, target.y - start.y)).toBeGreaterThan(4);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y);
  await expect(canvas).toHaveAttribute("data-dragging", "true");
  await renderedFrame(page);
  await page.mouse.up();
  const delta = (await position(page)).map(Number);
  // A short drag must follow the requested translation, without rebasing the
  // part's center under an off-center pointer. Allow CSS-pixel input rounding.
  delta.forEach((value, axis) => expect(value).toBeCloseTo(offset[axis], 1));
  await expect(page.getByLabel("rotation Y", { exact: true })).toHaveValue(
    "30",
  );
});

test("accroche sur une surface tournée autour de plusieurs axes", async ({
  page,
}) => {
  const { canvas } = await setup(page);
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
  const { scene } = await projectState(page);
  const [moving, support] = scene.nodes;
  const [start, target] = await partPoints(page, [
    { id: moving.id, local: [0, 1.2, 0] },
    { id: support.id, local: [0, 1.2, 0] },
  ]);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 25 });
  await expect(canvas).toHaveAttribute("data-dragging", "true");
  await expect(canvas).toHaveAttribute("data-snap-kind", "attachment");
  await expect(canvas).toHaveAttribute("data-snap-points", "4");
  await renderedFrame(page);
  await page.mouse.up();
  await expect(page.getByLabel("rotation X", { exact: true })).toHaveValue(
    "20",
  );
  await expect(page.getByLabel("rotation Z", { exact: true })).toHaveValue(
    "15",
  );
  const saved = await projectState(page);
  const actual = worldMatrix(saved.scene, moving.id);
  const expected = worldMatrix(saved.scene, support.id).multiply(
    new Matrix4().makeTranslation(0, 1.2, 0),
  );
  actual.elements.forEach((value, index) =>
    expect(value).toBeCloseTo(expected.elements[index], 6),
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
  await page.mouse.click(box.x + box.width - 65, box.y + box.height - 175);
  await expect(page.locator(".tree-row.selected")).toHaveCount(1);
  expect(await position(page)).toEqual(["0", "0", "0"]);
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  await expect(page.locator(".viewport-bottom")).toContainText("0 / 1 000");
});

async function wheelTurn(page: Page, deltaY: number) {
  await page.mouse.wheel(0, deltaY);
  await waitForSceneUpdate(page);
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
