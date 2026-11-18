import { expect, test } from "@playwright/test";
import { creatorsFixture } from "./fixtures/creators";
import { projectsFixture } from "./fixtures/projects";

for (const path of ["/gallery", "/projects"] as const) {
  test(`le retour vers ${path} restaure les lots et le défilement`, async ({
    page,
  }) => {
    const personal = path === "/projects";
    if (personal) await projectsFixture(page, { privateCount: 37 });
    else await creatorsFixture(page, false, { publicationCount: 39 });
    await page.goto(path);
    const cards = page.locator(
      personal ? ".project-card" : ".public-creation-card",
    );
    const online = page.getByRole("button", { name: "En ligne", exact: true });
    const more = page.getByRole("button", { name: "Voir plus de créations" });
    await expect(cards).toHaveCount(12);
    if (personal) {
      await online.click();
      await expect(online).toHaveAttribute("aria-pressed", "true");
    }
    for (const count of [24, 36]) {
      await more.click();
      await expect(cards).toHaveCount(count);
    }
    const titles = await cards.getByRole("heading").allTextContents();
    const link = cards
      .nth(32)
      .getByRole("link", { name: /^(Ouvrir|Voir) / })
      .first();
    await link.evaluate((element) =>
      element.scrollIntoView({ block: "center" }),
    );
    const scrollTop = () =>
      page.locator(".page-scroll").evaluate((element) => element.scrollTop);
    const position = await scrollTop();
    expect(position).toBeGreaterThan(1500);
    await link.click();
    await expect(page).toHaveURL(personal ? /\/editor\// : /\/creations\//);
    await page.goBack();
    await expect(cards.getByRole("heading")).toHaveText(titles);
    if (personal) await expect(online).toHaveAttribute("aria-pressed", "true");
    await expect
      .poll(async () => Math.abs((await scrollTop()) - position))
      .toBeLessThan(2);
    await more.click();
    await expect(cards).toHaveCount(39);

    // A new visit from the header starts its own history entry.
    await link.click();
    await page
      .getByRole("navigation", { name: "Navigation principale" })
      .getByRole("link", {
        name: personal ? "Mes créations" : "La galerie",
        exact: true,
      })
      .click();
    await expect(cards).toHaveCount(12);
    await expect.poll(scrollTop).toBe(0);
    if (personal) await expect(online).toHaveAttribute("aria-pressed", "false");
  });
}
