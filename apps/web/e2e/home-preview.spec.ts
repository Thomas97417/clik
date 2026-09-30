import { test, expect } from "@playwright/test";

test.use({ hasTouch: true });

test("aperçu de l’accueil : rotation, zoom, clavier et remise à zéro", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const surface = page.getByRole("group", {
    name: "Manipuler La petite maison",
    exact: true,
  });
  await expect(surface).toBeVisible();
  const canvas = surface.locator("canvas");
  const pixels = () =>
    canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL());
  await page
    .getByRole("button", { name: "Réinitialiser la vue", exact: true })
    .click();
  await expect(canvas).toBeVisible();
  const initial = await pixels();
  const box = (await surface.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 95,
    box.y + box.height / 2 + 35,
    { steps: 12 },
  );
  await page.mouse.up();
  await expect.poll(pixels).not.toBe(initial);
  const rotated = await pixels();
  await page.mouse.wheel(0, -200);
  await expect.poll(pixels).not.toBe(rotated);
  await expect(page).toHaveURL(/\/$/);
  await page
    .getByRole("button", { name: "Réinitialiser la vue", exact: true })
    .click();
  await expect.poll(pixels).toBe(initial);
  await surface.press("ArrowRight");
  await expect.poll(pixels).not.toBe(initial);
  await surface.press("Home");
  await expect.poll(pixels).toBe(initial);
  await surface.press("+");
  await expect.poll(pixels).not.toBe(initial);
  await page.screenshot({
    path: `/tmp/clik-home-preview-${info.project.name}.png`,
  });
  await page.getByRole("button", { name: "Vert", exact: true }).click();
  await expect(canvas).toBeHidden();
  await expect(surface).toBeVisible();
  await surface.press("ArrowLeft");
  await expect(canvas).toBeVisible();
  await page.getByRole("button", { name: "Phare", exact: true }).click();
  await expect(
    page.getByRole("group", {
      name: "Manipuler Le phare des marées",
      exact: true,
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("aperçu mobile : zoom tactile, rotation et absence de débordement", async ({
  page,
  browserName,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const surface = page.getByRole("group", {
    name: "Manipuler La petite maison",
    exact: true,
  });
  await surface.scrollIntoViewIfNeeded();
  await page
    .getByRole("button", { name: "Zoomer l’aperçu", exact: true })
    .tap();
  const canvas = surface.locator("canvas");
  await expect(canvas).toBeVisible();
  const pixels = () =>
    canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL());
  const zoomed = await pixels();
  await page
    .getByRole("button", { name: "Dézoomer l’aperçu", exact: true })
    .tap();
  await expect.poll(pixels).not.toBe(zoomed);
  if (browserName === "chromium") {
    const before = await pixels();
    const box = (await surface.boundingBox())!;
    const client = await page.context().newCDPSession(page);
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [point],
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: point.x + 70, y: point.y + 20 }],
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect.poll(pixels).not.toBe(before);
    await client.detach();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Réinitialiser la vue", exact: true })
    .tap();
  await page.locator(".home-playground").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `/tmp/clik-home-preview-mobile-${info.project.name}.png`,
  });
});
