import { expect, test } from "@playwright/test";
import { challengeFixture } from "./fixtures/challenges";
import { creatorsFixture } from "./fixtures/creators";

test("envoi en cours : destinataire stable et repli respecté jusqu’à confirmation", async ({
  page,
}) => {
  const fixture = await challengeFixture(page);
  const rootId = fixture.seedComment({
    owner: "bob",
    author: "Bob",
    body: "Une question",
  });
  fixture.seedComment({
    owner: "alice",
    author: "Alice",
    replyToId: rootId,
    body: "Un premier avis",
  });
  fixture.holdReplies(true);
  await page.goto("/creations/entry-0#comments");
  const discussion = page.locator(`[data-thread-id="${rootId}"]`);
  const replyToBob = discussion.getByRole("button", {
    name: "Répondre à Bob",
    exact: true,
  });
  await replyToBob.click();
  const field = discussion.getByLabel("Votre réponse à Bob", { exact: true });
  await field.fill("Une réponse en cours d’envoi.");
  await discussion
    .getByRole("button", { name: "Publier la réponse", exact: true })
    .click();
  await expect(field).toBeDisabled();
  await expect(replyToBob).toBeDisabled();
  await expect(
    discussion.getByRole("button", { name: "Répondre à Alice", exact: true }),
  ).toBeDisabled();
  await expect(
    discussion.getByRole("button", { name: "Envoi…", exact: true }),
  ).toBeDisabled();
  const toggle = discussion.locator(".comment-thread-toggle");
  await toggle.click();
  await expect(field).toBeHidden();
  fixture.holdReplies(false);
  await expect(toggle).toHaveText("Voir 2 réponses");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  const replies = discussion.locator(".comment-replies .comment");
  await expect(replies).toHaveCount(2);
  await expect(replies.last().locator(".comment-content > p")).toHaveText(
    "Une réponse en cours d’envoi.",
  );
  await expect(replies.last()).toBeFocused();
  await expect(replyToBob).toBeEnabled();
});

test("réponses : erreur récupérable, brouillon conservé au repli et réponse à une réponse", async ({
  page,
}, info) => {
  const fixture = await challengeFixture(page);
  const rootId = fixture.seedComment({
    owner: "bob",
    author: "Bob",
    body: "Comment avez-vous construit le toit ?",
  });
  await page.goto("/creations/entry-0#comments");
  const discussion = page.locator(`[data-thread-id="${rootId}"]`);
  const root = discussion.locator(`#comment-${rootId}`);
  await root
    .getByRole("button", { name: "Répondre à Bob", exact: true })
    .click();
  const field = discussion.getByLabel("Votre réponse à Bob", { exact: true });
  const publish = discussion.getByRole("button", {
    name: "Publier la réponse",
    exact: true,
  });
  await expect(field).toBeFocused();
  await expect(publish).toBeDisabled();
  await field.fill("   ");
  await expect(publish).toBeDisabled();
  const body = "Avec une charnière.\nOn peut ouvrir le toit !";
  await field.fill(body);
  fixture.failNextComment("add");
  await field.press("Control+Enter");
  await expect(discussion.getByRole("alert")).toHaveText(
    "Votre réponse n’a pas pu être publiée. Réessayez.",
  );
  await expect(field).toHaveValue(body);
  await expect(field).toBeFocused();
  await expect(discussion.locator(".comment-replies .comment")).toHaveCount(0);
  await publish.click();
  const replies = discussion.locator(".comment-replies .comment");
  await expect(replies).toHaveCount(1);
  await expect(replies.first().locator(".comment-content > p")).toHaveText(
    body,
  );
  await expect(replies.first()).toBeFocused();
  await expect(page.locator(".comments-heading h2")).toContainText("2");
  await expect(page.locator(".comment-discussion")).toHaveCount(1);

  const toggle = discussion.locator(".comment-thread-toggle");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await toggle.focus();
  await toggle.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(replies.first()).toBeHidden();
  await expect(root).toBeVisible();
  await toggle.press("Space");
  await expect(replies.first()).toBeVisible();
  await expect(toggle).toBeFocused();
  const answer = replies
    .first()
    .getByRole("button", { name: "Répondre à Camille", exact: true });
  await answer.click();
  const followup = discussion.getByLabel("Votre réponse à Camille", {
    exact: true,
  });
  await expect(followup).toBeFocused();
  await followup.fill("Un brouillon à garder en repliant.");
  await toggle.click();
  await expect(followup).toBeHidden();
  await expect(toggle).toHaveText("Voir 1 réponse");
  await toggle.click();
  await expect(followup).toHaveValue("Un brouillon à garder en repliant.");
  await discussion
    .locator(".comment-reply-form")
    .getByRole("button", { name: "Annuler", exact: true })
    .click();
  await expect(answer).toBeFocused();
  await answer.click();
  await followup.fill("Merci pour cette explication !");
  await followup.press("Meta+Enter");
  await expect(replies).toHaveCount(2);
  await expect(replies.last().locator(".comment-reply-context")).toHaveText(
    "En réponse à Camille",
  );
  await expect(replies.last()).toBeFocused();
  await expect(page.locator(".comments-heading h2")).toContainText("3");
  await expect(page.locator(".comment-discussion")).toHaveCount(1);
  await expect(
    root.getByRole("button", { name: "Modifier", exact: true }),
  ).toHaveCount(0);
  await expect(
    replies.first().getByRole("button", { name: "Modifier", exact: true }),
  ).toBeVisible();

  for (const width of [1440, 800, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    await replies
      .last()
      .getByRole("button", { name: "Répondre à Camille", exact: true })
      .click();
    await followup.fill("Une réponse qui reste lisible sur un écran étroit.");
    await expect(followup).toBeInViewport();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `/tmp/clik-comment-replies-${info.project.name}-${width}.png`,
    });
    await discussion
      .locator(".comment-reply-form")
      .getByRole("button", { name: "Annuler", exact: true })
      .click();
  }
});

test("discussions : chargement différé, pagination et mises à jour pendant le repli", async ({
  page,
}) => {
  const fixture = await challengeFixture(page);
  const rootId = fixture.seedComment({
    owner: "bob",
    author: "Bob",
    body: "Parlons de cette construction.",
  });
  for (let i = 0; i < 22; i++)
    fixture.seedComment({ replyToId: rootId, body: `Réponse ${i}` });
  await page.goto("/creations/entry-0#comments");
  const discussion = page.locator(`[data-thread-id="${rootId}"]`);
  const toggle = discussion.locator(".comment-thread-toggle");
  await expect(toggle).toBeEnabled();
  await expect(toggle).toHaveText("Voir 22 réponses");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(fixture.replyRequests).toEqual([]);
  await toggle.click();
  const replies = discussion.locator(".comment-replies .comment");
  await expect(replies).toHaveCount(20);
  await expect(replies.first().locator(".comment-content > p")).toHaveText(
    "Réponse 2",
  );
  await expect(replies.last().locator(".comment-content > p")).toHaveText(
    "Réponse 21",
  );
  await discussion
    .getByRole("button", { name: "Voir les réponses précédentes" })
    .click();
  await expect(replies).toHaveCount(22);
  await expect(replies.first().locator(".comment-content > p")).toHaveText(
    "Réponse 0",
  );
  await expect(
    discussion.getByRole("button", { name: "Voir les réponses précédentes" }),
  ).toHaveCount(0);
  await toggle.click();
  fixture.seedComment({
    replyToId: rootId,
    owner: "alice",
    author: "Alice",
    body: "Une réponse arrivée pendant le repli.",
  });
  await expect(toggle).toHaveText("Voir 23 réponses");
  await expect(replies.last()).toBeHidden();
  await toggle.click();
  await expect(replies).toHaveCount(23);
  await expect(replies.last().locator(".comment-content > p")).toHaveText(
    "Une réponse arrivée pendant le repli.",
  );
  await expect(page.locator(".comment-discussion")).toHaveCount(1);
});

test("suppression : le fil et les réponses des autres restent disponibles", async ({
  page,
}) => {
  const fixture = await challengeFixture(page);
  const rootId = fixture.seedComment({
    body: "Un commentaire initial à supprimer.",
  });
  fixture.seedComment({
    owner: "bob",
    author: "Bob",
    replyToId: rootId,
    body: "Une réponse à conserver.",
  });
  await page.goto("/creations/entry-0#comments");
  const discussion = page.locator(`[data-thread-id="${rootId}"]`);
  const root = discussion.locator(`#comment-${rootId}`);
  const toggle = discussion.locator(".comment-thread-toggle");
  await toggle.click();
  await root.getByRole("button", { name: "Supprimer", exact: true }).click();
  await expect(root.getByText("Les réponses seront conservées.")).toBeVisible();
  await root
    .getByRole("button", { name: "Confirmer la suppression", exact: true })
    .click();
  await expect(root.locator(".comment-content > p")).toHaveText(
    "Commentaire supprimé",
  );
  await expect(
    discussion.locator(".comment-replies .comment-content > p"),
  ).toHaveText("Une réponse à conserver.");
  await expect(toggle).toBeFocused();
  await expect(page.locator(".comments-heading h2")).toContainText("1");
  await root
    .getByRole("button", { name: "Répondre à la discussion", exact: true })
    .click();
  await discussion
    .getByLabel("Votre réponse à la discussion")
    .fill("On peut poursuivre la discussion.");
  await discussion
    .getByRole("button", { name: "Publier la réponse", exact: true })
    .click();
  await expect(discussion.locator(".comment-replies .comment")).toHaveCount(2);
  await expect(page.locator(".comments-heading h2")).toContainText("2");
});

test("réponse anonyme : connexion et retour au commentaire concerné", async ({
  page,
}) => {
  await creatorsFixture(page);
  await page.goto("/creations/creation-0");
  const root = page.locator("#comment-comment");
  await root.getByRole("link", { name: "Répondre à Bob", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(
    page.getByRole("heading", { name: "Heureux de vous retrouver" }),
  ).toBeVisible();
  const returnTo = await page.evaluate(() =>
    sessionStorage.getItem("clik-return-to"),
  );
  expect(returnTo).toBe("/creations/creation-0#comment-comment");
  await page.goto(returnTo!);
  await expect(root).toBeInViewport();
  await expect(root.locator(".comment-content > p")).toHaveText(
    "Une très belle idée !",
  );
});
