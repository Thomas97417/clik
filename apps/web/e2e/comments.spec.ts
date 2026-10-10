import { test, expect } from "@playwright/test";
import { challengeFixture } from "./fixtures/challenges";
import { creatorsFixture } from "./fixtures/creators";

test("commentaires : raccourcis, brouillon conservé après erreur et retour du focus", async ({
  page,
}, info) => {
  const fixture = await challengeFixture(page);
  await page.goto("/creations/entry-0#comments");
  const composer = page.getByLabel("Votre commentaire", { exact: true });
  const publish = page.getByRole("button", { name: "Publier le commentaire" });
  const comment = page.locator(".comment");
  const body = "Une belle construction !\nEt une idée pour la suite.";
  await expect(composer).toBeEnabled();
  await expect(publish).toBeDisabled();
  await composer.fill("   ");
  await expect(publish).toBeDisabled();
  await composer.fill(body);
  await composer.press("Enter");
  await expect(composer).toHaveValue(body + "\n");
  await expect(comment).toHaveCount(0);
  await composer.fill(body);
  fixture.failNextComment("add");
  await composer.press("Control+Enter");
  await expect(page.getByRole("alert")).toHaveText(
    "Votre commentaire n’a pas pu être publié. Réessayez.",
  );
  await expect(composer).toHaveValue(body);
  await expect(composer).toBeFocused();
  await expect(comment).toHaveCount(0);
  await publish.click();
  await expect(comment.locator(".comment-content > p")).toHaveText(body);
  await expect(composer).toHaveValue("");
  await expect(composer).toBeFocused();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 950 });

  const modify = comment.getByRole("button", { name: "Modifier", exact: true });
  const remove = comment.getByRole("button", {
    name: "Supprimer",
    exact: true,
  });
  await modify.click();
  const editing = page.getByLabel("Modifier votre commentaire");
  const save = comment.getByRole("button", {
    name: "Enregistrer",
    exact: true,
  });
  await expect(editing).toBeFocused();
  await expect(save).toBeDisabled();
  await editing.fill("Un brouillon à abandonner.");
  await comment.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(modify).toBeFocused();
  await expect(comment.locator(".comment-content > p")).toHaveText(body);
  await modify.click();
  await expect(editing).toHaveValue(body);
  await editing.fill("Et cette petite arche !");
  fixture.failNextComment("edit");
  await editing.press("Meta+Enter");
  await expect(comment.getByRole("alert")).toHaveText(
    "Votre commentaire n’a pas pu être modifié. Réessayez.",
  );
  await expect(editing).toHaveValue("Et cette petite arche !");
  await expect(editing).toBeFocused();
  await save.click();
  await expect(modify).toBeFocused();
  await expect(comment.locator(".comment-content > p")).toHaveText(
    "Et cette petite arche !",
  );
  await expect(comment.locator("time")).toContainText("modifié");

  for (const width of [1440, 800, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    await page
      .locator("#comments")
      .evaluate((element) => element.scrollIntoView({ block: "start" }));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `/tmp/clik-comments-${info.project.name}-${width}.png`,
    });
  }

  await remove.click();
  const confirm = comment.getByRole("button", {
    name: "Confirmer la suppression",
    exact: true,
  });
  await expect(confirm).toBeFocused();
  await comment.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(remove).toBeFocused();
  await expect(comment).toHaveCount(1);
  await remove.click();
  fixture.failNextComment("remove");
  await confirm.click();
  await expect(comment.getByRole("alert")).toHaveText(
    "Votre commentaire n’a pas pu être supprimé. Réessayez.",
  );
  await expect(confirm).toBeFocused();
  await expect(comment).toHaveCount(1);
  await confirm.click();
  await expect(comment).toHaveCount(0);
  await expect(composer).toBeFocused();
});

test("commentaires publics : retour à la conversation depuis la connexion", async ({
  page,
}) => {
  await creatorsFixture(page);
  await page.goto("/creations/creation-0");
  await page.getByRole("link", { name: "Se connecter pour commenter" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(
    page.getByRole("heading", { name: "Heureux de vous retrouver" }),
  ).toBeVisible();
  const returnTo = await page.evaluate(() =>
    sessionStorage.getItem("clik-return-to"),
  );
  expect(returnTo).toBe("/creations/creation-0#comments");
  await page.goto(returnTo!);
  await expect(page.locator("#comments")).toBeInViewport();
  await expect(page.locator(".comment-content > p")).toHaveText(
    "Une très belle idée !",
  );
});
