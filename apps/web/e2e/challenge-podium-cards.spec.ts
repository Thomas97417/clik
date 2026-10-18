import { expect, test } from "@playwright/test";
import { challengeDay } from "@clik/scene";
import { challengeFixture } from "./fixtures/challenges";

const day = () => challengeDay(Date.now() - 2 * 86400000);

test("podium : cartes or, argent et bronze, reflets au survol et votes accessibles", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const fixture = await challengeFixture(page, {
    day: day(),
    rewardPhase: "complete",
    podiumRanks: [1, 2, 3, null],
    thumbnails: true,
  });
  const response = await page.goto(`/challenges?date=${day()}&sort=recent`);
  expect(await response!.text()).toContain("challenge-podium-badge");
  const cards = page.locator(".challenge-entry");
  await expect(cards).toHaveCount(4);
  await expect(cards.first().getByRole("button")).toBeEnabled();
  await expect(page.locator(".challenge-podium-card")).toHaveCount(3);
  for (const [index, label] of [
    "1er · Or",
    "2e · Argent",
    "3e · Bronze",
  ].entries())
    await expect(
      cards.nth(index).locator(".challenge-podium-badge"),
    ).toContainText(label);
  await expect(cards.nth(3).locator(".challenge-podium-badge")).toHaveCount(0);
  const holo = page.locator(".challenge-podium-card").first();
  await holo.scrollIntoViewIfNeeded();
  await expect(holo).toHaveAttribute("data-ready", "");
  await expect(holo.locator("canvas")).toHaveCSS("pointer-events", "none");
  await expect(
    cards.first().getByRole("link", { name: "Créateur 1", exact: true }),
  ).toHaveAttribute("href", "/gallery/user/author-0");
  const bounds = (await holo.boundingBox())!;
  await holo.hover({
    position: { x: bounds.width * 0.8, y: bounds.height * 0.2 },
  });
  await expect
    .poll(() =>
      holo.locator(":scope > div").evaluate((element) => {
        const matrix = new DOMMatrix(getComputedStyle(element).transform);
        return Math.abs(matrix.m13) + Math.abs(matrix.m23);
      }),
    )
    .toBeGreaterThan(0.01);
  await page.locator(".creation-grid").screenshot({
    path: `/private/tmp/clik-challenge-podium-${info.project.name}.png`,
  });
  await page.mouse.move(0, 0);
  await page.setViewportSize({ width: 1440, height: 600 });
  await page.getByRole("heading", { level: 1 }).scrollIntoViewIfNeeded();
  await expect(holo.locator("canvas")).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await holo.scrollIntoViewIfNeeded();
  await expect(holo).toHaveAttribute("data-ready", "");
  fixture.holdVotes(true);
  const vote = cards.first().getByRole("button");
  await vote.click();
  await expect(vote).toHaveAttribute("aria-pressed", "true");
  await expect(cards.first().locator(".challenge-vote-count")).toHaveText("1");
  await expect(cards.first()).toHaveAttribute("data-podium-rank", "1");
  fixture.holdVotes(false);
  await cards
    .first()
    .getByRole("link", { name: /commentaires sur/ })
    .click();
  await expect(page).toHaveURL(/\/creations\/entry-0#comments$/);
  expect(errors).toEqual([]);
});

test("podium : les ex æquo gardent leur distinction après tri et sur mobile", async ({
  page,
}, info) => {
  await challengeFixture(page, {
    day: day(),
    rewardPhase: "complete",
    podiumRanks: [1, 1, 3, null],
    thumbnails: true,
  });
  await page.goto(`/challenges?date=${day()}`);
  await expect(page.locator(".challenge-entry h3").first()).toHaveText(
    "Le robot du jour",
  );
  await expect(page.locator('[data-podium-rank="1"]')).toHaveCount(2);
  await expect(page.locator('[data-podium-rank="2"]')).toHaveCount(0);
  await expect(page.locator('[data-podium-rank="3"]')).toHaveCount(1);
  const sort = page.getByRole("combobox", { name: "Trier", exact: true });
  await sort.click();
  await page.getByRole("option", { name: "Récentes", exact: true }).click();
  await expect(page.locator(".challenge-entry h3").first()).toHaveText(
    "Le petit phare",
  );
  await expect(page.locator('[data-podium-rank="1"]')).toHaveCount(2);
  for (const width of [641, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const first = page.locator(".challenge-podium-card").first();
    await first.scrollIntoViewIfNeeded();
    await expect(first.locator(".challenge-podium-badge")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await first.screenshot({
      path: `/private/tmp/clik-challenge-podium-${width}-${info.project.name}.png`,
    });
  }
});

test("podium : réduction des animations et vote au clavier", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await challengeFixture(page, {
    day: day(),
    rewardPhase: "complete",
    podiumRanks: [1, 2, 3, null],
  });
  await page.goto(`/challenges?date=${day()}&sort=recent`);
  const holo = page.locator(".challenge-podium-card").first();
  await holo.scrollIntoViewIfNeeded();
  await expect(holo).toHaveAttribute("data-ready", "");
  const bounds = (await holo.boundingBox())!;
  await holo.hover({
    position: { x: bounds.width * 0.9, y: bounds.height * 0.1 },
  });
  expect(
    await holo.locator(":scope > div").evaluate((element) => {
      const matrix = new DOMMatrix(getComputedStyle(element).transform);
      return Math.abs(matrix.m13) + Math.abs(matrix.m23);
    }),
  ).toBe(0);
  const vote = holo.getByRole("button");
  await vote.focus();
  await vote.press("Space");
  await expect(vote).toHaveAttribute("aria-pressed", "true");
});

test("podium : la carte et ses actions restent disponibles sans WebGL", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: any[]
    ) {
      return type.includes("webgl")
        ? null
        : (getContext as any).call(this, type, ...args);
    } as typeof getContext;
  });
  await challengeFixture(page, {
    day: day(),
    rewardPhase: "complete",
    podiumRanks: [1, 2, 3, null],
  });
  await page.goto(`/challenges?date=${day()}&sort=recent`);
  const card = page.locator('[data-podium-rank="1"]');
  await card.scrollIntoViewIfNeeded();
  await expect(card.locator(".challenge-podium-badge")).toBeVisible();
  const vote = card.getByRole("button");
  await vote.click();
  await expect(vote).toHaveAttribute("aria-pressed", "true");
});

test("podium : aucune carte holographique avant la fin de l’attribution", async ({
  page,
}) => {
  await challengeFixture(page, {
    day: day(),
    rewardPhase: "processing",
    podiumRanks: [1, 2, 3, null],
  });
  await page.goto(`/challenges?date=${day()}&sort=recent`);
  await expect(page.locator(".challenge-entry")).toHaveCount(4);
  await expect(page.locator(".challenge-podium-card")).toHaveCount(0);
});
