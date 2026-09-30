import { test, expect } from "@playwright/test";
import { projectsFixture } from "./fixtures/projects";

test("Privée ouvre un menu puis la modale préremplie, sans ouvrir l’éditeur", async ({
  page,
}, info) => {
  const { calls } = await projectsFixture(page);
  await page.goto("/projects");
  const card = page.locator(".project-card").filter({
    has: page.getByRole("heading", { name: "Le phare bleu", exact: true }),
  });
  const trigger = card.getByRole("button", {
    name: "Visibilité de Le phare bleu : Privée",
    exact: true,
  });
  await trigger.click();
  await expect(
    page.getByRole("menuitem", { name: "Publier", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(
    page.getByRole("menuitem", { name: "Publier", exact: true }).locator("svg"),
  ).toHaveCount(0);
  await page.screenshot({
    path: `/tmp/clik-project-visibility-${info.project.name}.png`,
  });
  await page.getByRole("menuitem", { name: "Publier", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Publier votre création" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Titre", { exact: true })).toHaveValue(
    "Le phare bleu",
  );
  await expect(dialog.getByLabel("Titre", { exact: true })).toBeFocused();
  await expect(dialog.getByLabel("Description", { exact: false })).toHaveValue(
    "Une lumière au bord de la mer.",
  );
  await dialog.getByLabel("Titre", { exact: true }).fill("Titre abandonné");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(calls.uploads).toHaveLength(0);
  expect(calls.publications).toHaveLength(0);
  await trigger.press("Enter");
  await page
    .getByRole("menuitem", { name: "Publier", exact: true })
    .press("Enter");
  await expect(dialog.getByLabel("Titre", { exact: true })).toHaveValue(
    "Le phare bleu",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    dialog.getByRole("button", { name: "Publier cette version" }),
  ).toBeInViewport();
  await page.screenshot({
    path: `/tmp/clik-project-publish-${info.project.name}.png`,
  });
  await dialog.getByRole("button", { name: "Fermer", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page
    .getByRole("button", { name: "Visibilité de Un ancien défi : Privée" })
    .click();
  await expect(
    page.getByRole("menuitem", { name: "Défi terminé" }),
  ).toBeDisabled();
});

test("Version publiée permet de repasser en privé depuis un menu compact", async ({
  page,
}, info) => {
  const fixture = await projectsFixture(page, { published: true });
  fixture.failWithdrawal(true);
  await page.goto("/projects");
  const card = page
    .locator(".project-card")
    .filter({
      has: page.getByRole("heading", { name: "Le phare bleu", exact: true }),
    });
  const published = card.getByRole("button", {
    name: "Visibilité de Le phare bleu : Version publiée",
    exact: true,
  });
  await expect(card.getByRole("button", { name: /Actions pour/ })).toHaveCount(
    0,
  );
  await expect(
    card.getByText("Retirer de la galerie", { exact: true }),
  ).toHaveCount(0);
  await published.click();
  const action = page.getByRole("menuitem", {
    name: "Passer en privé",
    exact: true,
  });
  await expect(action).toBeVisible();
  await expect(action.locator("svg")).toHaveCount(0);
  const triggerBox = (await published.boundingBox())!;
  const menuBox = (await page
    .locator(".project-visibility-menu")
    .boundingBox())!;
  expect(menuBox.width).toBeLessThanOrEqual(triggerBox.width + 2);
  await page.screenshot({
    path: `/tmp/clik-project-private-menu-${info.project.name}.png`,
  });
  await action.click();
  await expect(page.getByText(/Retrait indisponible, réessayez/)).toBeVisible();
  await expect(published).toBeEnabled();
  await expect(
    card.getByRole("link", { name: /Voir la publication/ }),
  ).toBeVisible();
  fixture.failWithdrawal(false);
  await published.press("Enter");
  await action.press("Enter");
  const privateBadge = card.getByRole("button", {
    name: "Visibilité de Le phare bleu : Privée",
    exact: true,
  });
  await expect(privateBadge).toBeVisible();
  await expect(
    card.getByRole("link", { name: /Voir la publication/ }),
  ).toHaveCount(0);
  await expect(
    card.getByText("Visible uniquement par vous", { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/projects$/);
  expect(fixture.calls.withdrawals).toEqual([
    { id: "publication" },
    { id: "publication" },
  ]);
  await privateBadge.click();
  await page.getByRole("menuitem", { name: "Publier", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByLabel("Description", { exact: false }),
  ).toHaveValue("Une lumière au bord de la mer.");
});

test("publier depuis la collection : miniature, révision, erreur récupérable et statut actualisé", async ({
  page,
}) => {
  const fixture = await projectsFixture(page);
  fixture.failPublication(true);
  await page.goto("/projects");
  const card = page.locator(".project-card").filter({
    has: page.getByRole("heading", { name: "Le phare bleu", exact: true }),
  });
  await card.getByRole("button", { name: /Privée/ }).click();
  await page.getByRole("menuitem", { name: "Publier", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Publier votre création" });
  await dialog.getByLabel("Titre", { exact: true }).fill(" ");
  await expect(
    dialog.getByRole("button", { name: "Publier cette version" }),
  ).toBeDisabled();
  await dialog.getByLabel("Titre", { exact: true }).fill("Le phare partagé");
  await dialog
    .getByLabel("Description", { exact: false })
    .fill("Bienvenue au bord de la mer.");
  await dialog.getByRole("button", { name: "Publier cette version" }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Titre", { exact: true })).toHaveValue(
    "Le phare partagé",
  );
  expect(fixture.calls.publications).toHaveLength(1);
  fixture.failPublication(false);
  await dialog.getByRole("button", { name: "Publier cette version" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    card.getByText("Version publiée", { exact: true }),
  ).toBeVisible();
  await expect(
    card.getByRole("link", { name: /Voir la publication/ }),
  ).toHaveAttribute("href", "/creations/publication");
  await expect(page).toHaveURL(/\/projects$/);
  expect(fixture.calls.publications).toHaveLength(2);
  expect(fixture.calls.publications[1]).toEqual({
    id: "project",
    title: "Le phare partagé",
    description: "Bienvenue au bord de la mer.",
    thumbnail: "thumbnail",
    revision: 7,
  });
  expect(fixture.calls.uploads[0].projectId).toBe("project");
  const png = Buffer.from(fixture.calls.uploads[0].bytes.$bytes, "base64");
  expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
});
