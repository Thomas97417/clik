import { test, expect, type Page } from "@playwright/test";

async function setup(page: Page, count = 5) {
  await page.goto("/editor");
  await expect(page.locator("canvas").first()).toHaveAttribute(
    "data-rendered",
    "0",
  );
  await page.evaluate(async (count) => {
    const { useEditor } = await import(
      /* @vite-ignore */ "/src/lib/clik/" + "store.ts"
    );
    const scene = {
      version: 1,
      catalog: "clik-1",
      nodes: Array.from({ length: count }, (_, i) => ({
        id: `p${i}`,
        kind: "part",
        type: "brick-1x1",
        name: `Pièce ${i + 1}`,
        color: "#4079e8",
        parentId: null,
        position: [i * 2, 0, 0],
        rotation: [0, 0, 0],
        hidden: false,
        locked: false,
      })),
    };
    useEditor.getState().load(scene, "Rangement");
  }, count);
  await page
    .getByRole("button", { name: "Replier les propriétés", exact: true })
    .click();
}
const item = (page: Page, id: string) =>
  page.locator(`.tree-row[data-node-id="${id}"]`);

test("un groupe se range avec ses enfants et s’ouvre au survol, même en panneau étroit", async ({
  page,
}, info) => {
  await setup(page);
  await page.setViewportSize({ width: 900, height: 760 });
  const id = await page.evaluate(async () => {
    const { useEditor } = await import(
      /* @vite-ignore */ "/src/lib/clik/" + "store.ts"
    );
    useEditor.setState({ selection: ["p0", "p1"] });
    useEditor.getState().group();
    const id = useEditor.getState().selection[0];
    useEditor.getState().patch(id, { name: "Assemblage" });
    return id;
  });
  const before = await state(page);
  await take(page, id);
  const first = (await item(page, "p2").boundingBox())!;
  await page.mouse.move(first.x + 85, first.y + 5);
  await expect(page.locator(".tree-row").first()).toHaveAttribute(
    "data-node-id",
    id,
  );
  await expect(item(page, "p0")).toHaveCount(0);
  expect((await state(page)).scene).toEqual(before.scene);
  await page.mouse.up();
  await expect(item(page, "p0")).toBeVisible();
  const after = await state(page);
  expect(after.past).toBe(before.past + 1);
  expect(
    after.scene.nodes
      .filter((n: { parentId: string | null }) => !n.parentId)
      .map((n: { id: string }) => n.id),
  ).toEqual([id, "p2", "p3", "p4"]);
  for (const node of before.scene.nodes)
    expect(
      after.scene.nodes.find((n: { id: string }) => n.id === node.id),
    ).toEqual(node);
  await page
    .getByRole("button", { name: "Replier Assemblage", exact: true })
    .click();
  await take(page, "p2");
  const group = (await item(page, id).boundingBox())!;
  await page.mouse.move(group.x + 85, group.y + group.height / 2);
  await expect(item(page, "p0")).toBeVisible();
  await expect(item(page, id)).toHaveAttribute("data-drop-inside", "true");
  expect(
    (await state(page)).scene.nodes.find((n: { id: string }) => n.id === "p2")
      .parentId,
  ).toBeNull();
  await page.screenshot({
    path: `/tmp/clik-tree-group-${info.project.name}.png`,
  });
  await page.mouse.up();
  expect(
    (await state(page)).scene.nodes.find((n: { id: string }) => n.id === "p2")
      .parentId,
  ).toBe(id);
  await item(page, id).getByTitle("Verrouiller", { exact: true }).click();
  const locked = await state(page);
  const child = (await item(page, "p0").boundingBox())!;
  await page.mouse.move(child.x + 85, child.y + child.height / 2);
  await page.mouse.down();
  await page.mouse.move(child.x + 85, child.y + 100, { steps: 5 });
  await expect(page.locator(".tree")).not.toHaveAttribute(
    "data-dragging",
    "true",
  );
  await page.mouse.up();
  expect((await state(page)).scene).toEqual(locked.scene);
  expect((await state(page)).past).toBe(locked.past);
});
async function take(page: Page, id: string) {
  const box = (await item(page, id).boundingBox())!;
  await page.mouse.move(box.x + 90, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 96, box.y + box.height / 2);
  await expect(page.locator(".tree")).toHaveAttribute("data-dragging", "true");
  await expect(page.locator(".tree-drag-ghost, .tree-drop-end")).toHaveCount(0);
}
async function state(page: Page) {
  return page.evaluate(async () => {
    const { useEditor } = await import(
      /* @vite-ignore */ "/src/lib/clik/" + "store.ts"
    );
    const s = useEditor.getState();
    return { scene: s.scene, past: s.past.length, selection: s.selection };
  });
}

test("ordre visible pendant la prise, dépôt tout en bas, un seul annuler", async ({
  page,
}, info) => {
  await setup(page);
  const before = await state(page);
  await take(page, "p0");
  const end = (await page.locator(".tree").boundingBox())!;
  await page.mouse.move(end.x + 70, end.y + end.height - 3, { steps: 10 });
  await expect(page.locator(".tree-row .tree-name")).toHaveText([
    "Pièce 2",
    "Pièce 3",
    "Pièce 4",
    "Pièce 5",
    "Pièce 1",
  ]);
  expect((await state(page)).scene).toEqual(before.scene);
  expect((await state(page)).past).toBe(0);
  await page.screenshot({
    path: `/tmp/clik-tree-order-${info.project.name}.png`,
  });
  await page.mouse.up();
  expect(
    (await state(page)).scene.nodes.map((n: { id: string }) => n.id),
  ).toEqual(["p1", "p2", "p3", "p4", "p0"]);
  expect((await state(page)).past).toBe(1);
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  expect((await state(page)).scene).toEqual(before.scene);
  await page.getByRole("button", { name: "Rétablir", exact: true }).click();
  await expect(page.locator(".tree-row").last()).toHaveAttribute(
    "data-node-id",
    "p0",
  );
});

test("défilement automatique jusqu’au dernier élément en maintenant le pointeur", async ({
  page,
}) => {
  await setup(page, 35);
  await take(page, "p0");
  const tree = (await page.locator(".tree").boundingBox())!;
  await page.mouse.move(tree.x + 100, tree.y + tree.height - 5, { steps: 10 });
  await expect
    .poll(() => page.locator(".tree").evaluate((el) => el.scrollTop), {
      timeout: 12000,
    })
    .toBeGreaterThan(700);
  await expect(item(page, "p34")).toBeInViewport({
    timeout: 12000,
  });
  const end = (await page.locator(".tree").boundingBox())!;
  await page.mouse.move(end.x + 100, end.y + end.height - 3);
  await expect(page.locator(".tree-row").last()).toHaveAttribute(
    "data-node-id",
    "p0",
  );
  await page.mouse.up();
  expect((await state(page)).scene.nodes.at(-1).id).toBe("p0");
});

test("insère avant ou après une ligne en montrant l’ordre exact avant le dépôt", async ({
  page,
}) => {
  await setup(page);
  await take(page, "p4");
  let destination = (await item(page, "p1").boundingBox())!;
  await page.mouse.move(destination.x + 90, destination.y + 5);
  await expect(page.locator(".tree-row")).toHaveCount(5);
  await expect(page.locator(".tree-row").nth(1)).toHaveAttribute(
    "data-node-id",
    "p4",
  );
  await page.mouse.up();
  expect(
    (await state(page)).scene.nodes.map((n: { id: string }) => n.id),
  ).toEqual(["p0", "p4", "p1", "p2", "p3"]);
  await take(page, "p0");
  destination = (await item(page, "p2").boundingBox())!;
  await page.mouse.move(
    destination.x + 90,
    destination.y + destination.height - 5,
  );
  await expect(page.locator(".tree-row").nth(3)).toHaveAttribute(
    "data-node-id",
    "p0",
  );
  await page.mouse.up();
  expect(
    (await state(page)).scene.nodes.map((n: { id: string }) => n.id),
  ).toEqual(["p4", "p1", "p2", "p0", "p3"]);
});

test("Échap et une sortie de la liste annulent l’aperçu sans toucher à la scène", async ({
  page,
}) => {
  await setup(page);
  const before = await state(page);
  for (const cancel of ["Escape", "outside", "blur"]) {
    await take(page, "p0");
    const end = (await page.locator(".tree").boundingBox())!;
    await page.mouse.move(end.x + 70, end.y + end.height - 3, { steps: 8 });
    await expect(page.locator(".tree-row").last()).toHaveAttribute(
      "data-node-id",
      "p0",
    );
    if (cancel === "Escape") await page.keyboard.press("Escape");
    else if (cancel === "outside")
      await page.mouse.move(600, 400, { steps: 3 });
    else await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await page.mouse.up();
    await expect(page.locator(".tree")).not.toHaveAttribute(
      "data-dragging",
      "true",
    );
    expect((await state(page)).scene).toEqual(before.scene);
    expect((await state(page)).past).toBe(0);
  }
});
