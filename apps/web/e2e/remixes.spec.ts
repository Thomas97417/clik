import { test, expect } from "@playwright/test";
import { creatorsFixture } from "./fixtures/creators";

test("reprises : pagination, repli au clavier, retrait et navigation", async ({
  page,
}, info) => {
  const fixture = await creatorsFixture(page);
  for (let i = 1; i <= 8; i++) fixture.setOrigin(`creation-${i}`, "creation-0");
  fixture.setPublished("creation-8", false);
  await page.goto("/creations/creation-0");
  const section = page.getByRole("region", {
    name: "À partir de cette création",
  });
  const toggle = section.getByRole("button", {
    name: "À partir de cette création",
  });
  const cards = section.locator(".public-creation-card");
  await expect(cards).toHaveCount(6);
  await expect(cards.first().getByRole("heading")).toHaveText(
    "Le petit phare 2",
  );
  await section.getByRole("button", { name: "Voir plus de versions" }).click();
  await expect(cards).toHaveCount(7);
  await expect(
    section.getByRole("button", { name: "Voir plus de versions" }),
  ).toHaveCount(0);
  await toggle.focus();
  await toggle.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(cards.first()).toBeHidden();
  await toggle.press("Space");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(cards).toHaveCount(7);
  await expect(cards.last()).toBeVisible();
  fixture.setPublished("creation-8", true);
  await expect(cards).toHaveCount(8);
  fixture.setPublished("creation-2", false);
  await expect(cards).toHaveCount(7);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    await toggle.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `/tmp/clik-remixes-${info.project.name}-${width}.png`,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await cards
    .first()
    .getByRole("link", { name: "Voir Le petit phare 2" })
    .click();
  await expect(page).toHaveURL(/\/creations\/creation-1$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Le petit phare 2",
  );
  await expect(
    section.getByText("La prochaine version pourrait être la vôtre."),
  ).toBeVisible();
  await toggle.click();
  await expect(
    section.getByText("La prochaine version pourrait être la vôtre."),
  ).toBeHidden();
});
