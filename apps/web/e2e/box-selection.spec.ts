import { expect, test, type Page } from "@playwright/test";
import { emptyScene, group, makePart } from "@clik/scene";
import { selectCameraView } from "./camera-view";

async function setup(page: Page, grouped = false) {
  const front = {
    ...makePart("brick-2x2", "#4079e8", [-4, 0, 0]),
    name: "Devant",
  };
  const back = {
    ...makePart("brick-1x1", "#ef4444", [-4, 0, -4]),
    name: "Derrière",
  };
  const right = {
    ...makePart("brick-2x2", "#e6b84a", [4, 0, 0]),
    name: "À droite",
  };
  const hidden = {
    ...makePart("brick-1x1", "#ef4444", [-4, 0, -2]),
    name: "Masquée",
  };
  let scene = group(
    { ...emptyScene(), nodes: [front, back, right, hidden] },
    [hidden.id],
    "hidden-group",
  );
  scene.nodes.find((node) => node.id === "hidden-group")!.hidden = true;
  if (grouped) {
    scene = group(scene, [front.id, back.id], "visible-group");
    scene.nodes.find((node) => node.id === "visible-group")!.name =
      "Assemblage";
  }
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
            title: "Sélection par cadre",
            revision: 0,
            stamp: crypto.randomUUID(),
            dirty: false,
          },
          "guest:box-selection",
        );
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }, scene);
  await page.goto("/editor?draft=box-selection");
  const canvas = page.locator("canvas").first();
  await expect(canvas).toHaveAttribute(
    "data-rendered",
    String(scene.nodes.length),
  );
  await selectCameraView(page, "front");
  const box = (await canvas.boundingBox())!;
  const row = (id: string) => page.locator(`[data-node-id="${id}"]`);
  return { canvas, box, row, front, back, right, hidden };
}

test("le cadre sélectionne à travers la profondeur, prévisualise sans déplacer et permet ensuite de grouper", async ({
  page,
}, info) => {
  const { box, row, front, back, right, hidden } = await setup(page);
  const tool = page.getByRole("button", {
    name: "Sélection par cadre",
    exact: true,
  });
  await tool.click();
  await expect(tool).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByText("Glissez pour encadrer les pièces."),
  ).toBeVisible();
  await page.mouse.move(box.x + 10, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 5, box.y + box.height - 100, {
    steps: 12,
  });
  await expect(page.locator(".selection-box")).toHaveAttribute(
    "data-count",
    "2",
  );
  // The inspector only commits the new selection when the pointer is released.
  await expect(page.locator(".tree-row.selected")).toHaveCount(0);
  await page.keyboard.press("ArrowRight");
  await page.screenshot({
    path: `/tmp/clik-box-selection-${info.project.name}.png`,
  });
  await page.mouse.up();
  await expect(page.locator(".selection-box")).toHaveCount(0);
  await expect(row(front.id)).toHaveClass(/(^|\s)selected(\s|$)/);
  await expect(row(back.id)).toHaveClass(/(^|\s)selected(\s|$)/);
  await expect(row(right.id)).not.toHaveClass(/(^|\s)selected(\s|$)/);
  await expect(row(hidden.id)).not.toHaveClass(/(^|\s)selected(\s|$)/);
  await expect(tool).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Grouper", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Dissocier", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".tree-row.selected")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  await expect(row(front.id)).toBeVisible();
  await expect(page.locator(".tree-row")).toHaveCount(5);
});

test("Maj ajoute au cadre, le sens de tracé est libre et les annulations restaurent l’interaction", async ({
  page,
}) => {
  const { canvas, box, row, front, back, right } = await setup(page);
  await row(right.id).locator(".tree-name").click();
  for (const action of ["escape", "pointercancel", "blur"]) {
    await page.keyboard.down("Shift");
    await page.mouse.move(box.x + box.width / 2 - 5, box.y + box.height - 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 10, box.y + 100, { steps: 8 });
    await expect(page.locator(".selection-box")).toHaveAttribute(
      "data-count",
      "3",
    );
    if (action === "escape") await page.keyboard.press("Escape");
    if (action === "pointercancel") await canvas.dispatchEvent("pointercancel");
    if (action === "blur")
      await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await page.mouse.up();
    await page.keyboard.up("Shift");
    await expect(page.locator(".selection-box")).toHaveCount(0);
    await expect(page.locator(".tree-row.selected")).toHaveCount(1);
    await expect(row(right.id)).toHaveClass(/(^|\s)selected(\s|$)/);
  }
  await page.keyboard.down("Shift");
  await page.mouse.move(box.x + box.width / 2 - 5, box.y + box.height - 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 10, box.y + 100, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up("Shift");
  await expect(page.locator(".tree-row.selected")).toHaveCount(3);
  await expect(row(front.id)).toHaveClass(/(^|\s)selected(\s|$)/);
  await expect(row(back.id)).toHaveClass(/(^|\s)selected(\s|$)/);
  // Box selection did not add an undo step; moving the result adds exactly one.
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true }),
  ).toBeEnabled();
  await page.keyboard.press("Control+z");
  await expect(
    page.getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true }),
  ).toBeDisabled();
  await row(right.id).locator(".tree-name").click();
  await expect(page.getByLabel("position X", { exact: true })).toHaveValue("4");
  await page.keyboard.down("Shift");
  await row(front.id).locator(".tree-name").click();
  await page.keyboard.up("Shift");
  await expect(page.locator(".tree-row.selected")).toHaveCount(2);
});

test("le groupe est sélectionné dès que toutes ses pièces le sont, par clics ou par cadre", async ({
  page,
}) => {
  const { canvas, box, row, front, back, right } = await setup(page, true);
  const assembly = row("visible-group");
  const shiftClick = async (id: string) =>
    row(id)
      .locator(".tree-name")
      .click({ modifiers: ["Shift"] });
  const selected = /(^|\s)selected(\s|$)/;
  await row(front.id).locator(".tree-name").click();
  await expect(row(front.id)).toHaveClass(selected);
  await expect(assembly).not.toHaveClass(selected);
  await shiftClick(back.id);
  await expect(assembly).toHaveClass(selected);
  await expect(page.locator(".tree-row.selected")).toHaveCount(1);
  await expect(page.getByLabel("Nom", { exact: true })).toHaveValue(
    "Assemblage",
  );
  await expect(
    page.getByRole("button", { name: "Dissocier", exact: true }),
  ).toBeEnabled();

  // Removing a child leaves the other piece selected, and adding it restores
  // the group rather than introducing a second copy of its descendants.
  await shiftClick(front.id);
  await expect(assembly).not.toHaveClass(selected);
  await expect(row(back.id)).toHaveClass(selected);
  await expect(page.locator(".tree-row.selected")).toHaveCount(1);
  await shiftClick(front.id);
  await expect(assembly).toHaveClass(selected);
  await shiftClick(right.id);
  await expect(page.locator(".tree-row.selected")).toHaveCount(2);
  await shiftClick("visible-group");
  await expect(page.locator(".tree-row.selected")).toHaveCount(1);
  await expect(row(right.id)).toHaveClass(selected);

  await page
    .getByRole("button", { name: "Sélection par cadre", exact: true })
    .click();
  await page.mouse.move(box.x + 10, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 5, box.y + box.height - 100, {
    steps: 12,
  });
  await expect(page.locator(".selection-box")).toHaveAttribute(
    "data-count",
    "2",
  );
  await page.mouse.up();
  await expect(assembly).toHaveClass(selected);
  await expect(row(right.id)).not.toHaveClass(selected);
  await expect(page.locator(".tree-row.selected")).toHaveCount(1);

  const frames = Number(await canvas.getAttribute("data-frames"));
  await page
    .getByRole("button", { name: "Cadrer la sélection (F)", exact: true })
    .click();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-frames")))
    .toBeGreaterThan(frames + 2);
  await canvas.click({
    position: { x: box.width / 2, y: box.height / 2 },
    modifiers: ["Shift"],
  });
  await expect(assembly).not.toHaveClass(selected);
  await expect(row(back.id)).toHaveClass(selected);
  await canvas.click({
    position: { x: box.width / 2, y: box.height / 2 },
    modifiers: ["Shift"],
  });
  await expect(assembly).toHaveClass(selected);
  await expect(page.locator(".tree-row.selected")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true }),
  ).toBeDisabled();
});
