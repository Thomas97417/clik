import { test, expect, type Page } from "@playwright/test";

async function anonymous(page: Page) {
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({ json: null }),
  );
  await page.route(
    /https:\/\/(?:[^/]+\.)?posthog\.com\/|https:\/\/analytics\.clik\.test\//,
    (route) =>
      route.request().resourceType() === "script"
        ? route.fulfill({ contentType: "text/javascript", body: "" })
        : route.fulfill({
            json: {
              status: 1,
              supportedCompression: [],
              config: { enable_collect_everything: false },
            },
          }),
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
    await expect(page.locator(".header-sign-in")).toBeVisible();
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
      page.getByRole("button", { name: last, exact: true }),
    ).toBeInViewport();
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(path);
      await expect(page.locator(".header-sign-in")).toBeVisible();
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
        page.getByRole("button", { name: last, exact: true }),
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
  }
  await page
    .locator(".site-footer")
    .getByRole("link", { name: "Confidentialité", exact: true })
    .click();
  await expect(page).toHaveURL(/\/privacy$/);
  await page
    .locator(".site-footer")
    .getByRole("link", { name: "Conditions d’utilisation", exact: true })
    .click();
  await expect(page).toHaveURL(/\/terms$/);
});

test("les documents décrivent la mesure automatique sans interface de préférences", async ({
  page,
}) => {
  await anonymous(page);
  await page.goto("/privacy#cookies");
  await expect(
    page.getByText("Clik utilise PostHog pour mesurer automatiquement", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: /Accepter|Refuser|Préférences de confidentialité/,
    }),
  ).toHaveCount(0);
  await expect(page.locator(".site-footer nav").getByRole("link")).toHaveCount(
    2,
  );
  await page
    .locator(".site-footer")
    .getByRole("link", { name: "Conditions d’utilisation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Vos données personnelles", exact: true })
    .click();
  await expect(
    page.getByText("Clik mesure automatiquement la fréquentation", {
      exact: false,
    }),
  ).toBeVisible();
});
