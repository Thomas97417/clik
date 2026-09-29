import { test, expect, type Page } from "@playwright/test";

const row = (page: Page, name: string) =>
  page
    .locator(".tree-row")
    .filter({ has: page.getByRole("button", { name, exact: true }) });
async function rename(page: Page, name: string) {
  await page.getByLabel("Nom", { exact: true }).fill(name);
  await page.getByLabel("Nom", { exact: true }).press("Tab");
}
async function setup(page: Page) {
  await page.goto("/editor");
  await page.locator('.piece-card[aria-label="Brique 2 × 2"]').click();
  await page.locator('.piece-card[aria-label="Brique 1 × 1"]').click();
  await page
    .locator(".tree-name")
    .first()
    .click({ modifiers: ["Shift"] });
  await page.getByRole("button", { name: "Grouper", exact: true }).click();
  await rename(page, "Châssis");
  await page.getByRole("button", { name: "Grouper", exact: true }).click();
  await rename(page, "Assemblage");
  await page.locator('.piece-card[aria-label="Pente 2 × 2"]').click();
  await expect(page.locator("canvas").first()).toHaveAttribute(
    "data-rendered",
    "5",
  );
}

test("repli des groupes imbriqués, sélection conservée et aucun historique", async ({
  page,
}, info) => {
  await setup(page);
  await expect(row(page, "Assemblage").locator(".tree-count")).toHaveText("2");
  await expect(row(page, "Châssis").locator(".tree-count")).toHaveText("2");
  await row(page, "Brique 2 × 2").locator(".tree-name").click();
  await page
    .getByRole("button", { name: "Replier Châssis", exact: true })
    .click();
  await expect(page.locator(".tree-name")).toHaveCount(3);
  await expect(row(page, "Châssis")).toHaveClass(/contains-selection/);
  await expect(page.getByLabel("Nom", { exact: true })).toHaveValue(
    "Brique 2 × 2",
  );
  await rename(page, "Pièce sélectionnée");
  await expect(
    page.getByRole("button", { name: "Déplier Châssis", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await page
    .getByRole("button", { name: "Replier Assemblage", exact: true })
    .click();
  await expect(page.locator(".tree-name")).toHaveCount(2);
  await expect(page.locator("canvas").first()).toHaveAttribute(
    "data-rendered",
    "5",
  );
  await page.setViewportSize({ width: 1100, height: 900 });
  await expect
    .poll(() =>
      page
        .locator(".tree-actions")
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: `/tmp/clik-collapsed-tree-${info.project.name}.png`,
  });
  await page
    .getByRole("button", { name: "Déplier Assemblage", exact: true })
    .press("Enter");
  await expect(
    page.getByRole("button", { name: "Déplier Châssis", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  // Undo applies to the rename, never to folding or unfolding.
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Déplier Châssis", exact: true })
    .press("Space");
  await expect(row(page, "Brique 2 × 2")).toHaveCount(1);
  await expect(page.locator(".tree-row.selected")).toHaveCount(0);
  await page.getByRole("button", { name: "Tout replier", exact: true }).click();
  await expect(page.locator(".tree-name")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Tout replier", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Tout déplier", exact: true }).click();
  await expect(page.locator(".tree-name")).toHaveCount(5);
  await expect(
    page.getByRole("button", { name: "Tout déplier", exact: true }),
  ).toBeDisabled();
});

test("tout sélectionner inclut les groupes repliés sans doubler leurs pièces", async ({
  page,
}, info) => {
  await setup(page);
  await page.getByRole("button", { name: "Tout replier", exact: true }).click();
  await page
    .getByRole("button", { name: "Tout sélectionner", exact: true })
    .click();
  await expect(page.locator(".tree-row.selected .tree-name")).toHaveText([
    "Assemblage",
    "Pente 2 × 2",
  ]);
  await expect(
    page.getByRole("button", { name: "Déplier Assemblage", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await page.setViewportSize({ width: 900, height: 760 });
  await expect(
    page.getByRole("button", { name: "Tout sélectionner", exact: true }),
  ).toBeInViewport();
  await page.screenshot({
    path: `/tmp/clik-select-all-${info.project.name}.png`,
  });
  await page.getByRole("button", { name: "Dupliquer", exact: true }).click();
  await expect(page.locator(".viewport-bottom")).toContainText("6 / 500");
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  await expect(page.locator(".viewport-bottom")).toContainText("3 / 500");
  await page
    .getByRole("button", { name: "Tout sélectionner", exact: true })
    .click();
  await page.getByRole("button", { name: "Tout déplier", exact: true }).click();
  await expect(page.locator(".tree-row.selected .tree-name")).toHaveText([
    "Assemblage",
    "Pente 2 × 2",
  ]);
  await page.getByRole("button", { name: "Supprimer", exact: true }).click();
  await expect(page.locator(".viewport-bottom")).toContainText("0 / 500");
  await expect(
    page.getByRole("button", { name: "Tout sélectionner", exact: true }),
  ).toBeDisabled();
});

test("sélection dans la scène : ouverture des groupes parents", async ({
  page,
}) => {
  await setup(page);
  await row(page, "Brique 2 × 2").locator(".tree-name").click();
  await page.getByLabel("Vue de la caméra").selectOption("top");
  await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
  await page.getByRole("button", { name: "Tout replier", exact: true }).click();
  const canvas = page.locator("canvas").first(),
    box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + 25, box.y + box.height - 25);
  await expect(page.locator(".tree-row.selected")).toHaveCount(0);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator(".tree-row.selected .tree-name")).toHaveText(
    "Brique 2 × 2",
  );
  await expect(
    page.getByRole("button", { name: "Replier Assemblage", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("button", { name: "Replier Châssis", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
});

test("déposer dans un groupe replié le déplie et conserve la position", async ({
  page,
}) => {
  await setup(page);
  const before = await Promise.all(
    ["X", "Y", "Z"].map((axis) =>
      page.getByLabel(`position ${axis}`, { exact: true }).inputValue(),
    ),
  );
  await page.getByRole("button", { name: "Tout replier", exact: true }).click();
  const transfer = await page.evaluateHandle(() => new DataTransfer());
  await row(page, "Pente 2 × 2").dispatchEvent("dragstart", {
    dataTransfer: transfer,
  });
  await row(page, "Assemblage").dispatchEvent("drop", {
    dataTransfer: transfer,
  });
  await expect(
    page.getByRole("button", { name: "Replier Assemblage", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("button", { name: "Déplier Châssis", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(row(page, "Assemblage").locator(".tree-count")).toHaveText("3");
  await expect(
    page.getByRole("combobox", { name: "Groupe parent", exact: true }),
  ).not.toHaveValue("");
  const after = await Promise.all(
    ["X", "Y", "Z"].map((axis) =>
      page.getByLabel(`position ${axis}`, { exact: true }).inputValue(),
    ),
  );
  expect(after).toEqual(before);
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  await row(page, "Pente 2 × 2").locator(".tree-name").click();
  await expect(
    page.getByRole("combobox", { name: "Groupe parent", exact: true }),
  ).toHaveValue("");
  await expect(row(page, "Assemblage").locator(".tree-count")).toHaveText("2");
});

test("groupes verrouillés ou vides : repli indépendant du masquage", async ({
  page,
}) => {
  await setup(page);
  await row(page, "Assemblage")
    .getByTitle("Verrouiller", { exact: true })
    .click();
  await expect(row(page, "Brique 2 × 2")).toHaveAttribute("draggable", "false");
  await row(page, "Assemblage").getByTitle("Masquer", { exact: true }).click();
  const canvas = page.locator("canvas").first();
  const frames = Number(await canvas.getAttribute("data-frames"));
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-frames")))
    .toBeGreaterThan(frames + 2);
  const hiddenImage = await canvas.evaluate((c: HTMLCanvasElement) =>
    c.toDataURL(),
  );
  await page
    .getByRole("button", { name: "Replier Assemblage", exact: true })
    .click();
  await expect(page.locator("canvas").first()).toHaveAttribute(
    "data-rendered",
    "5",
  );
  await page
    .getByRole("button", { name: "Déplier Assemblage", exact: true })
    .click();
  await expect(page.locator("canvas").first()).toHaveAttribute(
    "data-rendered",
    "5",
  );
  await expect
    .poll(() =>
      canvas.evaluate(
        (c: HTMLCanvasElement, before) => c.toDataURL() === before,
        hiddenImage,
      ),
    )
    .toBe(true);
  await row(page, "Assemblage")
    .getByTitle("Déverrouiller", { exact: true })
    .click();
  await row(page, "Châssis").locator(".tree-name").click();
  await page
    .getByRole("combobox", { name: "Groupe parent", exact: true })
    .selectOption("");
  await expect(row(page, "Assemblage").locator(".tree-count")).toHaveText("0");
  await page
    .getByRole("button", { name: "Replier Assemblage", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Déplier Assemblage", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("canvas").first()).toHaveAttribute(
    "data-rendered",
    "5",
  );
  await expect
    .poll(() =>
      canvas.evaluate(
        (c: HTMLCanvasElement, before) => c.toDataURL() === before,
        hiddenImage,
      ),
    )
    .toBe(false);
});
