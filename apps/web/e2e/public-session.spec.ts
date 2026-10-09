import { test, expect, type Request } from "@playwright/test";
import { creatorsFixture } from "./fixtures/creators";

function isSessionCheck(request: Request) {
  const path = new URL(request.url()).pathname;
  if (!path.startsWith("/_serverFn/")) return false;
  return Buffer.from(path.split("/").pop()!, "base64url")
    .toString()
    .includes("getAuth_createServerFn_handler");
}

for (const authenticated of [false, true]) {
  test(`les sept pages publiques réutilisent la session ${authenticated ? "authentifiée" : "anonyme"}`, async ({
    page,
  }) => {
    await creatorsFixture(page, authenticated);
    await page.goto("/terms");
    await expect(
      page.locator(authenticated ? ".header-user-trigger" : ".header-sign-in"),
    ).toBeVisible();
    // The fixture hydrates as authenticated after an anonymous SSR response.
    // This first transition establishes the corresponding server-checked token.
    await page
      .locator(".site-footer")
      .getByRole("link", { name: "Confidentialité", exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Politique de",
    );

    let sessionChecks = 0;
    let block = true;
    await page.route("**/_serverFn/**", async (route) => {
      if (!isSessionCheck(route.request())) return route.fallback();
      sessionChecks++;
      if (block) return route.abort("failed");
      return route.fallback();
    });
    await page.getByRole("link", { name: "clik. — Accueil" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Un petit clik",
    );
    await page
      .locator(".site-header")
      .getByRole("link", { name: "La galerie", exact: true })
      .click();
    await expect(page.locator(".public-creation-card")).toHaveCount(12);
    await page
      .locator('.public-creation-card a[href="/gallery/user/alice"]')
      .first()
      .click();
    await expect(page).toHaveURL(/\/gallery\/user\/alice$/);
    await page
      .getByRole("link", { name: "Voir La maison bleue 1", exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "La maison bleue 1",
    );
    await page
      .locator(".site-header")
      .getByRole("link", { name: "Les défis", exact: true })
      .click();
    await expect(page).toHaveURL(/\/challenges$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page
      .locator(".site-footer")
      .getByRole("link", { name: "Conditions d’utilisation", exact: true })
      .click();
    await expect(page).toHaveURL(/\/terms$/);
    await page
      .locator(".site-footer")
      .getByRole("link", { name: "Confidentialité", exact: true })
      .click();
    await expect(page).toHaveURL(/\/privacy$/);
    expect(sessionChecks).toBe(0);

    // Account and authentication screens still perform a fresh server check.
    block = false;
    if (authenticated) {
      await page.locator(".header-user-trigger").click();
      await page.getByRole("menuitem", { name: "Paramètres" }).click();
      await expect(page).toHaveURL(/\/settings$/);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    } else {
      await page.locator(".header-sign-in").click();
      await expect(page).toHaveURL(/\/sign-in$/);
      await expect(page.locator(".auth-form")).toBeVisible();
    }
    expect(sessionChecks).toBeGreaterThan(0);
  });
}

test("un changement de session dans un autre onglet force une nouvelle vérification", async ({
  page,
  context,
}) => {
  await creatorsFixture(page);
  const other = await context.newPage();
  await other.route("**/session-signal-test", (route) =>
    route.fulfill({ contentType: "text/html", body: "<p>Autre onglet</p>" }),
  );
  await other.goto("/session-signal-test");
  await page.bringToFront();
  await page.goto("/terms");
  await expect(page.locator(".header-sign-in")).toBeVisible();
  let checks = 0;
  let sessionReads = 0;
  page.on("request", (request) => {
    if (isSessionCheck(request)) checks++;
    if (request.url().includes("/api/auth/get-session")) sessionReads++;
  });
  await page
    .locator(".site-footer")
    .getByRole("link", { name: "Confidentialité", exact: true })
    .click();
  await expect(page).toHaveURL(/\/privacy$/);
  expect(checks).toBe(0);
  const before = sessionReads;
  await other.evaluate(() =>
    localStorage.setItem(
      "better-auth.message",
      JSON.stringify({
        event: "session",
        data: { trigger: "signout" },
        timestamp: Date.now(),
      }),
    ),
  );
  await expect.poll(() => sessionReads).toBeGreaterThan(before);
  await page
    .locator(".site-footer")
    .getByRole("link", { name: "Conditions d’utilisation", exact: true })
    .click();
  await expect(page).toHaveURL(/\/terms$/);
  expect(checks).toBeGreaterThan(0);
  await other.close();
});
