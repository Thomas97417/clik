import { selectCameraView } from "./camera-view";
import { test, expect } from "@playwright/test";

test("participer : créer, proposer et mettre à jour la même création", async ({
  page,
}) => {
  const { challengeFixture } = await import("./fixtures/challenges");
  const fixture = await challengeFixture(page);
  await page.goto("/challenges");
  await page.getByRole("button", { name: "Participer au défi" }).click();
  await expect(page).toHaveURL(/\/editor\/project$/);
  await expect(page.locator(".piece-card")).toHaveCount(12);
  await page.locator('.piece-card[aria-label="Brique 2 × 4"]').click();
  await expect(page.locator("canvas").first()).toHaveAttribute(
    "data-rendered",
    "1",
  );
  await page.getByRole("button", { name: "Proposer au défi" }).click();
  await page.getByLabel("Titre", { exact: true }).fill("Mon phare du jour");
  await page.getByRole("button", { name: "Valider ma participation" }).click();
  await expect(page).toHaveURL(/\/creations\/own-entry$/);
  expect(fixture.uploads).toHaveLength(1);
  const firstThumbnail = fixture.uploads[0].bytes.$bytes;
  const png = Buffer.from(firstThumbnail, "base64");
  expect(png.readUInt32BE(16)).toBe(640);
  expect(png.readUInt32BE(20)).toBe(480);
  const pixels = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    return {
      cornerAlpha: data[3],
      visiblePixels: data.filter((value, i) => i % 4 === 3 && value > 0).length,
    };
  }, firstThumbnail);
  expect(pixels.cornerAlpha).toBe(0);
  expect(pixels.visiblePixels).toBeGreaterThan(1000);
  await expect(
    page.getByRole("heading", { name: "Mon phare du jour" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Voter pour cette création (0)" }),
  ).toBeDisabled();
  await page.locator(".creation-challenge").getByRole("link").click();
  await page.getByRole("button", { name: "Reprendre ma création" }).click();
  await page.getByRole("button", { name: "Grille", exact: true }).click();
  await selectCameraView(page, "top");
  await page.getByLabel("Angle de l’éclairage").press("End");
  await page.getByLabel("Angle de l’éclairage").press("ArrowLeft");
  await expect(page.locator("canvas").first()).toHaveAttribute(
    "data-rendered",
    "1",
  );
  await page
    .getByRole("button", { name: "Mettre à jour ma participation" })
    .click();
  await page
    .getByLabel("Titre", { exact: true })
    .fill("Mon phare, deuxième version");
  await page.getByRole("button", { name: "Valider ma participation" }).click();
  await expect(page).toHaveURL(/\/creations\/own-entry$/);
  expect(fixture.uploads).toHaveLength(2);
  expect(fixture.uploads[1].bytes.$bytes).toBe(firstThumbnail);
  await expect(
    page.getByRole("heading", { name: "Mon phare, deuxième version" }),
  ).toBeVisible();
});

test("défi du jour : lot commun, calendrier UTC et navigation mobile", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/challenges?date=2020-01-01");
  await expect(
    page.getByRole("heading", { name: "Aucun défi à cette date." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Aujourd’hui", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Le défi du jour.",
  );
  await expect(page.locator(".challenge-stock-card")).toHaveCount(12);
  const quantities = await page
    .locator(".challenge-stock-card > span")
    .allTextContents();
  expect(
    quantities.reduce((sum, text) => sum + Number(text.replace(/\D/g, "")), 0),
  ).toBe(100);
  await expect(page.locator(".challenge-time")).toContainText("restantes");
  await expect(
    page.getByRole("link", { name: "Se connecter pour participer" }),
  ).toBeVisible();
  await expect(page.locator(".challenge-stock-card img")).toHaveCount(12);
  await page.screenshot({
    path: `/tmp/clik-challenges-${info.project.name}.png`,
  });
  await page.getByRole("button", { name: /\d+ .* \d{4}/ }).click();
  await expect(
    page.getByRole("dialog", { name: "Choisir la date du défi" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Choisir la date du défi" }),
  ).not.toBeVisible();
  for (const width of [900, 641, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "Les défis" }),
    ).toBeInViewport();
  }
  await page.screenshot({
    path: `/tmp/clik-challenges-mobile-${info.project.name}.png`,
  });
  await page
    .getByRole("link", { name: "Se connecter pour participer" })
    .click();
  await expect(page).toHaveURL(/\/sign-in$/);
  expect(
    await page.evaluate(() => sessionStorage.getItem("clik-return-to")),
  ).toBe("/challenges");
  await expect(page.locator('input[type="email"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test("stock dans l’éditeur : clic, duplication, suppression et annulation", async ({
  page,
}, info) => {
  await page.goto("/editor");
  await expect(page.locator("canvas").first()).toHaveAttribute(
    "data-rendered",
    "0",
  );
  // Inject only the challenge context; exercise the real library and store thereafter.
  await page.evaluate(async () => {
    const { useEditor } = await import(
      /* @vite-ignore */ "/src/lib/clik/" + "store.ts"
    );
    useEditor.setState({
      challenge: {
        stock: [{ type: "brick-1x1", quantity: 2 }],
        closesAt: Date.now() + 3600000,
        serverOffset: 0,
      },
    });
  });
  const brick = page.locator('.piece-card[aria-label="Brique 1 × 1"]');
  await expect(page.locator(".piece-card")).toHaveCount(1);
  await brick.click();
  await expect(brick).toContainText("1 restante");
  await page.getByRole("button", { name: "Dupliquer", exact: true }).click();
  await expect(brick).toBeDisabled();
  await expect(page.locator("canvas").first()).toHaveAttribute(
    "data-rendered",
    "2",
  );
  await page.getByRole("button", { name: "Dupliquer", exact: true }).click();
  await expect(
    page.getByText(/stock limité à 2 exemplaires/).first(),
  ).toBeVisible();
  await expect(page.locator("canvas").first()).toHaveAttribute(
    "data-rendered",
    "2",
  );
  await page.getByRole("button", { name: "Supprimer", exact: true }).click();
  await expect(brick).toBeEnabled();
  await page
    .getByRole("button", { name: "Annuler (⌘/Ctrl Z)", exact: true })
    .click();
  await expect(brick).toBeDisabled();
  await page.screenshot({
    path: `/tmp/clik-challenge-editor-${info.project.name}.png`,
  });
  await page.evaluate(async () => {
    const { useEditor } = await import(
      /* @vite-ignore */ "/src/lib/clik/" + "store.ts"
    );
    const current = useEditor.getState().challenge!;
    useEditor.setState({
      challenge: { ...current, closesAt: Date.now() - 1000 },
    });
  });
  await expect(page.getByLabel("Nom du projet")).toBeDisabled();
  await page.reload();
  await expect(page.locator(".piece-card")).toHaveCount(63);
});

test("tri des participations : souris, clavier et menu mobile", async ({
  page,
}, info) => {
  const { challengeFixture } = await import("./fixtures/challenges");
  await challengeFixture(page);
  await page.goto("/challenges");
  const sort = page.getByRole("combobox", { name: "Trier" });
  const titles = page.locator(".challenge-entry h3");
  await expect(sort).toHaveText("Récentes");
  await expect(titles.first()).toHaveText("Le petit phare");
  await sort.click();
  await page.getByRole("option", { name: "Les plus aimées" }).click();
  await expect(sort).toHaveText("Les plus aimées");
  await expect(titles.first()).toHaveText("Le robot du jour");

  await sort.focus();
  await sort.press("Enter");
  await page.keyboard.press("Home");
  await page.keyboard.press("Enter");
  await expect(sort).toHaveText("Récentes");
  await expect(titles.first()).toHaveText("Le petit phare");
  await expect(sort).toBeFocused();

  await sort.press("Enter");
  await page.keyboard.press("End");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toBeHidden();
  await expect(sort).toHaveText("Récentes");

  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await sort.click();
    const menu = page.getByRole("listbox");
    await expect(menu).toBeVisible();
    const bounds = await menu.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `/tmp/clik-challenge-sort-${info.project.name}-${width}.png`,
    });
    await page.getByRole("option", { name: "Récentes", exact: true }).click();
  }
});

test("participations : trois coups de cœur, changement de vote et commentaires", async ({
  page,
}, info) => {
  const { challengeFixture } = await import("./fixtures/challenges");
  await challengeFixture(page);
  await page.goto("/challenges");
  await expect(
    page.getByRole("button", { name: "Compte de Camille" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Défi précédent" }).click();
  await expect(page.locator(".challenge-time")).toHaveText(
    "Participations closes",
  );
  await expect(
    page.getByRole("button", { name: "Participer au défi" }),
  ).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "Trier" })).toHaveText(
    "Les plus aimées",
  );
  await page.getByRole("button", { name: "Aujourd’hui", exact: true }).click();
  await expect(page.locator(".challenge-time")).toContainText("restantes");
  const cards = page.locator(".challenge-entry");
  await expect(cards).toHaveCount(4);
  for (let i = 0; i < 3; i++)
    await cards
      .nth(i)
      .getByRole("button", { name: /Voter pour cette création/ })
      .click();
  await expect(
    page.getByText("3 / 3 votes attribués pour ce défi.", { exact: false }),
  ).toBeVisible();
  await expect(cards.nth(3).getByRole("button")).toBeDisabled();
  await cards
    .nth(0)
    .getByRole("button", { name: /Retirer mon vote/ })
    .click();
  await expect(cards.nth(3).getByRole("button")).toBeEnabled();
  await cards.nth(3).getByRole("button").click();
  await cards
    .nth(0)
    .getByRole("link", { name: "Le petit phare", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Le petit phare" }),
  ).toBeVisible();
  await page
    .getByLabel("Votre commentaire", { exact: true })
    .fill("J’aime beaucoup les couleurs !");
  await page.getByRole("button", { name: "Publier le commentaire" }).click();
  await expect(page.locator(".comment-content > p")).toHaveText(
    "J’aime beaucoup les couleurs !",
  );
  await page.getByRole("button", { name: "Modifier", exact: true }).click();
  await page
    .getByLabel("Modifier votre commentaire")
    .fill("Et cette petite arche !");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.locator(".comment-content > p")).toHaveText(
    "Et cette petite arche !",
  );
  await expect(page.locator(".comment time")).toContainText("modifié");
  await page.locator("#comments").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `/tmp/clik-challenge-comments-${info.project.name}.png`,
  });
  await page.getByRole("button", { name: "Supprimer", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirmer la suppression", exact: true })
    .click();
  await expect(page.locator(".comment")).toHaveCount(0);
});
