import { test, expect, type Page } from "@playwright/test";

const api = "**/api/auth/";
async function ready(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator(".header-sign-in")).toBeVisible();
}

test("les cinq pages sont cohérentes et restent lisibles sur mobile", async ({
  page,
}, info) => {
  for (const route of [
    "sign-in",
    "sign-up",
    "forgot-password",
    "reset-password?token=preview",
    "verify-email",
  ]) {
    await ready(page, `/${route}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page).toHaveTitle(/Clik/);
    await page.screenshot({
      path: `/tmp/clik-auth-${route.split("?")[0]}-${info.project.name}.png`,
    });
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(
        page.locator(".auth-form button[type=submit]"),
      ).toBeVisible();
      await expect(page.locator(".auth-story")).not.toBeVisible();
    }
    await page.screenshot({
      path: `/tmp/clik-auth-mobile-${route.split("?")[0]}-${info.project.name}.png`,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
});

test("inscription : validation, mot de passe au clavier et confirmation", async ({
  page,
}, info) => {
  let body: Record<string, string> | undefined;
  await page.route(`${api}sign-up/email`, async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({
      json: {
        user: {
          id: "preview",
          name: "Camille",
          email: "camille@example.test",
          emailVerified: false,
        },
        token: null,
      },
    });
  });
  await ready(page, "/sign-up");
  const submit = page.getByRole("button", { name: "Créer mon compte" });
  await submit.click();
  await expect(page.getByLabel("Votre nom", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Adresse email")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(body).toBeUndefined();
  await page.getByLabel("Votre nom", { exact: true }).fill("  Camille  ");
  await page.getByLabel("Adresse email").fill("camille@example.test");
  await page.getByLabel("Mot de passe", { exact: true }).fill("ClikTest42!");
  await page
    .getByRole("button", { name: "Afficher le mot de passe", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByLabel("Mot de passe", { exact: true }),
  ).toHaveAttribute("type", "text");
  await page
    .getByRole("button", { name: "Masquer le mot de passe", exact: true })
    .click();
  await expect(
    page.getByLabel("Mot de passe", { exact: true }),
  ).toHaveAttribute("type", "password");
  await submit.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Confirmez votre email.",
  );
  await expect(page.getByRole("status")).toContainText("camille@example.test");
  expect(body?.name).toBe("Camille");
  await page.screenshot({
    path: `/tmp/clik-auth-created-${info.project.name}.png`,
  });
});

for (const [path, endpoint] of [
  ["forgot-password", "request-password-reset"],
  ["verify-email", "send-verification-email"],
]) {
  test(`${path} : pas de faux succès, nouvelle tentative et correction de l’adresse`, async ({
    page,
  }, info) => {
    let count = 0;
    await page.route(`${api}${endpoint}`, async (route) => {
      count++;
      if (count === 1)
        await route.fulfill({
          status: 429,
          json: { code: "TOO_MANY_REQUESTS", message: "Too many requests" },
        });
      else await route.fulfill({ json: { status: true } });
    });
    await ready(page, `/${path}`);
    await page.getByLabel("Adresse email").fill("camille@example.test");
    const submit = page.locator(".auth-form button[type=submit]");
    await submit.click();
    await expect(page.getByRole("alert")).toContainText("Trop de tentatives");
    await expect(page.getByRole("heading", { level: 1 })).not.toContainText(
      "Consultez votre messagerie",
    );
    await submit.click();
    await expect(page.getByRole("status")).toContainText(
      "camille@example.test",
    );
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    await page.screenshot({
      path: `/tmp/clik-auth-sent-${path}-${info.project.name}.png`,
    });
    await page
      .getByRole("button", { name: "Corriger l’adresse email" })
      .click();
    await expect(page.getByLabel("Adresse email")).toHaveValue(
      "camille@example.test",
    );
    expect(count).toBe(2);
  });
}

test("réinitialisation : lien invalide, confirmation et mot de passe enregistré", async ({
  page,
}) => {
  await ready(page, "/reset-password");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Ce lien n’est plus valide",
  );
  await expect(
    page.getByRole("link", { name: "Demander un nouveau lien" }),
  ).toBeVisible();
  let body: Record<string, string> | undefined;
  await page.route(`${api}reset-password`, async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({ json: { status: true } });
  });
  await ready(page, "/reset-password?token=preview-token");
  await page
    .getByLabel("Nouveau mot de passe", { exact: true })
    .fill("ClikTest42!");
  await page
    .getByLabel("Confirmer le mot de passe", { exact: true })
    .fill("Different42!");
  await page
    .getByRole("button", { name: "Enregistrer le mot de passe" })
    .click();
  await expect(
    page.getByLabel("Confirmer le mot de passe", { exact: true }),
  ).toBeFocused();
  await expect(
    page.getByText("Les deux mots de passe doivent être identiques."),
  ).toBeVisible();
  expect(body).toBeUndefined();
  await page
    .getByLabel("Confirmer le mot de passe", { exact: true })
    .fill("ClikTest42!");
  await page
    .getByRole("button", { name: "Enregistrer le mot de passe" })
    .click();
  await expect(page.getByRole("status")).toContainText("enregistré");
  expect(body).toEqual({ token: "preview-token", newPassword: "ClikTest42!" });
});

test("un lien expiré renvoie vers une nouvelle demande", async ({ page }) => {
  await page.route(`${api}reset-password`, (route) =>
    route.fulfill({
      status: 400,
      json: { code: "INVALID_TOKEN", message: "Invalid token" },
    }),
  );
  await ready(page, "/reset-password?token=expired");
  await page
    .getByLabel("Nouveau mot de passe", { exact: true })
    .fill("ClikTest42!");
  await page
    .getByLabel("Confirmer le mot de passe", { exact: true })
    .fill("ClikTest42!");
  await page
    .getByRole("button", { name: "Enregistrer le mot de passe" })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Ce lien n’est plus valide",
  );
  await page.getByRole("link", { name: "Demander un nouveau lien" }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
});

test("connexion : email non vérifié et retour à la création après connexion", async ({
  page,
}) => {
  let count = 0;
  await page.route(`${api}sign-in/email`, async (route) => {
    count++;
    if (count === 1)
      await route.fulfill({
        status: 403,
        json: { code: "EMAIL_NOT_VERIFIED", message: "Email not verified" },
      });
    else await route.fulfill({ json: { status: true } });
  });
  await ready(page, "/sign-in");
  await page.evaluate(() =>
    sessionStorage.setItem("clik-return-to", "/editor?draft=auth-return"),
  );
  await page.getByLabel("Adresse email").fill("camille@example.test");
  await page.getByLabel("Mot de passe", { exact: true }).fill("ClikTest42!");
  await page
    .locator(".auth-form")
    .getByRole("button", { name: "Se connecter" })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Confirmez votre adresse email",
  );
  await expect(
    page.getByRole("link", { name: "Recevoir un lien de vérification" }),
  ).toBeVisible();
  await page
    .locator(".auth-form")
    .getByRole("button", { name: "Se connecter" })
    .click();
  await expect(page).toHaveURL(/\/editor\?draft=auth-return$/);
});

test("un échec Google garde le formulaire utilisable et un retour local sûr", async ({
  page,
}) => {
  let body: Record<string, string> | undefined;
  await page.route(`${api}sign-in/social`, async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({
      status: 500,
      json: { code: "UNKNOWN_ERROR", message: "Unavailable" },
    });
  });
  await ready(page, "/sign-in");
  await page.evaluate(() =>
    sessionStorage.setItem("clik-return-to", "https://example.test"),
  );
  await page.getByRole("button", { name: "Google", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("indisponible");
  await expect(page.getByLabel("Adresse email")).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "GitHub", exact: true }),
  ).toBeEnabled();
  expect(body?.callbackURL).toBe("/editor");
});

test("l’envoi bloque les doublons et une coupure réseau permet de réessayer", async ({
  page,
}) => {
  let count = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`${api}request-password-reset`, async (route) => {
    count++;
    if (count === 1) {
      await gate;
      await route.abort("failed");
    } else await route.fulfill({ json: { status: true } });
  });
  await ready(page, "/forgot-password");
  await page.getByLabel("Adresse email").fill("camille@example.test");
  await page
    .getByRole("button", { name: "Envoyer le lien", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Envoi en cours…" }),
  ).toBeDisabled();
  await expect(page.getByLabel("Adresse email")).toBeDisabled();
  await page.keyboard.press("Enter");
  expect(count).toBe(1);
  release();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Adresse email")).toBeEnabled();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Mot de passe oublié",
  );
  await page
    .getByRole("button", { name: "Envoyer le lien", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("prise en compte");
  expect(count).toBe(2);
});
