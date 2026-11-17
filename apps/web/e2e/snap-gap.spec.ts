import { waitForSceneUpdate } from "./wait-for-scene";
import { selectCameraView } from "./camera-view";
import { test, expect, type Page } from "@playwright/test";
import { dragLibrary } from "./drag-library";

async function prepare(page: Page, existing: boolean) {
  await page.goto("/editor");
  const canvas = page.locator("canvas").first();
  await expect(canvas).toHaveAttribute("data-rendered", "0");
  await page.evaluate(async (existing) => {
    const { useEditor } = await import(
      /* @vite-ignore */ "/src/lib/clik/" + "store.ts"
    );
    const part = (
      id: string,
      position: [number, number, number],
      type = "brick-2x2",
    ) => ({
      id,
      kind: "part",
      type,
      name: id,
      color: "#4079e8",
      position,
      rotation: [0, 0, 0],
      parentId: null,
      hidden: false,
      locked: false,
    });
    useEditor.getState().load(
      {
        version: 1,
        catalog: "clik-1",
        nodes: [
          part("lower", [0, 0, 0]),
          part("upper", [0, 2.4, 0]),
          ...(existing ? [part("moving", [3.5, 0, 0.5], "brick-1x1")] : []),
        ],
      },
      "Emboîtement",
    );
    useEditor.setState({ snap: true, selection: [] });
  }, existing);
  await selectCameraView(page, "front");
  await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();

  await waitForSceneUpdate(page);
  const screen = async (x: number, y: number, z: number) =>
    page.evaluate(
      async (local) => {
        const path = "/e2e/rendered-scene.ts";
        const { projectPartPoints } = await import(/* @vite-ignore */ path);
        return projectPartPoints([{ id: "lower", local }])[0] as {
          x: number;
          y: number;
        };
      },
      [x, y, z] as [number, number, number],
    );
  return { canvas, screen };
}

for (const existing of [false, true]) {
  test(`placer une brique dans un intervalle exact, pièce existante ${existing}`, async ({
    page,
  }, info) => {
    const { canvas, screen } = await prepare(page, existing);
    if (existing) {
      const start = await screen(3.5, 1.4, 0.5);
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      const end = await screen(0.5, 2.6, 0.5);
      await page.mouse.move(end.x, end.y, { steps: 12 });
      await expect(canvas).toHaveAttribute("data-dragging", "true");
    } else {
      const target = await screen(0.5, 1.4, 0.5);
      await dragLibrary(page, "Brique 1 × 1", target.x, target.y);
    }
    await expect(canvas).toHaveAttribute("data-snap-kind", "attachment");
    await page.screenshot({
      path: `/tmp/clik-gap-${existing}-${info.project.name}.png`,
    });
    await page.mouse.up();
    await expect(page.getByLabel("position Y", { exact: true })).toHaveValue(
      "1.2",
    );
    await expect(page.getByLabel("position X", { exact: true })).toHaveValue(
      "0.5",
    );
    await expect(page.getByLabel("position Z", { exact: true })).toHaveValue(
      "0.5",
    );
    await expect(page.locator(".overlap")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
      .click();
    await expect(canvas).toHaveAttribute("data-rendered", existing ? "3" : "2");
    if (existing) {
      await page.locator(".tree-name").last().click();
      await expect(page.getByLabel("position X", { exact: true })).toHaveValue(
        "3.5",
      );
    }
  });
}
