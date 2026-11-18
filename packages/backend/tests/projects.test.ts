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
    getAnyUserById: async () => null,
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

describe("Collections paginées", () => {
  it("filtre les publications dans l’index et conserve tri, révision et retrait", async () => {
    const { alice, bob, t } = setup();
    const largeScene = JSON.stringify({
      ...emptyScene(),
      nodes: Array.from({ length: 500 }, (_, i) =>
        makePart("brick-2x4", "#4079e8", [i * 5, 0, 0]),
      ),
    });
    for (let i = 0; i < 120; i++)
      await alice.mutation(api.projects.create, {
        title: `Privée ${i}`,
        scene: largeScene,
      });
    const published = [];
    for (let i = 0; i < 13; i++) {
      const id = await alice.mutation(api.projects.create, {
        title: `Publiée ${i}`,
        scene: largeScene,
      });
      const thumbnail = await t.run((ctx) =>
        ctx.storage.store(new Blob(["image"])),
      );
      await alice.mutation(internal.projects.registerThumbnail, {
        projectId: id,
        storageId: thumbnail,
      });
      const publicationId = await alice.mutation(api.projects.publish, {
        id,
        title: `Publiée ${i}`,
        description: "",
        thumbnail,
        revision: 0,
      });
      await t.run((ctx) => ctx.db.patch(id, { updatedAt: 1000 + i }));
      published.push({ id, publicationId });
    }
    expect(await alice.query(api.projects.collectionReady, {})).toBe(true);
    const args = {
      publishedOnly: true,
      summaryOnly: true,
      paginationOpts: { numItems: 12, cursor: null },
    };
    const first = await alice.query(api.projects.list, args);
    expect(first.page.map((p) => p._id)).toEqual(
      published
        .slice(1)
        .reverse()
        .map((p) => p.id),
    );
    expect(first.page.every((p) => p.thumbnailUrl && p.partCount === 500)).toBe(
      true,
    );
    expect(first.page.every((p) => !("scene" in p) && !("imports" in p))).toBe(
      true,
    );
    expect(new TextEncoder().encode(JSON.stringify(first)).length).toBeLessThan(
      12_000,
    );
    const rest = await alice.query(api.projects.list, {
      ...args,
      paginationOpts: { numItems: 12, cursor: first.continueCursor },
    });
    expect(rest.page.map((p) => p._id)).toEqual([published[0].id]);
    expect(rest.isDone).toBe(true);
    const oldest = await alice.query(api.projects.list, {
      ...args,
      sort: "oldest",
    });
    expect(oldest.page.map((p) => p._id)).toEqual(
      published.slice(0, 12).map((p) => p.id),
    );
    await alice.mutation(api.projects.save, {
      id: published[0].id,
      revision: 0,
      title: "Actualisée",
      scene: largeScene,
    });
    const updated = await alice.query(api.projects.list, args);
    expect(updated.page[0]).toMatchObject({
      _id: published[0].id,
      revision: 1,
      thumbnailUrl: null,
    });
    await alice.mutation(api.projects.withdraw, {
      id: published[0].publicationId,
    });
    expect(
      (await alice.query(api.projects.list, args)).page.map((p) => p._id),
    ).not.toContain(published[0].id);
    expect((await bob.query(api.projects.list, args)).page).toEqual([]);
  });

  it("migre les anciens projets par lots sans perdre une publication ni un curseur", async () => {
    vi.useFakeTimers();
    try {
      const { alice, t } = setup();
      const ids = [];
      for (let i = 0; i < 27; i++)
        ids.push(
          await alice.mutation(api.projects.create, {
            title: `Ancien ${i}`,
            scene,
          }),
        );
      const thumbnail = await t.run((ctx) =>
        ctx.storage.store(new Blob(["image"])),
      );
      await alice.mutation(internal.projects.registerThumbnail, {
        projectId: ids[0],
        storageId: thumbnail,
      });
      await alice.mutation(api.projects.publish, {
        id: ids[0],
        title: "Ancienne publication",
        description: "",
        thumbnail,
        revision: 0,
      });
      await t.run(async (ctx) => {
        for (const id of ids)
          await ctx.db.patch(id, { isPublished: undefined });
      });
      expect(await alice.query(api.projects.collectionReady, {})).toBe(false);
      await t.mutation(internal.projects.migrateCollection, {});
      await t.finishAllScheduledFunctions(() => vi.runAllTimers());
      expect(await alice.query(api.projects.collectionReady, {})).toBe(true);
      const result = await alice.query(api.projects.list, {
        publishedOnly: true,
        paginationOpts: { numItems: 12, cursor: null },
      });
      expect(result.page.map((p) => p._id)).toEqual([ids[0]]);
      await t.mutation(internal.projects.migrateCollection, {});
      expect(
        await t.run((ctx) => ctx.db.query("collectionMigration").unique()),
      ).toMatchObject({ complete: true });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("Projets privés et versions publiques", () => {
  it("sauvegarde mille pièces et conserve la révision si la suivante dépasse le plafond", async () => {
    const { alice } = setup();
    const title = "Mille pièces";
    const id = await alice.mutation(api.projects.create, { title, scene });
    const nodes = Array.from({ length: 1000 }, (_, i) =>
      makePart("brick-1x1", "#4079e8", [i * 2, 0, 0]),
    );
    const full = { ...emptyScene(), nodes };
    await alice.mutation(api.projects.save, {
      id,
      title,
      revision: 0,
      scene: JSON.stringify(full),
    });
    await expect(
      alice.mutation(api.projects.save, {
        id,
        title,
        revision: 1,
        scene: JSON.stringify({
          ...full,
          nodes: [...nodes, makePart("brick-1x1", "#4079e8")],
        }),
      }),
    ).rejects.toThrow(/1\s?000 pièces/);
    const saved = await alice.query(api.projects.get, { id });
    expect(saved?.revision).toBe(1);
    expect(JSON.parse(saved!.scene)).toEqual(full);
  });

  it("conserve les dates de pose dans les sauvegardes, versions publiques et reprises", async () => {
    const { alice, bob, t } = setup();
    const first = { ...makePart("brick-2x2", "#4079e8"), createdAt: 1000 };
    const document = { ...emptyScene(), nodes: [first] };
    const id = await alice.mutation(api.projects.create, {
      title: "Évolution",
      scene: JSON.stringify(document),
    });
    expect(
      JSON.parse((await alice.query(api.projects.get, { id })).scene),
    ).toEqual(document);
    document.nodes.push({
      ...makePart("brick-1x1", "#ef4444", [0, 1.2, 0]),
      createdAt: 5000,
    });
    await alice.mutation(api.projects.save, {
      id,
      title: "Évolution",
      scene: JSON.stringify(document),
      revision: 0,
    });
    const thumbnail = await t.run((ctx) =>
      ctx.storage.store(new Blob(["test"], { type: "image/png" })),
    );
    await alice.mutation(internal.projects.registerThumbnail, {
      projectId: id,
      storageId: thumbnail,
    });
    const publication = await alice.mutation(api.projects.publish, {
      id,
      title: "Évolution",
      description: "",
      thumbnail,
      revision: 1,
    });
    const version = await t.query(api.projects.creation, { id: publication });
    expect(JSON.parse(version!.scene)).toEqual(document);
    const copy = await bob.mutation(api.projects.remix, {
      id: publication,
      versionId: version!._id,
    });
    expect(
      JSON.parse((await bob.query(api.projects.get, { id: copy })).scene),
    ).toEqual(document);
    // Publishing a subsequent edit must not mutate the previous replay.
    document.nodes[0].createdAt = 9999;
    await alice.mutation(api.projects.save, {
      id,
      title: "Évolution",
      scene: JSON.stringify(document),
      revision: 1,
    });
    expect(
      JSON.parse(
        (await t.query(api.projects.creation, { id: publication }))!.scene,
      ).nodes[0].createdAt,
    ).toBe(1000);
  });
  it("conserve les couleurs personnalisées et les anciens blancs à l’enregistrement, la publication et la reprise", async () => {
    const { alice, bob, t } = setup();
    const colors = ["#123abc", "#f5f5f3", "#f2e8d5", "#8b5e3c"];
    const customScene = {
      ...emptyScene(),
      nodes: colors.map((color, i) =>
        makePart("brick-1x1", color, [i * 3, 0, 0]),
      ),
    };
    const id = await alice.mutation(api.projects.create, {
      title: "Nuances",
      scene: JSON.stringify(customScene),
    });
    expect(
      JSON.parse((await alice.query(api.projects.get, { id })).scene),
    ).toEqual(customScene);
    customScene.nodes[0].color = "#c567ab";
    const savedScene = JSON.stringify(validateScene(customScene));
    await alice.mutation(api.projects.save, {
      id,
      title: "Nuances",
      scene: savedScene,
      revision: 0,
    });
    expect((await alice.query(api.projects.get, { id })).scene).toBe(
      savedScene,
    );
    const thumbnail = await t.run((ctx) =>
      ctx.storage.store(new Blob(["test"], { type: "image/png" })),
    );
    await alice.mutation(internal.projects.registerThumbnail, {
      projectId: id,
      storageId: thumbnail,
    });
    const publication = await alice.mutation(api.projects.publish, {
      id,
      title: "Nuances",
      description: "Couleurs sur mesure",
      thumbnail,
      revision: 1,
    });
    const version = await t.query(api.projects.creation, { id: publication });
    expect(version?.scene).toBe(savedScene);
    const copyId = await bob.mutation(api.projects.remix, {
      id: publication,
      versionId: version!._id,
    });
    expect((await bob.query(api.projects.get, { id: copyId })).scene).toBe(
      savedScene,
    );
  });
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
  it("liste des métadonnées légères et charge la scène actuelle uniquement à la demande du propriétaire", async () => {
    const { alice, bob, t } = setup();
    const id = await alice.mutation(api.projects.create, {
      title: "Ma création",
      scene,
    });
    const paginationOpts = { numItems: 12, cursor: null };
    const first = await alice.query(api.projects.list, {
      paginationOpts,
      summaryOnly: true,
    });
    expect(first.page[0]).toMatchObject({
      _id: id,
      partCount: 1,
      revision: 0,
      description: "",
    });
    expect(first.page[0]).not.toHaveProperty("scene");
    expect(first.page[0]).not.toHaveProperty("imports");
    expect(
      (await alice.query(api.projects.list, { paginationOpts })).page[0].scene,
    ).toBe(scene);
    expect((await alice.query(api.projects.get, { id })).scene).toBe(scene);
    const changed = JSON.stringify(emptyScene());
    await alice.mutation(api.projects.save, {
      id,
      title: "Ma création terminée",
      scene: changed,
      revision: 0,
    });
    expect((await alice.query(api.projects.get, { id })).scene).toBe(changed);
    await expect(bob.query(api.projects.get, { id })).rejects.toThrow(
      "introuvable",
    );
    const second = await alice.query(api.projects.list, {
      paginationOpts,
      summaryOnly: true,
    });
    expect(second.page[0]).toMatchObject({
      _id: id,
      partCount: 0,
      revision: 1,
    });
    expect(
      (await bob.query(api.projects.list, { paginationOpts })).page,
    ).toEqual([]);
    await expect(
      t.query(api.projects.list, { paginationOpts }),
    ).rejects.toThrow("Connexion");
  });
  it("conserve le catalogue étendu à l’enregistrement, la publication et la reprise", async () => {
    const { alice, bob, t } = setup();
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
    const thumbnail = await t.run((ctx) =>
      ctx.storage.store(new Blob(["test"], { type: "image/png" })),
    );
    await alice.mutation(internal.projects.registerThumbnail, {
      projectId: id,
      storageId: thumbnail,
    });
    const publication = await alice.mutation(api.projects.publish, {
      id,
      title: "Catalogue",
      description: "Toutes les formes",
      thumbnail,
      revision: 1,
    });
    const version = await t.query(api.projects.creation, { id: publication });
    expect(JSON.parse(version!.scene)).toEqual(JSON.parse(expanded));
    const copyId = await bob.mutation(api.projects.remix, {
      id: publication,
      versionId: version!._id,
    });
    expect(
      JSON.parse((await bob.query(api.projects.get, { id: copyId })).scene),
    ).toEqual(JSON.parse(expanded));
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
    expect((await alice.query(api.projects.get, { id })).description).toBe("");
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
    expect(await alice.query(api.projects.get, { id })).toMatchObject({
      publicationId: pub,
      description: "Une première construction.",
    });
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
    expect((await alice.query(api.projects.get, { id })).description).toBe(
      "Une première construction.",
    );
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
    expect((await alice.query(api.projects.get, { id })).description).toBe(
      "Une description à conserver après retrait.",
    );
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
    expect(await alice.query(api.projects.get, { id })).toMatchObject({
      publicationId: null,
      description: "Une description à conserver après retrait.",
    });
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
    expect(copy.description).toBe("");
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
