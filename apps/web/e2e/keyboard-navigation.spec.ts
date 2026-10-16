import { expect, test, type Page } from "@playwright/test";
import { selectCameraView } from "./camera-view";

const count = (page: Page, parts: number) =>
  expect(page.locator(".viewport-bottom")).toContainText(`${parts} / 500`);
async function scene(page: Page) {
  return page.evaluate(async () => {
    const path = "/src/lib/clik/store.ts";
    const { useEditor } = await import(/* @vite-ignore */ path);
    const state = useEditor.getState();
    return JSON.stringify({
      scene: state.scene,
      selection: state.selection,
      serial: state.serial,
      past: state.past,
    });
  });
}
async function pixels(page: Page) {
  return page
    .locator("canvas")
    .first()
    .evaluate(async (canvas: HTMLCanvasElement) => {
      const image = new Image();
      image.src = canvas.toDataURL();
      await image.decode();
      const surface = document.createElement("canvas");
      surface.width = canvas.width;
      surface.height = canvas.height;
      const context = surface.getContext("2d")!;
      context.drawImage(image, 0, 0);
      const left = Math.floor(canvas.width * 0.15),
        top = Math.floor(canvas.height * 0.2);
      const width = Math.floor(canvas.width * 0.65),
        height = Math.floor(canvas.height * 0.5);
      const { data } = context.getImageData(left, top, width, height);
      let count = 0,
        x = 0,
        y = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 2] > data[i] * 1.3 && data[i + 2] > data[i + 1] * 1.15) {
          count++;
          x += (i / 4) % width;
          y += Math.floor(i / 4 / width);
        }
      }
      return { count, x: x / count, y: y / count };
    });
}
async function frames(page: Page, action: () => Promise<unknown>) {
  const canvas = page.locator("canvas").first();
  const before = Number(await canvas.getAttribute("data-frames"));
  await action();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-frames")))
    .toBeGreaterThan(before + 2);
}
async function reset(page: Page) {
  await frames(page, () =>
    page
      .getByRole("button", { name: "Cadrer la sélection (F)", exact: true })
      .click(),
  );
}
async function hold(page: Page, key: string) {
  await page.keyboard.down(key);
  await page.waitForTimeout(180);
  await page.keyboard.up(key);
  await frames(page, async () => {});
}
async function setup(page: Page) {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Brique 2 × 2", exact: true }).click();
  await expect(page.locator("canvas").first()).toHaveAttribute(
    "data-rendered",
    "1",
  );
  await selectCameraView(page, "front");
  await reset(page);
  await expect
    .poll(async () => (await pixels(page)).count)
    .toBeGreaterThan(100);
}

test("A sélectionne tout, G groupe une seule fois et la duplication utilise Ctrl/Commande+D", async ({
  page,
}) => {
  await setup(page);
  await page.getByRole("button", { name: "Brique 1 × 1", exact: true }).click();
  await page.keyboard.press("a");
  await expect(page.locator(".tree-row.selected")).toHaveCount(2);
  await page.keyboard.down("g");
  await page.keyboard.down("g");
  await page.keyboard.up("g");
  await expect(page.locator(".tree-row")).toHaveCount(3);
  await expect(page.locator(".tree-toggle")).toHaveCount(1);
  await expect(page.locator(".tree-row.selected")).toHaveCount(1);
  await count(page, 2);
  await page.keyboard.press("Control+z");
  await expect(page.locator(".tree-row")).toHaveCount(2);
  await page.keyboard.press("a");
  await page.keyboard.press("Control+g");
  await expect(page.locator(".tree-toggle")).toHaveCount(1);
  await page.keyboard.press("Control+Shift+g");
  await expect(page.locator(".tree-toggle")).toHaveCount(0);
  await page.keyboard.press("g");
  await expect(page.locator(".tree-row")).toHaveCount(2);
  await page.keyboard.press("a");
  await page.keyboard.press("Control+d");
  await count(page, 4);
  await page.keyboard.press("Meta+d");
  await count(page, 6);
});

test("ZQSD suit la caméra sans modifier les pièces ; les flèches déplacent la caméra sans sélection", async ({
  page,
}) => {
  await setup(page);
  const initial = await scene(page);
  for (const key of ["z", "q", "s", "d"]) {
    await reset(page);
    const before = await pixels(page);
    await hold(page, key);
    const after = await pixels(page);
    if (key === "z") expect(after.count).toBeGreaterThan(before.count * 1.05);
    if (key === "s") expect(after.count).toBeLessThan(before.count * 0.95);
    if (key === "q") expect(after.x).toBeGreaterThan(before.x + 5);
    if (key === "d") expect(after.x).toBeLessThan(before.x - 5);
    expect(await scene(page)).toEqual(initial);
    await page.waitForTimeout(120);
    const stopped = await pixels(page);
    expect(stopped).toEqual(after);
  }
  await selectCameraView(page, "right");
  await reset(page);
  const side = await pixels(page);
  await hold(page, "q");
  expect((await pixels(page)).x).toBeGreaterThan(side.x + 5);
  await selectCameraView(page, "front");
  await reset(page);
  // With a selection, an arrow still moves the piece by one stud.
  await page.locator(".tree-name").click();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("position X", { exact: true })).toHaveValue("1");
  await page.keyboard.press("Control+z");
  // Undo clears the selection: the same arrows now translate the camera.
  await expect(page.locator(".tree-row.selected")).toHaveCount(0);
  const withoutSelection = await scene(page);
  for (const [key, direction] of [
    ["ArrowUp", "z"],
    ["ArrowLeft", "q"],
    ["ArrowDown", "s"],
    ["ArrowRight", "d"],
  ]) {
    await reset(page);
    const before = await pixels(page);
    await hold(page, key);
    const after = await pixels(page);
    if (direction === "z")
      expect(after.count).toBeGreaterThan(before.count * 1.05);
    if (direction === "s")
      expect(after.count).toBeLessThan(before.count * 0.95);
    if (direction === "q") expect(after.x).toBeGreaterThan(before.x + 5);
    if (direction === "d") expect(after.x).toBeLessThan(before.x - 5);
    expect(await scene(page)).toEqual(withoutSelection);
  }
});

test("saisie, menus et aide conservent leurs touches ; une perte de focus arrête la caméra", async ({
  page,
}) => {
  await setup(page);
  const before = await scene(page);
  const image = await pixels(page);
  const title = page.getByLabel("Nom du projet", { exact: true });
  await title.focus();
  await title.fill("azqsdg");
  for (const key of ["a", "g", "z", "q", "s", "d", "ArrowRight"])
    await title.press(key);
  expect(await scene(page)).toEqual(before);
  expect(await pixels(page)).toEqual(image);
  await page.getByRole("combobox", { name: "Vue de la caméra" }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("listbox")).toBeVisible();
  for (const key of ["a", "g", "z", "q", "s", "d"])
    await page.keyboard.press(key);
  await count(page, 1);
  expect(await pixels(page)).toEqual(image);
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", {
      name: "Afficher les raccourcis de l’atelier",
      exact: true,
    })
    .click();
  const popup = page.getByRole("dialog", {
    name: "Les raccourcis à portée de main",
    exact: true,
  });
  await expect(popup).toBeVisible();
  const protectedState = await scene(page);
  for (const key of ["a", "g", "z", "q", "s", "d", "ArrowRight"])
    await page.keyboard.press(key);
  expect(await scene(page)).toEqual(protectedState);
  expect(await pixels(page)).toEqual(image);
  await page.keyboard.press("Escape");
  await page.locator("canvas").first().focus();
  await page.keyboard.down("z");
  await page.waitForTimeout(120);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await frames(page, async () => {});
  const stopped = await pixels(page);
  await page.waitForTimeout(150);
  expect(await pixels(page)).toEqual(stopped);
  await page.keyboard.up("z");
});
