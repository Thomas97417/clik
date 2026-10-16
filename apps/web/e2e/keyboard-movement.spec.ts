import { test, expect } from "@playwright/test";
import { selectCameraView } from "./camera-view";
import { emptyScene, makePart } from "@clik/scene";

test("flèches : grille, hauteur, répétition et annuler/rétablir", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.locator('.piece-card[aria-label="Brique 2 × 2"]').click();
  const position = (axis: string) =>
    page.getByLabel(`position ${axis}`, { exact: true });
  await page.keyboard.press("ArrowRight");
  await expect(position("X")).toHaveValue("1");
  await page.keyboard.press("ArrowLeft");
  await expect(position("X")).toHaveValue("0");
  await page.keyboard.press("ArrowUp");
  await expect(position("Z")).toHaveValue("-1");
  await page.keyboard.press("ArrowDown");
  await expect(position("Z")).toHaveValue("0");
  await page.keyboard.press("Shift+ArrowDown");
  await expect(position("Y")).toHaveValue("0");
  await page.keyboard.press("Shift+ArrowUp");
  await expect(position("Y")).toHaveValue("1.2");
  await page.keyboard.press("Shift+ArrowDown");
  await expect(position("Y")).toHaveValue("0");
  await page.keyboard.press("Shift+ArrowUp");
  await page.keyboard.press("Control+z");
  await page.locator(".tree-name").click();
  await expect(position("Y")).toHaveValue("0");
  await page.keyboard.press("Control+Shift+z");
  await page.locator(".tree-name").click();
  await expect(position("Y")).toHaveValue("1.2");
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("ArrowRight");
  await page.keyboard.up("ArrowRight");
  await expect(position("X")).toHaveValue("2");
});

test("les champs, les contrôles et les modificateurs gardent leurs flèches", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.locator('.piece-card[aria-label="Brique 2 × 2"]').click();
  const position = (axis: string) =>
    page.getByLabel(`position ${axis}`, { exact: true });
  await page.getByLabel("Nom du projet").focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Shift+ArrowUp");
  await expect(position("X")).toHaveValue("0");
  await expect(position("Y")).toHaveValue("0");
  await page.getByLabel("Vue de la caméra").focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(position("Z")).toHaveValue("0");
  await page.keyboard.press("Escape");
  await page.locator(".tree-name").click();
  await page.keyboard.press("Control+ArrowRight");
  await page.keyboard.press("Alt+ArrowUp");
  await page.keyboard.press("Shift+ArrowRight");
  await expect(position("X")).toHaveValue("0");
  await expect(position("Y")).toHaveValue("0");
  await expect(position("Z")).toHaveValue("0");
});

test("les flèches suivent la vue choisie et une rotation libre de 180°", async ({
  page,
}) => {
  await page.goto("/editor");
  const canvas = page.locator("canvas").first();
  await expect(canvas).toHaveAttribute("data-rendered", "0");
  await page.getByRole("button", { name: "Brique 2 × 2", exact: true }).click();
  const position = (axis: string) =>
    page.getByLabel(`position ${axis}`, { exact: true });
  for (const view of ["right", "top"]) {
    await selectCameraView(page, view);
    await page.locator(".tree-name").click();
    await page.keyboard.press("ArrowRight");
    await expect(position("Z")).toHaveValue("-1");
    await expect(position("X")).toHaveValue("0");
    await page.keyboard.press("ArrowUp");
    await expect(position("X")).toHaveValue("-1");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowLeft");
    await expect(position("X")).toHaveValue("0");
    await expect(position("Z")).toHaveValue("0");
  }

  await selectCameraView(page, "front");
  const box = (await canvas.boundingBox())!;
  // OrbitControls turns by 2π for a drag spanning the canvas height.
  const startX = box.x + 60;
  const y = box.y + box.height * 0.2;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX + box.height / 2, y, { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(800); // Let the orbit's residual damping finish.
  await page.locator(".tree-name").click();
  await page.keyboard.press("ArrowRight");
  await expect(position("X")).toHaveValue("-1");
  await expect(position("Z")).toHaveValue("0");
  await page.keyboard.press("ArrowUp");
  await expect(position("Z")).toHaveValue("1");
  await page.keyboard.press("Shift+ArrowUp");
  await expect(position("Y")).toHaveValue("1.2");
  await page.keyboard.press("Control+z");
  await page.locator(".tree-name").click();
  await expect(position("Y")).toHaveValue("0");
  await expect(position("X")).toHaveValue("-1");
  await expect(position("Z")).toHaveValue("1");

  // Resetting the view must immediately restore its corresponding directions.
  await selectCameraView(page, "perspective");
  await page.locator(".tree-name").click();
  await page.keyboard.press("ArrowRight");
  await expect(position("X")).toHaveValue("0");
  await page.keyboard.press("ArrowUp");
  await expect(position("Z")).toHaveValue("0");
});

test("Maj-flèches atteint le plafond, le support et le sol quand il reste moins d’un pas", async ({
  page,
}) => {
  const mobile = {
    ...makePart("brick-1x1", "#4079e8", [0.5, 0.8, 0.5]),
    name: "Mobile",
  };
  const free = {
    ...makePart("brick-1x1", "#41a66b", [4.5, 0.35, 0.5]),
    name: "Libre",
  };
  const scene = {
    ...emptyScene(),
    nodes: [
      mobile,
      makePart("plate-1x1", "#ef4444", [0.5, 0, 0.5]),
      makePart("plate-1x1", "#ef4444", [0.5, 2.4, 0.5]),
      free,
    ],
  };
  await page.goto("/terms");
  await page.evaluate(async (scene) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("clik", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("drafts");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("drafts", "readwrite");
        tx.objectStore("drafts").put(
          {
            scene,
            title: "Hauteur disponible",
            revision: 0,
            stamp: crypto.randomUUID(),
            dirty: false,
          },
          "guest:vertical-movement",
        );
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }, scene);
  await page.goto("/editor?draft=vertical-movement");
  await expect(page.locator("canvas").first()).toHaveAttribute(
    "data-rendered",
    "4",
  );
  const select = async (id: string) =>
    page.locator(`[data-node-id="${id}"] .tree-name`).click();
  const y = page.getByLabel("position Y", { exact: true });
  const serial = () =>
    page.evaluate(async () => {
      const path = "/src/lib/clik/store.ts";
      const { useEditor } = await import(/* @vite-ignore */ path);
      return useEditor.getState().serial;
    });
  await select(mobile.id);
  await page.keyboard.press("Shift+ArrowUp");
  await expect(y).toHaveValue("1.2");
  expect(await serial()).toBe(1);
  await page.keyboard.press("Shift+ArrowUp");
  await expect(y).toHaveValue("1.2");
  expect(await serial()).toBe(1);
  await page.keyboard.press("Shift+ArrowDown");
  await expect(y).toHaveValue("0.4");
  expect(await serial()).toBe(2);
  await page.keyboard.press("Shift+ArrowDown");
  await expect(y).toHaveValue("0.4");
  expect(await serial()).toBe(2);
  await page.keyboard.press("Control+z");
  await select(mobile.id);
  await expect(y).toHaveValue("1.2");
  await page.keyboard.press("Control+Shift+z");
  await select(mobile.id);
  await expect(y).toHaveValue("0.4");
  await select(free.id);
  await page.keyboard.press("Shift+ArrowDown");
  await expect(y).toHaveValue("0");
  await expect(page.locator(".overlap")).toHaveCount(0);
});
