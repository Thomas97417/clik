import { test, expect } from "@playwright/test";
import { creatorsFixture } from "./fixtures/creators";

test("avatar : prévisualiser, annuler, réessayer et conserver le choix partout", async ({
  page,
}, info) => {
  const fixture = await creatorsFixture(page, true);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const account = page.getByRole("button", {
    name: "Compte de Camille",
    exact: true,
  });
  const headerAvatar = page.locator("header .header-avatar .brick-avatar");
  await expect(headerAvatar).toBeVisible();
  const original = await headerAvatar.getAttribute("data-avatar-seed");
  const openSettings = async () => {
    await account.click();
    await page
      .getByRole("menuitem", { name: "Paramètres", exact: true })
      .click();
    await expect(page.locator(".avatar-settings-card")).toBeVisible();
  };
  await openSettings();
  const card = page.locator(".avatar-settings-card");
  const current = card.locator(".brick-avatar");
  const customize = card.getByRole("button", {
    name: "Personnaliser mon avatar",
  });
  const dialog = page.getByRole("dialog", { name: "Un avatar à votre façon." });
  const preview = dialog.locator(".avatar-settings-preview > .brick-avatar");
  const shuffle = dialog.getByRole("button", {
    name: "Nouveau motif",
    exact: true,
  });
  const save = dialog.getByRole("button", {
    name: "Valider les changements",
    exact: true,
  });
  await expect(current).toHaveAttribute("data-avatar-seed", original!);
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await customize.click();
  await expect(save).toBeDisabled();
  await shuffle.focus();
  await page.keyboard.press("Enter");
  await expect(preview).not.toHaveAttribute("data-avatar-seed", original!);
  const discarded = await preview.getAttribute("data-avatar-seed");
  await expect(headerAvatar).toHaveAttribute("data-avatar-seed", original!);
  expect(fixture.avatarSaves).toHaveLength(0);
  await dialog.getByRole("button", { name: "Fermer", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(customize).toBeFocused();
  await expect(current).toHaveAttribute("data-avatar-seed", original!);
  await customize.click();
  await expect(preview).toHaveAttribute("data-avatar-seed", original!);
  await shuffle.click();
  await expect(preview).not.toHaveAttribute("data-avatar-seed", discarded!);
  const chosen = await preview.getAttribute("data-avatar-seed");
  fixture.failAvatarSave(true);
  await save.click();
  await expect(dialog.getByRole("alert")).toContainText(
    "proposition est conservée",
  );
  await expect(preview).toHaveAttribute("data-avatar-seed", chosen!);
  await expect(headerAvatar).toHaveAttribute("data-avatar-seed", original!);
  fixture.failAvatarSave(false);
  await save.click();
  await expect(dialog).toBeHidden();
  await expect(card.getByRole("status")).toHaveText("Avatar enregistré.");
  await expect(headerAvatar).toHaveAttribute("data-avatar-seed", chosen!);
  await expect(current).toHaveAttribute("data-avatar-seed", chosen!);

  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await card.scrollIntoViewIfNeeded();
    expect(await card.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );
    expect(
      await headerAvatar.evaluate((el) =>
        Math.round(el.getBoundingClientRect().width),
      ),
    ).toBe(32);
    await card.screenshot({
      path: `/tmp/clik-avatar-settings-${width}-${info.project.name}.png`,
    });
  }
  await account.click();
  await page
    .getByRole("menuitem", { name: "Ma page publique", exact: true })
    .click();
  await expect(page.locator(".creator-avatar .brick-avatar")).toHaveAttribute(
    "data-avatar-seed",
    chosen!,
  );
  // A fresh document confirms that state comes from persisted account data.
  await page.goto("/");
  await expect(headerAvatar).toHaveAttribute("data-avatar-seed", chosen!);
  await openSettings();
  await expect(current).toHaveAttribute("data-avatar-seed", chosen!);
  expect(fixture.avatarSaves).toHaveLength(2);
  expect(errors).toEqual([]);
});

test("les signatures et commentaires reflètent les changements d’avatar sans rechargement", async ({
  page,
}) => {
  const fixture = await creatorsFixture(page);
  await page.goto("/gallery");
  const signatures = page.locator(".public-card-author .brick-avatar");
  await expect(signatures).toHaveCount(12);
  const alice = {
    version: 1 as const,
    seed: "12345678-1234-4234-9234-123456789abc",
  };
  fixture.setAvatar("alice", alice);
  await expect(signatures.first()).toHaveAttribute(
    "data-avatar-seed",
    alice.seed,
  );
  await page.locator(".public-creation-open").first().click();
  await expect(
    page.locator(".author-link .brick-avatar").first(),
  ).toHaveAttribute("data-avatar-seed", alice.seed);
  const bob = {
    version: 1 as const,
    seed: "abcdefab-1234-4234-9234-123456789abc",
  };
  fixture.setAvatar("bob", bob);
  await expect(page.locator(".comment-avatar .brick-avatar")).toHaveAttribute(
    "data-avatar-seed",
    bob.seed,
  );
  await expect(page.locator(".comment .brick-avatar")).toHaveCount(1);
});
