import { test, expect, type Page } from "@playwright/test";
import { Box3, Vector3 } from "three";
import {
  CATALOG,
  emptyScene,
  makePart,
  validateScene,
  worldMatrix,
  type SceneDocument,
  type Part,
} from "@clik/scene";
import { projectsFixture } from "./fixtures/projects";
import { challengeFixture } from "./fixtures/challenges";
import { creatorsFixture } from "./fixtures/creators";

async function seedLocal(page: Page) {
  const scene = {
    ...emptyScene(),
    nodes: [
      makePart("brick-2x2", "#f8cc36"),
      makePart("slope-2x2", "#ef4444", [0, 1.2, 0]),
    ],
  };
  await page.evaluate(
    async ({ scene, empty }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("clik", 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("drafts", "readwrite");
        const draft = {
          title: "Maison de poche",
          scene,
          revision: 0,
          stamp: "local-source",
          dirty: false,
          updatedAt: Date.now(),
        };
        tx.objectStore("drafts").put(draft, "guest:mini-house");
        tx.objectStore("drafts").put(
          { ...draft, title: "Projet vide", scene: empty },
          "guest:empty",
        );
        tx.objectStore("drafts").put(
          { ...draft, title: "Projet privé d’un autre compte" },
          "project:other:secret",
        );
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    { scene, empty: emptyScene() },
  );
  return scene;
}
const box = (scene: SceneDocument, part: Part) => {
  const { w, h, d } = CATALOG[part.type];
  return new Box3(
    new Vector3(-w / 2, 0, -d / 2),
    new Vector3(w / 2, h + 0.2, d / 2),
  ).applyMatrix4(worldMatrix(scene, part.id));
};
test("import local : choix au clavier, groupe libre, annulation, sauvegarde et rechargement", async ({
  page,
}, info) => {
  const fixture = await projectsFixture(page);
  await page.goto("/editor/project");
  await expect(page.getByLabel("Nom du projet")).toBeEnabled();
  const source = await seedLocal(page);
  const trigger = page.getByRole("button", {
    name: "Importer un projet",
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Choisir Le phare bleu" }),
  ).toHaveCount(0);
  await expect(dialog).not.toContainText("Projet privé d’un autre compte");
  await expect(
    dialog.getByRole("button", { name: /Choisir Projet vide/ }),
  ).toBeDisabled();
  const choice = dialog.getByRole("button", {
    name: "Choisir Maison de poche",
    exact: true,
  });
  await choice.focus();
  await choice.press("Space");
  await expect(choice).toHaveAttribute("aria-pressed", "true");
  await expect(
    dialog.locator(".project-import-thumbnail img").first(),
  ).toBeVisible();
  await page.screenshot({
    path: `/tmp/clik-project-import-${info.project.name}.png`,
  });
  await page.setViewportSize({ width: 900, height: 600 });
  const bounds = await dialog.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(600);
  await page.screenshot({
    path: `/tmp/clik-project-import-compact-${info.project.name}.png`,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await dialog
    .getByRole("button", { name: "Importer le projet", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".tree-row.selected")).toContainText(
    "Maison de poche",
  );
  await expect(page.locator(".project-metadata .assembly-badge")).toHaveText(
    "Assemblage",
  );
  await expect.poll(() => fixture.calls.saves.length).toBeGreaterThan(0);
  const saved = fixture.calls.saves.at(-1);
  const scene = validateScene(JSON.parse(saved.scene));
  const partNodes = scene.nodes.filter((n): n is Part => n.kind === "part");
  expect(partNodes).toHaveLength(3);
  for (const part of partNodes.slice(1))
    expect(box(scene, part).intersectsBox(box(scene, partNodes[0]))).toBe(
      false,
    );
  expect(scene.nodes.filter((n) => n.kind === "group")).toHaveLength(1);
  expect(saved.imports).toHaveLength(1);
  await page.getByTitle("Annuler (⌘/Ctrl Z)", { exact: true }).click();
  await expect(page.locator(".tree-row")).toHaveCount(1);
  await expect(page.locator(".project-metadata .assembly-badge")).toHaveCount(
    0,
  );
  await page.getByTitle("Rétablir", { exact: true }).click();
  await expect(page.locator(".tree-row")).toHaveCount(4);
  await expect(page.locator(".project-metadata .assembly-badge")).toHaveCount(
    1,
  );
  await expect(
    page.getByLabel("Projet et sauvegarde").getByRole("status"),
  ).toContainText("Enregistré");
  await page.reload();
  await expect(page.locator(".tree-row")).toHaveCount(4);
  await expect(page.locator(".project-metadata .assembly-badge")).toHaveCount(
    1,
  );
  const local = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const req = indexedDB.open("clik", 1);
      req.onsuccess = () => resolve(req.result);
    });
    const value = await new Promise<any>((resolve) => {
      const req = db
        .transaction("drafts")
        .objectStore("drafts")
        .get("guest:mini-house");
      req.onsuccess = () => resolve(req.result);
    });
    db.close();
    return value;
  });
  expect(local.scene).toEqual(source);
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  for (const width of [1440, 1100, 900]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page
        .locator(".editor-top")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
  }
});
test("import en ligne : erreur récupérable, attribution et exclusion du projet courant", async ({
  page,
}) => {
  const fixture = await projectsFixture(page);
  await page.goto("/editor/project");
  await expect(page.getByLabel("Nom du projet")).toBeEnabled();
  await page
    .getByRole("button", { name: "Importer un projet", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Choisir Un ancien défi", exact: true })
    .click();
  fixture.failImport(true);
  await dialog
    .getByRole("button", { name: "Importer le projet", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("Import indisponible");
  await expect(page.locator(".tree-row")).toHaveCount(1);
  fixture.failImport(false);
  await dialog
    .getByRole("button", { name: "Importer le projet", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".tree-row.selected")).toContainText(
    "Un ancien défi",
  );
  await page.locator(".project-sources summary").click();
  await expect(
    page
      .locator(".project-sources")
      .getByRole("link", { name: /maison d’Alice/ }),
  ).toHaveAttribute("href", "/creations/original");
  await expect
    .poll(() => fixture.calls.saves.at(-1)?.imports[0]?.receiptIds)
    .toEqual(["import-receipt"]);
});
test("l’import est désactivé dans l’atelier du défi", async ({ page }) => {
  await challengeFixture(page);
  await page.goto("/editor/project");
  await expect(page.getByLabel("Nom du projet")).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Importer un projet", exact: true }),
  ).toBeDisabled();
});

test("un assemblage public présente ses sources et son badge parmi les descendants", async ({
  page,
}, info) => {
  const fixture = await creatorsFixture(page);
  fixture.setAssembly("creation-2", ["creation-0", "creation-1"]);
  await page.goto("/creations/creation-0");
  await expect(
    page.locator(".creation-remixes .public-creation-card"),
  ).toHaveCount(1);
  await expect(page.locator(".creation-remixes .assembly-badge")).toHaveText(
    "Assemblage",
  );
  await page.locator(".creation-remixes .public-creation-open").click();
  await expect(page).toHaveURL(/\/creations\/creation-2$/);
  await expect(page.locator(".creation-details .assembly-badge")).toHaveText(
    "Assemblage",
  );
  await expect(page.locator(".creation-source-list li")).toHaveCount(2);
  await expect(page.locator(".creation-source-list a")).toHaveCount(2);
  await page.screenshot({
    path: `/tmp/clik-assembly-public-${info.project.name}.png`,
    fullPage: true,
  });
  fixture.setPublished("creation-0", false);
  await expect(page.locator(".creation-source-list a")).toHaveCount(1);
  await expect(page.locator(".creation-source-list")).toContainText(
    "La maison bleue 1",
  );
});
