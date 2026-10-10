import { expect, test } from "@playwright/test";
import { creatorsFixture } from "./fixtures/creators";

for (const timezoneId of ["Europe/Paris", "America/New_York"]) {
  test.describe(`création dans le fuseau ${timezoneId}`, () => {
    test.use({ timezoneId });

    test("dates identiques en SSR et après hydratation, même près de minuit", async ({
      page,
    }) => {
      await creatorsFixture(page, false, {
        now: Date.parse("2026-10-09T22:30:00Z"),
      });
      const hydrationErrors: string[] = [];
      page.on("console", (message) => {
        if (
          (message.type() === "error" || message.type() === "warning") &&
          /hydrat/i.test(message.text())
        )
          hydrationErrors.push(message.text());
      });
      page.on("pageerror", (error) => hydrationErrors.push(error.message));
      const response = await page.goto("/creations/creation-0");
      const html = await response!.text();
      expect(html).toContain('title="10/10/2026 00:30:00"');
      expect(html).toContain("10 octobre 2026");

      await expect(page.locator(".creation-remixes-toggle")).toBeEnabled();
      await expect(page.locator(".publication-date time")).toHaveText(
        "10 octobre 2026",
      );
      await expect(page.locator(".comment time")).toHaveAttribute(
        "dateTime",
        "2026-10-09T22:30:00.000Z",
      );
      await expect(page.locator(".comment time")).toHaveAttribute(
        "title",
        "10/10/2026 00:30:00",
      );
      await expect(page.locator(".comment time")).toHaveText("10 oct. 2026");
      expect(hydrationErrors).toEqual([]);
    });
  });
}

test("création : une seule zone de défilement, header et footer accessibles", async ({
  page,
}, info) => {
  await creatorsFixture(page);
  await page.goto("/creations/creation-0");
  await expect(page.locator(".creation-remixes-toggle")).toBeEnabled();

  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    const layout = () =>
      page.evaluate(() => ({
        documentOverflows:
          document.documentElement.scrollHeight > innerHeight ||
          document.body.scrollHeight > innerHeight,
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
        verticalScrollers: Array.from(document.querySelectorAll("body *"))
          .filter((element) => {
            const { overflowY } = getComputedStyle(element);
            return (
              /auto|scroll/.test(overflowY) &&
              element.scrollHeight > element.clientHeight
            );
          })
          .map((element) => element.classList[0]),
        windowScroll: scrollY,
      }));
    await expect.poll(layout).toEqual({
      documentOverflows: false,
      horizontalOverflow: false,
      verticalScrollers: ["page-scroll"],
      windowScroll: 0,
    });

    await page.locator(".site-footer").scrollIntoViewIfNeeded();
    await expect(page.locator(".site-footer")).toBeInViewport();
    await expect(page.locator(".site-header")).toBeInViewport();
    await expect
      .poll(() =>
        page.locator(".page-scroll").evaluate((element) => element.scrollTop),
      )
      .toBeGreaterThan(0);
    await expect.poll(layout).toEqual({
      documentOverflows: false,
      horizontalOverflow: false,
      verticalScrollers: ["page-scroll"],
      windowScroll: 0,
    });
    await page.screenshot({
      path: `/tmp/clik-creation-scroll-${info.project.name}-${width}.png`,
    });
  }
});
