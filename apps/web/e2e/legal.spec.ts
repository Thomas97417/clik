import { test, expect, type Page } from "@playwright/test";

async function anonymous(page: Page) {
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({ json: null }),
  );
  await page.route("https://analytics.clik.test/**", (route) =>
    route.fulfill({
      json: {
        status: 1,
        supportedCompression: [],
        config: { enable_collect_everything: false },
      },
    }),
  );
  await page.addInitScript(() =>
    localStorage.setItem(
      "clik-analytics-consent",
      JSON.stringify({ value: "declined", expiresAt: Date.now() + 86400000 }),
    ),
  );
}

test("les documents publics sont complets dans le HTML sans session ni JavaScript", async ({
  request,
}) => {
  for (const [path, title] of [
    ["/privacy", "Politique de confidentialité"],
    ["/terms", "Conditions d’utilisation"],
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const html = await response.text();
    const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
    expect(visible).toContain("TOMA");
    expect(visible).toContain("France");
    expect(visible).toContain("mailto:contact@clik.build");
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html).toContain(`${title} — Clik`);
    expect(html.match(/rel="canonical"/g)).toHaveLength(1);
    expect(visible).toContain(`href="${path}"`);
    expect(visible).not.toContain("complétées avant la publication");
  }
});

test("le sommaire et les liens restent utilisables sur ordinateur et mobile", async ({
  page,
}, info) => {
  await anonymous(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [path, title, last] of [
    ["/privacy", "Politique de", "Sécurité et évolutions"],
    ["/terms", "Conditions", "Évolution de ces conditions"],
  ]) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(title);
    await expect(page.locator(".legal-art")).toBeVisible();
    await page.screenshot({
      path: `/tmp/clik-legal-${path.slice(1)}-${info.project.name}.png`,
    });
    await page
      .locator(".legal-sidebar")
      .getByRole("link", { name: last })
      .click();
    await expect(
      page.getByRole("heading", { name: last, exact: true }),
    ).toBeInViewport();
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(path);
      await expect(page.locator(".legal-sidebar")).not.toBeVisible();
      expect(
        await page
          .locator(".legal-page")
          .evaluate((node) => node.scrollWidth <= node.clientWidth),
      ).toBe(true);
      await page.screenshot({
        path: `/tmp/clik-legal-${path.slice(1)}-${width}-${info.project.name}.png`,
      });
      await page.locator(".legal-mobile-contents summary").click();
      await page
        .locator(".legal-mobile-contents")
        .getByRole("link", { name: last })
        .click();
      await expect(page.locator(".legal-mobile-contents")).not.toHaveAttribute(
        "open",
        "",
      );
      await expect(
        page.getByRole("heading", { name: last, exact: true }),
      ).toBeInViewport();
    }
  }
  expect(errors).toEqual([]);
});

test("l’accueil et les écrans de connexion donnent accès aux deux documents", async ({
  page,
}) => {
  await anonymous(page);
  for (const path of ["/", "/sign-in", "/sign-up"]) {
    await page.goto(path);
    await expect(page.locator(".header-sign-in")).toBeVisible();
    const footer = page.locator(".site-footer");
    await expect(
      footer.getByRole("link", { name: "Confidentialité", exact: true }),
    ).toHaveAttribute("href", "/privacy");
    await expect(
      footer.getByRole("link", {
        name: "Conditions d’utilisation",
        exact: true,
      }),
    ).toHaveAttribute("href", "/terms");
    if (path !== "/")
      await expect(page.locator(".auth-legal-links")).toBeVisible();
  }
  await page
    .locator(".auth-legal-links")
    .getByRole("link", { name: "Confidentialité", exact: true })
    .click();
  await expect(page).toHaveURL(/\/privacy$/);
  await page
    .locator(".site-footer")
    .getByRole("link", { name: "Conditions d’utilisation", exact: true })
    .click();
  await expect(page).toHaveURL(/\/terms$/);
});

test("la mesure d’audience attend un accord et son choix se modifie au clavier", async ({
  page,
}, info) => {
  let requests = 0;
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({ json: null }),
  );
  await page.route("**/*", async (route) => {
    if (
      new URL(route.request().url()).origin !==
      new URL(test.info().project.use.baseURL!).origin
    ) {
      requests++;
      await route.fulfill({
        json: {
          status: 1,
          featureFlags: {},
          supportedCompression: [],
          config: {},
        },
      });
    } else await route.fallback();
  });
  await page.goto("/privacy");
  const banner = page.locator(".analytics-banner");
  test.skip(
    !(await banner.isVisible()),
    "La mesure d’audience est désactivée dans ce build.",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    banner.getByRole("button", { name: "Refuser", exact: true }),
  ).toBeVisible();
  await expect(
    banner.getByRole("button", { name: "Accepter", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `/tmp/clik-legal-consent-${info.project.name}.png`,
  });
  await page.waitForTimeout(1800);
  expect(requests).toBe(0);
  await banner.getByRole("button", { name: "Refuser", exact: true }).click();
  await expect(banner).not.toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("clik-analytics-consent")!).value,
    ),
  ).toBe("declined");

  const preferences = page
    .locator(".site-footer")
    .getByRole("button", { name: "Préférences de confidentialité" });
  await preferences.click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Refuser", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(preferences).toBeFocused();
  await preferences.press("Enter");
  await dialog.getByRole("button", { name: "Accepter", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect.poll(() => requests).toBeGreaterThan(0);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("clik-analytics-consent")!).value,
    ),
  ).toBe("accepted");

  await preferences.click();
  await dialog.getByRole("button", { name: "Refuser", exact: true }).click();
  await expect(page.locator(".legal-prose").getByRole("status")).toContainText(
    "refusée",
  );
});
