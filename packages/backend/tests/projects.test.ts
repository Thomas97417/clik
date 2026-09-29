import { describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import {
  CATALOG,
  type PartType,
  emptyScene,
  makePart,
  validateScene,
} from "@clik/scene";
vi.mock("../convex/auth", () => ({
  authComponent: {
    safeGetAuthUser: async (ctx: any) => {
      const id = await ctx.auth.getUserIdentity();
      return id ? { _id: id.subject, name: id.name ?? "Auteur" } : null;
    },
  },
}));
const modules = import.meta.glob("../convex/**/*.{ts,tsx,js}");
const setup = () => {
  const t = convexTest(schema, modules);
  return {
    t,
    alice: t.withIdentity({ subject: "alice", name: "Alice" }),
    bob: t.withIdentity({ subject: "bob", name: "Bob" }),
  };
};
const scene = JSON.stringify(
  validateScene({ ...emptyScene(), nodes: [makePart("brick-2x2", "#4079e8")] }),
);
describe("Projets privés et versions publiques", () => {
  it("sauvegarde le catalogue étendu dans un projet existant", async () => {
    const { alice } = setup();
    const id = await alice.mutation(api.projects.create, {
      title: "Catalogue",
      scene,
    });
    const expanded = JSON.stringify({
      ...emptyScene(),
      nodes: (Object.keys(CATALOG) as PartType[]).map((type, i) =>
        makePart(type, "#4079e8", [i * 8, 0, 0]),
      ),
    });
    await alice.mutation(api.projects.save, {
      id,
      title: "Catalogue",
      scene: expanded,
      revision: 0,
    });
    const saved = await alice.query(api.projects.get, { id });
    expect(JSON.parse(saved.scene)).toEqual(JSON.parse(expanded));
    expect(validateScene(JSON.parse(saved.scene)).nodes).toHaveLength(23);
  });
  it("refuse lectures et écritures aux visiteurs et aux autres propriétaires", async () => {
    const { t, alice, bob } = setup();
    const id = await alice.mutation(api.projects.create, {
      title: "Privé",
      scene,
    });
    await expect(bob.query(api.projects.get, { id })).rejects.toThrow(
      "introuvable",
    );
    await expect(t.query(api.projects.get, { id })).rejects.toThrow(
      "Connexion",
    );
    await expect(
      bob.mutation(api.projects.save, { id, title: "Vol", scene, revision: 0 }),
    ).rejects.toThrow("introuvable");
    expect(
      (
        await bob.query(api.projects.list, {
          paginationOpts: { numItems: 12, cursor: null },
        })
      ).page,
    ).toEqual([]);
  });
  it("détecte les sauvegardes obsolètes sans écraser le brouillon", async () => {
    const { alice } = setup();
    const id = await alice.mutation(api.projects.create, { title: "A", scene });
    await alice.mutation(api.projects.save, {
      id,
      title: "B",
      scene,
      revision: 0,
    });
    await expect(
      alice.mutation(api.projects.save, { id, title: "C", scene, revision: 0 }),
    ).rejects.toThrow("CONFLICT");
    expect((await alice.query(api.projects.get, { id })).title).toBe("B");
  });
  it("publie un instantané, reprend la version consultée et conserve son attribution après retrait", async () => {
    const { t, alice, bob } = setup();
    const id = await alice.mutation(api.projects.create, {
      title: "Original",
      scene,
    });
    const thumbnail = await t.run((ctx) =>
      ctx.storage.store(new Blob(["test"], { type: "image/png" })),
    );
    await alice.mutation(internal.projects.registerThumbnail, {
      projectId: id,
      storageId: thumbnail,
    });
    const pub = await alice.mutation(api.projects.publish, {
      id,
      title: "Version 1",
      description: "",
      thumbnail,
      revision: 0,
    });
    const first = await t.query(api.projects.creation, { id: pub });
    expect(first?.scene).toBe(scene);
    await alice.mutation(api.projects.save, {
      id,
      title: "Brouillon changé",
      scene: JSON.stringify(emptyScene()),
      revision: 0,
    });
    expect((await t.query(api.projects.creation, { id: pub }))?.scene).toBe(
      scene,
    );
    await alice.mutation(api.projects.publish, {
      id,
      title: "Version 2",
      description: "",
      thumbnail,
      revision: 1,
    });
    const copyId = await bob.mutation(api.projects.remix, {
      id: pub,
      versionId: first!._id,
    });
    expect((await bob.query(api.projects.get, { id: copyId })).scene).toBe(
      scene,
    );
    await expect(
      bob.mutation(api.projects.withdraw, { id: pub }),
    ).rejects.toThrow();
    await alice.mutation(api.projects.withdraw, { id: pub });
    expect(
      await t.query(api.projects.creation, { id: pub, versionId: first!._id }),
    ).toBeNull();
    const copy = await bob.query(api.projects.get, { id: copyId });
    expect(copy.origin?.author).toBe("Alice");
    expect(copy.scene).toBe(scene);
    await expect(
      bob.mutation(api.projects.remix, { id: pub, versionId: first!._id }),
    ).rejects.toThrow("indisponible");
  });
  it("valide la scène côté serveur et refuse une miniature étrangère", async () => {
    const { t, alice, bob } = setup();
    await expect(
      alice.mutation(api.projects.create, {
        title: "Bad",
        scene: JSON.stringify({
          ...emptyScene(),
          nodes: [{ ...makePart("brick-1x1", "#4079e8"), type: "invalid" }],
        }),
      }),
    ).rejects.toThrow();
    const a = await alice.mutation(api.projects.create, { title: "A", scene }),
      b = await bob.mutation(api.projects.create, { title: "B", scene });
    const storageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["test"])),
    );
    await bob.mutation(internal.projects.registerThumbnail, {
      projectId: b,
      storageId,
    });
    await expect(
      alice.mutation(api.projects.publish, {
        id: a,
        title: "A",
        description: "",
        thumbnail: storageId,
        revision: 0,
      }),
    ).rejects.toThrow("non autorisée");
  });
});
