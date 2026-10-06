import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({ json: null }),
  );
  await page.addInitScript(() =>
    localStorage.setItem(
      "clik-analytics-consent",
      JSON.stringify({ value: "declined", expiresAt: Date.now() + 86400000 }),
    ),
  );
});

for (const width of [1440, 390]) {
  test(`la navigation repart en haut et le retour restaure la lecture (${width}px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Politique de",
    );
    // Attendre que le routeur client ait pris en charge le défilement du HTML SSR.
    await expect
      .poll(() => page.evaluate(() => window.history.scrollRestoration))
      .toBe("manual");

    const scroll = page.locator(".page-scroll");
    const scrollTop = () => scroll.evaluate((element) => element.scrollTop);
    const termsLink = page
      .locator(".site-footer")
      .getByRole("link", { name: "Conditions d’utilisation", exact: true });
    await termsLink.scrollIntoViewIfNeeded();
    await expect.poll(scrollTop).toBeGreaterThan(800);
    // Laisser la position de lecture se stabiliser avant de changer de page.
    await page.waitForTimeout(150);
    const readingPosition = await scrollTop();

    await termsLink.click();
    await expect(page).toHaveURL(/\/terms$/);
    await expect.poll(scrollTop).toBe(0);
    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
    await page.waitForTimeout(150);

    await page.goBack();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect
      .poll(async () => Math.abs((await scrollTop()) - readingPosition))
      .toBeLessThan(2);
    await page.waitForTimeout(150);

    await page.goForward();
    await expect(page).toHaveURL(/\/terms$/);
    await expect.poll(scrollTop).toBe(0);

    // Un nouveau lien vers une page déjà visitée doit aussi repartir en haut.
    await page
      .locator(".site-footer")
      .getByRole("link", { name: "Confidentialité", exact: true })
      .click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect.poll(scrollTop).toBe(0);
  });
}

test("les liens directs et le sommaire conservent le défilement vers les ancres", async ({
  page,
}) => {
  await page.goto("/privacy#cookies");
  await expect(page.locator("#cookies")).toBeInViewport();
  await expect
    .poll(() =>
      page.locator(".page-scroll").evaluate((element) => element.scrollTop),
    )
    .toBeGreaterThan(500);

  await page
    .locator(".legal-sidebar")
    .getByRole("link", { name: "Sécurité et évolutions", exact: true })
    .click();
  await expect(page).toHaveURL(/\/privacy#securite$/);
  await expect(page.locator("#securite")).toBeInViewport();
});
