import { selectCameraView } from "./camera-view";
import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { waitForSceneUpdate } from "./wait-for-scene";

test("500 pièces et 100 groupes imbriqués : aperçus à 30 images par seconde", async ({
  page,
}, info) => {
  await page.goto("/editor?draft=hierarchy-performance");
  await expect(
    page.getByLabel("Projet et sauvegarde").getByRole("status"),
  ).toContainText("Enregistré");
  await page.evaluate(async () => {
    const path = "/e2e/performance-scene.ts";
    const { loadHierarchyBenchmark } = await import(/* @vite-ignore */ path);
    loadHierarchyBenchmark();
  });
  const canvas = page.locator(".viewport canvas");
  await expect(canvas).toHaveAttribute("data-rendered", "600");
  await waitForSceneUpdate(page);
  const result = await page.evaluate(async () => {
    const path = "/e2e/performance-scene.ts";
    const { measureHierarchyPreviews } = await import(/* @vite-ignore */ path);
    return measureHierarchyPreviews();
  });
  await writeFile(
    `/tmp/clik-hierarchy-performance-${info.project.name}.json`,
    JSON.stringify(result, null, 2),
  );
  expect(result.fps).toBeGreaterThanOrEqual(30);
  await expect(canvas).toHaveAttribute("data-rendered", "600");
});

test("500 pièces : déplacement avec aperçu à 30 images par seconde", async ({
  page,
}, info) => {
  await page.goto("/editor");
  await expect(
    page.getByLabel("Projet et sauvegarde").getByRole("status"),
  ).toContainText("Enregistré");
  await page.evaluate(async () => {
    const request = indexedDB.open("clik", 1);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const colors = ["#f8cc36", "#4079e8", "#ef4444", "#41a66b", "#ef85b0"];
    const nodes = Array.from({ length: 500 }, (_, i) => ({
      id: `stress-${i}`,
      kind: "part",
      type: "brick-2x4",
      name: `Brique ${i}`,
      color: colors[i % 5],
      parentId: null,
      position: [
        (i % 20) * 4.1,
        Math.floor(i / 200) * 1.2,
        Math.floor((i % 200) / 20) * 2.1,
      ],
      rotation: [0, 0, 0],
      hidden: false,
      locked: false,
    }));
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("drafts", "readwrite");
      tx.objectStore("drafts").put(
        {
          scene: { version: 1, catalog: "clik-1", nodes },
          title: "Test 500 pièces",
          revision: 0,
          stamp: crypto.randomUUID(),
          dirty: false,
        },
        "guest",
      );
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await expect(page.locator("canvas").first()).toHaveAttribute(
    "data-rendered",
    "500",
  );
  await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
  await page.locator(".tree-name").nth(250).click();
  await selectCameraView(page, "top");
  await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
  await expect(page.locator(".tree-row.selected")).toHaveCount(1);
  const canvas = page.locator("canvas").first(),
    box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2);
  await expect(canvas).toHaveAttribute("data-dragging", "true");
  await expect(canvas).toHaveAttribute("data-snap-kind", /grid|attachment/);
  const start = await page.evaluate(() => {
    const canvas = document.querySelector("canvas")!;
    return { time: performance.now(), frames: Number(canvas.dataset.frames) };
  });
  // Count only active movement; an idle demand-rendered canvas should stop.
  let result = { frames: 0, durationMs: 0 };
  for (let i = 0; result.durationMs < 3000; i++) {
    await page.mouse.move(
      box.x + box.width / 2 + (i % 2 ? 30 : 160),
      box.y + box.height / 2 + (i % 2 ? 10 : 60),
      { steps: 30 },
    );
    result = await page.evaluate(
      (start) => ({
        frames:
          Number(document.querySelector("canvas")!.dataset.frames) -
          start.frames,
        durationMs: performance.now() - start.time,
      }),
      start,
    );
  }
  await expect(canvas).toHaveAttribute("data-dragging", "true");
  await page.mouse.up();
  const fps = result.frames / (result.durationMs / 1000);
  const gpu = await page.evaluate(() => {
    const gl = document.querySelector("canvas")!.getContext("webgl2")!;
    const extension = gl.getExtension("WEBGL_debug_renderer_info");
    return extension
      ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)
      : "Non exposé";
  });
  await page.screenshot({ path: `/tmp/clik-500-${info.project.name}.png` });
  await writeFile(
    `/tmp/clik-performance-${info.project.name}.json`,
    JSON.stringify(
      {
        browser: info.project.name,
        pieces: 500,
        viewport: page.viewportSize(),
        fps,
        gpu,
        ...result,
      },
      null,
      2,
    ),
  );
  // A three-second sample has a one-frame boundary uncertainty.
  expect(Math.round(fps)).toBeGreaterThanOrEqual(30);
});
