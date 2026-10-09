import { test, expect, type Page, type Request } from "@playwright/test";
import { creatorsFixture } from "./fixtures/creators";
import { projectsFixture } from "./fixtures/projects";

function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

async function holdPublicData(page: Page, kind: "gallery" | "creator") {
  const response = gate();
  const requested = gate();
  await page.route("**/api/public?*", async (route) => {
    const input = JSON.parse(
      new URL(route.request().url()).searchParams.get("input")!,
    );
    if (input.kind !== kind) return route.fallback();
    requested.release();
    await response.promise;
    await route.fallback();
  });
  return { requested: requested.promise, release: response.release };
}

function isSessionCheck(request: Request) {
  const path = new URL(request.url()).pathname;
  return (
    path.startsWith("/_serverFn/") &&
    Buffer.from(path.split("/").pop()!, "base64url")
      .toString()
      .includes("getAuth_createServerFn_handler")
  );
}

async function checkSkeletonLayout(page: Page, name: string) {
  await expect(
    page.getByRole("status", { name: "Chargement des créations" }),
  ).toBeVisible();
  await expect(page.locator(".creation-card-skeleton")).toHaveCount(6);
  for (const [width, columns] of [
    [1440, 3],
    [800, 2],
    [390, 1],
    [320, 1],
  ]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(() =>
        page
          .locator(".creation-grid")
          .evaluate(
            (grid) =>
              getComputedStyle(grid).gridTemplateColumns.split(" ").length,
          ),
      )
      .toBe(columns);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const thumbnail = (await page
      .locator(".creation-card-skeleton > [data-slot=skeleton]")
      .first()
      .boundingBox())!;
    expect(thumbnail.width / thumbnail.height).toBeCloseTo(4 / 3, 1);
    if (width === 1440 || width === 390)
      await page.screenshot({
        path: `/private/tmp/clik-${name}-skeleton-${width}.png`,
      });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      page
        .locator("[data-slot=skeleton]")
        .first()
        .evaluate((skeleton) => getComputedStyle(skeleton).animationName),
    )
    .toBe("none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 1000 });
}

test("la galerie affiche son en-tête et ses skeletons avant la réponse des créations", async ({
  page,
}, info) => {
  await creatorsFixture(page);
  await page.goto("/terms");
  await expect(page.locator(".header-sign-in")).toBeVisible();
  const loading = await holdPublicData(page, "gallery");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page
      .locator(".site-header")
      .getByRole("link", { name: "La galerie", exact: true })
      .click();
    await loading.requested;
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "La galerie.",
    );
    await expect(
      page.getByRole("combobox", { name: "Trier par" }),
    ).toBeDisabled();
    await expect(page.locator(".gallery-empty")).toHaveCount(0);
    await checkSkeletonLayout(page, `gallery-${info.project.name}`);
  } finally {
    loading.release();
  }
  await expect(page.locator(".public-creation-card")).toHaveCount(12);
  await expect(page.locator("[data-slot=skeleton]")).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "Trier par" })).toBeEnabled();
  expect(errors).toEqual([]);
});

test("ma page publique affiche ses skeletons avant le profil et sa liste vide", async ({
  page,
}, info) => {
  await creatorsFixture(page, true);
  await page.goto("/terms");
  await expect(
    page.getByRole("button", { name: "Compte de Camille" }),
  ).toBeVisible();
  const loading = await holdPublicData(page, "creator");
  try {
    await page.getByRole("button", { name: "Compte de Camille" }).click();
    await page
      .getByRole("menuitem", { name: "Ma page publique", exact: true })
      .click();
    await loading.requested;
    await expect(page.locator(".creator-heading")).toBeVisible();
    await expect(
      page.getByText("Créations publiques", { exact: true }),
    ).toBeVisible();
    await expect(page.locator(".creator-empty")).toHaveCount(0);
    await expect(
      page.locator(".creator-avatar [data-slot=skeleton]"),
    ).toBeVisible();
    await checkSkeletonLayout(page, `creator-${info.project.name}`);
  } finally {
    loading.release();
  }
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Camille.");
  await expect(
    page.getByRole("heading", {
      name: "Aucune création publique pour le moment.",
    }),
  ).toBeVisible();
  await expect(page.locator("[data-slot=skeleton]")).toHaveCount(0);
});

test("mes créations affichent leurs skeletons pendant la vérification de session et la connexion aux données", async ({
  page,
}, info) => {
  await projectsFixture(page);
  const authentication = gate();
  const token = gate();
  const tokenRequested = gate();
  const checked = gate();
  await page.route("**/api/auth/convex/token*", async (route) => {
    tokenRequested.release();
    await token.promise;
    await route.fallback();
  });
  await page.goto("/terms");
  await tokenRequested.promise;
  await page.route("**/_serverFn/**", async (route) => {
    if (!isSessionCheck(route.request())) return route.fallback();
    checked.release();
    await authentication.promise;
    await route.fallback();
  });
  try {
    await page
      .locator(".site-header")
      .getByRole("link", { name: "Mes créations", exact: true })
      .click();
    await checked.promise;
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Mes créations.",
    );
    await expect(
      page.getByRole("group", { name: "Filtrer les créations" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Toutes", exact: true }),
    ).toBeDisabled();
    await expect(page.locator(".project-card")).toHaveCount(0);
    await expect(page.locator(".projects-empty")).toHaveCount(0);
    await checkSkeletonLayout(page, `projects-${info.project.name}`);
    authentication.release();
    await expect(
      page.getByRole("button", { name: "Toutes", exact: true }),
    ).toBeEnabled();
    await expect(page.locator(".creation-card-skeleton")).toHaveCount(6);
    await expect(page.locator(".project-card")).toHaveCount(0);
  } finally {
    authentication.release();
    token.release();
  }
  await expect(page.locator(".project-card")).toHaveCount(2);
  await expect(page.locator("[data-slot=skeleton]")).toHaveCount(0);
});
