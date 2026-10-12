import { expect, test, type Page } from "@playwright/test";
import { projectsFixture } from "./fixtures/projects";
import { selectCameraView } from "./camera-view";

test.beforeEach(async ({ page }) => {
  await projectsFixture(page);
});

async function openEditor(page: Page) {
  await page.goto("/editor");
  await expect(page.getByLabel("Nom du projet")).toBeEnabled({
    timeout: 30000,
  });
}
async function customColor(page: Page, color: string) {
  const trigger = page.getByRole("button", {
    name: "Personnaliser la couleur",
    exact: true,
  });
  if (!(await page.locator(".editor-color-picker").isVisible()))
    await trigger.click();
  const input = page.getByRole("textbox", {
    name: "Code hexadécimal",
    exact: true,
  });
  await input.fill(color);
  await input.press("Enter");
  await expect(input).toHaveValue(color.slice(1).toUpperCase());
}

test("couleurs : presets, teinte personnalisée, sélection et sauvegarde locale", async ({
  page,
}) => {
  await openEditor(page);
  await page.getByRole("button", { name: "Marron", exact: true }).click();
  await page.getByRole("button", { name: "Brique 2 × 4", exact: true }).click();
  const first = page.locator(".tree-row").filter({ hasText: "Brique 2 × 4" });
  await expect(first.locator(".part-dot")).toHaveCSS(
    "background-color",
    "rgb(139, 94, 60)",
  );
  await page.getByRole("button", { name: "Brique 1 × 1", exact: true }).click();
  await page.getByRole("button", { name: "Crème", exact: true }).click();
  const second = page.locator(".tree-row").filter({ hasText: "Brique 1 × 1" });
  await expect(second.locator(".part-dot")).toHaveCSS(
    "background-color",
    "rgb(242, 232, 213)",
  );
  await customColor(page, "#a16b45");
  await page
    .getByRole("button", { name: "Fermer le sélecteur de couleur" })
    .click();
  await expect(second.locator(".part-dot")).toHaveCSS(
    "background-color",
    "rgb(161, 107, 69)",
  );
  await page
    .getByRole("button", { name: "Tout sélectionner", exact: true })
    .click();
  await expect(page.locator(".palette-current")).toHaveText(
    "Plusieurs couleurs",
  );
  await first.locator(".tree-name").click();
  await expect(
    page.getByRole("button", { name: "Marron", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".palette-current")).toHaveText("Marron");
  await second.locator(".tree-name").click();
  await expect(page.locator(".palette-current")).toHaveText("#A16B45");
  await page
    .getByRole("button", { name: "Personnaliser la couleur", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Code hexadécimal", exact: true }),
  ).toHaveValue("A16B45");
  await page
    .getByRole("button", { name: "Fermer le sélecteur de couleur" })
    .click();
  await first.locator(".tree-name").click();
  await selectCameraView(page, "top");
  const canvas = page.locator("canvas").first();
  const frame = Number(await canvas.getAttribute("data-frames"));
  await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
  await expect(canvas).toHaveAttribute("data-rendered", "2");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-frames")))
    .toBeGreaterThan(frame);
  await second.locator(".tree-name").click();
  const canvasBox = (await canvas.boundingBox())!;
  await canvas.click({
    position: { x: canvasBox.width / 2, y: canvasBox.height / 2 },
  });
  await expect(page.locator(".palette-current")).toHaveText("Marron");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<string[]>((resolve, reject) => {
            const open = indexedDB.open("clik", 1);
            open.onerror = () => reject(open.error);
            open.onsuccess = () => {
              const db = open.result;
              const request = db
                .transaction("drafts")
                .objectStore("drafts")
                .get("guest");
              request.onerror = () => {
                db.close();
                reject(request.error);
              };
              request.onsuccess = () => {
                db.close();
                resolve(
                  request.result?.scene.nodes
                    .filter((node: any) => node.kind === "part")
                    .map((node: any) => node.color) ?? [],
                );
              };
            };
          }),
      ),
    )
    .toEqual(["#8b5e3c", "#a16b45"]);
  await page.reload();
  await expect(second.locator(".part-dot")).toHaveCSS(
    "background-color",
    "rgb(161, 107, 69)",
  );
  await second.locator(".tree-name").click();
  await expect(page.locator(".palette-current")).toHaveText("#A16B45");
});

test("couleurs : un glissement donne une seule annulation et les touches ne déplacent pas la pièce", async ({
  page,
}) => {
  await openEditor(page);
  await page.getByRole("button", { name: "Brique 2 × 4", exact: true }).click();
  await customColor(page, "#a16b45");
  const area = page.getByRole("slider", {
    name: "Saturation et luminosité",
    exact: true,
  });
  const box = (await area.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5, {
    steps: 12,
  });
  await page.mouse.up();
  const input = page.getByRole("textbox", {
    name: "Code hexadécimal",
    exact: true,
  });
  const dragged = await input.inputValue();
  expect(dragged).not.toBe("A16B45");
  await page
    .getByRole("button", { name: "Fermer le sélecteur de couleur" })
    .click();
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  await expect(page.locator(".tree-row .part-dot")).toHaveCSS(
    "background-color",
    "rgb(161, 107, 69)",
  );
  await page.getByRole("button", { name: "Rétablir", exact: true }).click();
  await expect(page.locator(".palette-current")).toHaveText(`#${dragged}`);
  await page.locator(".tree-name").click();
  const positions = () =>
    Promise.all(
      ["X", "Y", "Z"].map((axis) =>
        page.getByLabel(`position ${axis}`, { exact: true }).inputValue(),
      ),
    );
  const before = await positions();
  await page
    .getByRole("button", { name: "Personnaliser la couleur", exact: true })
    .click();
  await page.getByRole("button", { name: "Format, HEX", exact: true }).click();
  await page.getByRole("menuitemradio", { name: /^RGB\b/ }).click();
  for (const [name, value] of [
    ["Rouge", "35"],
    ["Vert", "67"],
    ["Bleu", "121"],
  ]) {
    const channel = page.getByRole("spinbutton", { name, exact: true });
    await channel.fill(value);
    await channel.press("Enter");
  }
  const hue = page.getByRole("slider", { name: "Teinte", exact: true });
  await hue.focus();
  await hue.press("ArrowRight");
  await page
    .getByRole("button", { name: "Fermer le sélecteur de couleur" })
    .click();
  expect(await positions()).toEqual(before);
});

test("couleurs : pastilles carrées pendant le redimensionnement et réglage sans changement final", async ({
  page,
}, info) => {
  await openEditor(page);
  await page.getByRole("button", { name: "Brique 2 × 4", exact: true }).click();
  await customColor(page, "#ff0000");
  const initialWidth = (await page
    .locator(".editor-color-picker")
    .boundingBox())!.width;
  const area = page.getByRole("slider", {
    name: "Saturation et luminosité",
    exact: true,
  });
  const box = (await area.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width, box.y, { steps: 12 });
  await page.mouse.up();
  await expect(
    page.getByRole("textbox", { name: "Code hexadécimal", exact: true }),
  ).toHaveValue("FF0000");
  await page
    .getByRole("button", { name: "Fermer le sélecteur de couleur" })
    .click();
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  await expect(page.locator(".tree-row .part-dot")).toHaveCSS(
    "background-color",
    "rgb(64, 121, 232)",
  );
  await page
    .getByRole("separator", {
      name: "Redimensionner la bibliothèque",
      exact: true,
    })
    .press("End");
  const swatches = await page
    .locator(".palette-swatch")
    .evaluateAll((elements) =>
      elements.map((el) => ({
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height,
      })),
    );
  expect(swatches).toHaveLength(13);
  for (const swatch of swatches)
    expect(Math.abs(swatch.width - swatch.height)).toBeLessThan(1);
  await page
    .getByRole("button", { name: "Personnaliser la couleur", exact: true })
    .click();
  expect(
    (await page.locator(".editor-color-picker").boundingBox())!.width,
  ).toBe(initialWidth);
  await expect(page.locator(".editor-color-picker")).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `/private/tmp/clik-editor-colors-${info.project.name}.png`,
  });
});
