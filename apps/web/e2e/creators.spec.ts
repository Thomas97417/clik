import { test, expect } from "@playwright/test";
import { creatorsFixture } from "./fixtures/creators";

test("galerie publique : nom, avatar, pagination, défis et retrait réactif", async ({
  page,
}, info) => {
  const fixture = await creatorsFixture(page);
  await page.goto("/gallery/user/alice");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Alice.");
  await expect(
    page.getByRole("img", { name: "Avatar de Alice" }),
  ).toBeVisible();
  await expect(page.locator(".public-creation-card")).toHaveCount(12);
  await expect(page.locator(".challenge-badge")).toHaveCount(1);
  await expect(page.locator(".public-card-author")).not.toContainText(["Bob"]);
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "La galerie" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "La galerie." })).toHaveCount(
    0,
  );
  await page.screenshot({
    path: `/tmp/clik-creator-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Voir plus de créations" }).click();
  await expect(page.locator(".public-creation-card")).toHaveCount(15);
  await expect(
    page.getByRole("button", { name: "Voir plus de créations" }),
  ).toHaveCount(0);
  fixture.setPublished("creation-0", false);
  await expect(page.locator(".public-creation-card")).toHaveCount(14);
  fixture.setPublished("creation-0", true);
  await expect(page.locator(".public-creation-card")).toHaveCount(15);
  fixture.rename("Alice et ses petites constructions");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Alice et ses petites constructions.",
  );
  await expect(page).toHaveURL(/\/gallery\/user\/alice$/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".creator-page > .back-link").scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `/tmp/clik-creator-mobile-${info.project.name}.png`,
    fullPage: true,
  });
});

test("les auteurs sont accessibles depuis les cartes, créations, défis et commentaires", async ({
  page,
}) => {
  await creatorsFixture(page);
  await page.goto("/gallery");
  await expect(page.locator(".public-creation-card")).toHaveCount(12);
  await expect(page.locator("a a")).toHaveCount(0);
  await page
    .locator(".public-creation-card")
    .first()
    .getByRole("link", { name: "Alice", exact: true })
    .click();
  await expect(page).toHaveURL(/\/gallery\/user\/alice$/);
  await page.locator(".public-creation-open").first().click();
  await expect(page).toHaveURL(/\/creations\/creation-0$/);
  await expect(
    page.locator(".author").getByRole("link", { name: "Alice", exact: true }),
  ).toHaveAttribute("href", "/gallery/user/alice");
  await page
    .locator(".comment-content")
    .getByRole("link", { name: "Bob", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bob.");
  await expect(page.locator(".public-creation-card")).toHaveCount(2);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Les défis" })
    .click();
  await expect(page.locator(".challenge-entry")).toHaveCount(1);
  await expect(page.locator("a a")).toHaveCount(0);
  await page
    .locator(".challenge-entry")
    .getByRole("link", { name: "Alice", exact: true })
    .click();
  await expect(page).toHaveURL(/\/gallery\/user\/alice$/);
  await expect(page.locator(".public-creation-card")).toHaveCount(12);
});

test("comptes vides ou introuvables, avatar indisponible et lien vers ma page publique", async ({
  page,
}) => {
  await creatorsFixture(page, true);
  await page.goto("/gallery/user/empty");
  await expect(
    page.getByRole("heading", {
      name: "Aucune création publique pour le moment.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Compte de Camille" }).click();
  await page
    .getByRole("menuitem", { name: "Ma page publique", exact: true })
    .click();
  await expect(page).toHaveURL(/\/gallery\/user\/viewer$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Camille.");
  for (const id of ["missing", "invalid-id"]) {
    await page.goto(`/gallery/user/${id}`);
    await expect(
      page.getByRole("heading", { name: "Utilisateur introuvable." }),
    ).toBeVisible();
  }
  await page.goto("/gallery/user/broken");
  await expect(
    page.getByRole("img", { name: "Avatar de Photo indisponible" }),
  ).toBeVisible();
  await expect(page.locator(".creator-avatar img")).toHaveCount(0);
  await page.locator(".creator-page > .back-link").click();
  await expect(page).toHaveURL(/\/gallery\/?$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "La galerie.",
  );
});
