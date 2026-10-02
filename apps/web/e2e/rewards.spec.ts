import { test, expect } from "@playwright/test";
import { creatorsFixture } from "./fixtures/creators";

test("récompenses : verrouillage, aperçu, annulation et équipement public", async ({
  page,
}, info) => {
  const fixture = await creatorsFixture(page, true);
  fixture.setRewards(5, ["gold"]);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const account = page.getByRole("button", {
    name: "Compte de Camille",
    exact: true,
  });
  await expect(account).toBeVisible();
  await account.click();
  await page.getByRole("menuitem", { name: "Paramètres", exact: true }).click();
  const summary = page.locator(".avatar-settings-card");
  const customize = summary.getByRole("button", {
    name: "Personnaliser mon avatar",
  });
  await customize.click();
  const card = page.getByRole("dialog", { name: "Un avatar à votre façon." });
  const preview = card.locator(".avatar-settings-preview > .brick-avatar");
  const gold = card.getByRole("button", { name: "Or Débloquée", exact: true });
  await expect(gold).toBeEnabled();
  await expect(
    card.getByRole("button", { name: /Argent.*Verrouillée/ }),
  ).toBeDisabled();
  await expect(
    card.getByRole("button", { name: /Architecte.*5 \/ 10/ }),
  ).toBeDisabled();
  await expect(
    card.getByRole("progressbar", {
      name: "Progression Architecte",
      exact: true,
    }),
  ).toHaveAttribute("value", "5");
  await gold.click();
  await card
    .getByRole("button", { name: "Bâtisseur 5 défis · Débloqué", exact: true })
    .click();
  await expect(preview).toHaveAttribute("data-avatar-crown", "gold");
  await expect(preview).toHaveAttribute("data-avatar-ring", "participation-5");
  await expect(
    page.locator("header .header-avatar .brick-avatar"),
  ).toHaveAttribute("data-avatar-crown", "none");
  await card.getByRole("button", { name: "Fermer", exact: true }).click();
  await expect(card).toBeHidden();
  await customize.click();
  await expect(preview).toHaveAttribute("data-avatar-crown", "none");
  expect(fixture.avatarSaves).toHaveLength(0);
  await gold.focus();
  await page.keyboard.press("Enter");
  await card
    .getByRole("button", { name: "Bâtisseur 5 défis · Débloqué", exact: true })
    .click();
  await card
    .getByRole("button", { name: "Nouveau motif", exact: true })
    .click();
  await expect(preview).toHaveAttribute("data-avatar-crown", "gold");
  await expect(preview).toHaveAttribute("data-avatar-ring", "participation-5");
  const save = card.getByRole("button", {
    name: "Valider les changements",
    exact: true,
  });
  fixture.failAvatarSave(true);
  await save.click();
  await expect(card.getByRole("alert")).toBeVisible();
  await expect(preview).toHaveAttribute("data-avatar-crown", "gold");
  fixture.failAvatarSave(false);
  await save.click();
  await expect(
    page.locator("header .header-avatar .brick-avatar"),
  ).toHaveAttribute("data-avatar-crown", "gold");
  await expect(
    page.locator("header .header-avatar .brick-avatar"),
  ).toHaveAttribute("data-avatar-ring", "participation-5");
  await expect(save).toBeHidden();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1800 });
    expect(
      await summary.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await summary.screenshot({
      path: `/tmp/clik-rewards-${width}-${info.project.name}.png`,
    });
  }
  await account.click();
  await page
    .getByRole("menuitem", { name: "Ma page publique", exact: true })
    .click();
  await expect(page.locator(".creator-avatar .brick-avatar")).toHaveAttribute(
    "data-avatar-crown",
    "gold",
  );
  await account.click();
  await page.getByRole("menuitem", { name: "Paramètres", exact: true }).click();
  await customize.click();
  await card
    .getByRole("button", { name: "Aucune Sans couronne", exact: true })
    .click();
  await card
    .getByRole("button", { name: "Aucun Sans contour", exact: true })
    .click();
  await save.click();
  await expect(
    page.locator("header .header-avatar .brick-avatar"),
  ).toHaveAttribute("data-avatar-crown", "none");
  await expect(
    page.locator("header .header-avatar .brick-avatar"),
  ).toHaveAttribute("data-avatar-ring", "none");
  expect(errors).toEqual([]);
});

test("défis : échéance et podium figé avec ex æquo et création retirée", async ({
  page,
}, info) => {
  const fixture = await creatorsFixture(page);
  fixture.setRewardPhase("pending");
  await page.goto("/challenges");
  const rewards = page.getByRole("region", { name: "Récompenses du défi" });
  await expect(rewards).toContainText("24 h après la fin des constructions");
  fixture.setRewardPhase("complete");
  await expect(rewards).toContainText("Résultats définitifs");
  await expect(rewards.getByText("1er · Or", { exact: true })).toHaveCount(2);
  await expect(rewards.getByText("3e · Bronze", { exact: true })).toBeVisible();
  await expect(
    rewards.getByRole("link", { name: "Création retirée" }),
  ).toHaveCount(0);
  await expect(
    rewards.getByText("Création retirée", { exact: true }),
  ).toBeVisible();
  await expect(
    rewards.getByRole("link", { name: "Le phare couronné" }),
  ).toHaveAttribute("href", "/creations/creation-1");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1800 });
    await rewards.screenshot({
      path: `/tmp/clik-podium-${width}-${info.project.name}.png`,
    });
  }
});
