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
  it("trie toute la collection par modification avant de paginer, en conservant la confidentialité", async () => {
    const { alice, bob, t } = setup();
    const ids = [];
    for (let i = 0; i < 15; i++) {
      const id = await alice.mutation(api.projects.create, {
        title: `Création ${i}`,
        scene,
      });
      await t.run((ctx) => ctx.db.patch(id, { updatedAt: 1000 + i }));
      ids.push(id);
    }
    const other = await bob.mutation(api.projects.create, {
      title: "Autre compte",
      scene,
    });
    await t.run((ctx) => ctx.db.patch(other, { updatedAt: 0 }));
    const paginationOpts = { numItems: 12, cursor: null };
    const recent = await alice.query(api.projects.list, { paginationOpts });
    expect(recent.page.map((p) => p._id)).toEqual(ids.slice(3).reverse());
    const oldest = await alice.query(api.projects.list, {
      paginationOpts,
      sort: "oldest",
    });
    expect(oldest.page.map((p) => p._id)).toEqual(ids.slice(0, 12));
    expect(oldest.isDone).toBe(false);
    const rest = await alice.query(api.projects.list, {
      sort: "oldest",
      paginationOpts: { numItems: 12, cursor: oldest.continueCursor },
    });
    expect(rest.page.map((p) => p._id)).toEqual(ids.slice(12));
    expect(rest.isDone).toBe(true);
    await alice.mutation(api.projects.save, {
      id: ids[0]!,
      title: "Modifiée",
      scene,
      revision: 0,
    });
    const updated = await alice.query(api.projects.list, {
      paginationOpts,
      sort: "recent",
    });
    expect(updated.page[0]._id).toBe(ids[0]);
  });
  it("importe une version locale une seule fois, par propriétaire", async () => {
    const { alice, bob } = setup();
    const args = { title: "Locale", scene, localSourceId: "local:guest:stamp" };
    const id = await alice.mutation(api.projects.create, args);
    expect(await alice.mutation(api.projects.create, args)).toBe(id);
    expect(await bob.mutation(api.projects.create, args)).not.toBe(id);
    expect(
      await alice.mutation(api.projects.create, {
        ...args,
        localSourceId: "local:guest:new",
      }),
    ).not.toBe(id);
    await alice.mutation(api.projects.save, {
      id,
      title: "Version en ligne modifiée",
      scene,
      revision: 0,
    });
    await expect(alice.mutation(api.projects.create, args)).rejects.toThrow(
      "version locale a été conservée",
    );
    expect((await alice.query(api.projects.get, { id })).title).toBe(
      "Version en ligne modifiée",
    );
  });
  it("supprime uniquement sa création, retire sa publication et préserve les reprises", async () => {
    const { alice, bob, t } = setup();
    const id = await alice.mutation(api.projects.create, {
      title: "Original",
      scene,
    });
    const thumbnail = await t.run((ctx) =>
      ctx.storage.store(new Blob(["test"])),
    );
    await alice.mutation(internal.projects.registerThumbnail, {
      projectId: id,
      storageId: thumbnail,
    });
    const pub = await alice.mutation(api.projects.publish, {
      id,
      title: "Original",
      description: "",
      thumbnail,
      revision: 0,
    });
    const version = await t.query(api.projects.creation, { id: pub });
    const copy = await bob.mutation(api.projects.remix, {
      id: pub,
      versionId: version!._id,
    });
    await expect(bob.mutation(api.projects.remove, { id })).rejects.toThrow(
      "introuvable",
    );
    await expect(t.mutation(api.projects.remove, { id })).rejects.toThrow(
      "Connexion",
    );
    await alice.mutation(api.projects.remove, { id });
    expect(
      (
        await alice.query(api.projects.list, {
          paginationOpts: { numItems: 12, cursor: null },
        })
      ).page,
    ).toEqual([]);
    expect(await t.query(api.projects.creation, { id: pub })).toBeNull();
    expect(
      (
        await t.query(api.projects.gallery, {
          paginationOpts: { numItems: 12, cursor: null },
        })
      ).page,
    ).toEqual([]);
    await expect(
      alice.mutation(api.projects.save, {
        id,
        title: "Obsolète",
        scene,
        revision: 0,
      }),
    ).rejects.toThrow("introuvable");
    expect((await bob.query(api.projects.get, { id: copy })).scene).toBe(scene);
    await expect(
      bob.mutation(api.projects.remix, { id: pub, versionId: version!._id }),
    ).rejects.toThrow("indisponible");
    await bob.mutation(api.projects.remove, { id: copy });
    await expect(bob.query(api.projects.get, { id: copy })).rejects.toThrow(
      "introuvable",
    );
  });
  it("renvoie la scène actuelle et sa révision pour les aperçus du propriétaire", async () => {
    const { alice, bob, t } = setup();
    const id = await alice.mutation(api.projects.create, {
      title: "Ma création",
      scene,
    });
    const paginationOpts = { numItems: 12, cursor: null };
    const first = await alice.query(api.projects.list, { paginationOpts });
    expect(first.page[0]).toMatchObject({
      _id: id,
      scene,
      revision: 0,
      description: "",
    });
    const changed = JSON.stringify(emptyScene());
    await alice.mutation(api.projects.save, {
      id,
      title: "Ma création terminée",
      scene: changed,
      revision: 0,
    });
    const second = await alice.query(api.projects.list, { paginationOpts });
    expect(second.page[0]).toMatchObject({
      _id: id,
      scene: changed,
      revision: 1,
    });
    expect(
      (await bob.query(api.projects.list, { paginationOpts })).page,
    ).toEqual([]);
    await expect(
      t.query(api.projects.list, { paginationOpts }),
    ).rejects.toThrow("Connexion");
  });
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
    expect(validateScene(JSON.parse(saved.scene)).nodes).toHaveLength(
      Object.keys(CATALOG).length,
    );
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
      description: "Une première construction.",
      thumbnail,
      revision: 0,
    });
    const first = await t.query(api.projects.creation, { id: pub });
    expect(first?.scene).toBe(scene);
    expect(
      (
        await alice.query(api.projects.list, {
          paginationOpts: { numItems: 12, cursor: null },
        })
      ).page[0].description,
    ).toBe("Une première construction.");
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
      description: "Une description à conserver après retrait.",
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
      (
        await alice.query(api.projects.list, {
          paginationOpts: { numItems: 12, cursor: null },
        })
      ).page[0],
    ).toMatchObject({
      publicationId: null,
      description: "Une description à conserver après retrait.",
    });
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
