import { dragLibrary } from "./drag-library";
import { test, expect, type Page } from "@playwright/test";

async function property(page: Page, name: string, value: string) {
  await page.getByLabel(name, { exact: true }).fill(value);
  await page.getByLabel(name, { exact: true }).press("Tab");
}

test("dessous creux des briques, plaques et pentes", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/editor");
  const canvas = page.locator("canvas").first();
  for (const [i, name] of [
    "Brique 2 × 4",
    "Plaque 2 × 2",
    "Pente 2 × 2",
  ].entries()) {
    await page.getByRole("button", { name, exact: true }).click();
    await property(page, "position X", String((i - 1) * 4));
    await property(page, "position Y", "2");
    await property(page, "position Z", "0");
    await property(page, "rotation X", "155");
  }
  await page
    .locator(".tree-name")
    .nth(0)
    .click({ modifiers: ["Shift"] });
  await page
    .locator(".tree-name")
    .nth(1)
    .click({ modifiers: ["Shift"] });
  await page.getByLabel("Vue de la caméra").selectOption("top");
  await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
  await expect(canvas).toHaveAttribute("data-rendered", "3");
  const frames = Number(await canvas.getAttribute("data-frames"));
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-frames")))
    .toBeGreaterThan(frames + 2);
  await page.screenshot({
    path: `/tmp/clik-undersides-${info.project.name}.png`,
  });
  expect(errors).toEqual([]);
});

test("emboîtement brique, plaque et brique aux hauteurs de contact", async ({
  page,
}, info) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Brique 2 × 2", exact: true }).click();
  await page.getByLabel("Vue de la caméra").selectOption("top");
  await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
  const canvas = page.locator("canvas").first();
  await expect(canvas).toHaveAttribute("data-rendered", "1");
  const readyFrames = Number(await canvas.getAttribute("data-frames"));
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-frames")))
    .toBeGreaterThan(readyFrames + 2);
  const box = (await canvas.boundingBox())!;
  const clientX = box.x + box.width / 2,
    clientY = box.y + box.height / 2;
  for (const [name, color, y] of [
    ["Plaque 2 × 2", "Rouge", "1.2"],
    ["Brique 2 × 2", "Jaune", "1.6"],
  ]) {
    await dragLibrary(page, name, clientX, clientY);
    await expect(canvas).toHaveAttribute("data-snap-kind", "attachment");
    await page.mouse.up();
    await expect(page.getByLabel("position Y", { exact: true })).toHaveValue(y);
    await page.getByRole("button", { name: color, exact: true }).click();
    await expect(page.locator(".overlap")).toHaveCount(0);
  }
  await page.getByLabel("Vue de la caméra").selectOption("front");
  await page.getByRole("button", { name: "Cadrer la sélection (F)" }).click();
  await expect(canvas).toHaveAttribute("data-rendered", "3");
  const frames = Number(await canvas.getAttribute("data-frames"));
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-frames")))
    .toBeGreaterThan(frames + 2);
  await page.screenshot({
    path: `/tmp/clik-fitted-stack-${info.project.name}.png`,
  });
});
