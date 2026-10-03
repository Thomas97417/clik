import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { emptyScene, makePart, MAX_PROJECT_SOURCES } from "@clik/scene";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
vi.mock("../convex/auth", () => ({
  authComponent: {
    safeGetAuthUser: async (ctx: any) => {
      const identity = await ctx.auth.getUserIdentity();
      return identity
        ? { _id: identity.subject, name: identity.name ?? identity.subject }
        : null;
    },
  },
}));
const modules = import.meta.glob("../convex/**/*.{ts,tsx,js}");
const scene = JSON.stringify({
  ...emptyScene(),
  nodes: [makePart("brick-2x4", "#4079e8")],
});
const paginationOpts = { numItems: 24, cursor: null };
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
async function setup() {
  const t = convexTest(schema, modules);
  const alice = t.withIdentity({ subject: "alice", name: "Alice" });
  const bob = t.withIdentity({ subject: "bob", name: "Bob" });
  const publish = async (u: typeof alice, id: Id<"projects">) => {
    const p = await u.query(api.projects.get, { id });
    const thumbnail = await t.run((ctx) =>
      ctx.storage.store(new Blob(["png"])),
    );
    await u.mutation(internal.projects.registerThumbnail, {
      projectId: id,
      storageId: thumbnail,
    });
    return u.mutation(api.projects.publish, {
      id,
      title: p.title,
      description: "",
      thumbnail,
      revision: p.revision,
    });
  };
  const a = await alice.mutation(api.projects.create, {
    title: "La maison d’Alice",
    scene,
  });
  const publicationA = await publish(alice, a);
  const vA = (await t.query(api.projects.creation, { id: publicationA }))!;
  const b = await bob.mutation(api.projects.remix, {
    id: publicationA,
    versionId: vA._id,
  });
  const migrate = async () => {
    await t.mutation(internal.projects.migrateLineage, {});
    await t.finishAllScheduledFunctions(() => vi.runAllTimers());
  };
  return { t, alice, bob, a, b, publicationA, publish, migrate };
}
describe("Provenance des assemblages", () => {
  it("compte aussi l’origine dans la limite et refuse l’ajout sans modifier le projet", async () => {
    const { t, bob, b, publicationA, publish } = await setup();
    const receiptId = await t.run(async (ctx) => {
      const { _id, _creationTime, ...publication } =
        (await ctx.db.get(publicationA))!;
      const sources = [];
      for (let i = 0; i < MAX_PROJECT_SOURCES; i++) {
        const publicationId = await ctx.db.insert("publications", {
          ...publication,
          active: false,
        });
        sources.push({
          publicationId,
          versionId: publication.versionId!,
          title: "Source",
          author: "Alice",
        });
      }
      return ctx.db.insert("importReceipts", {
        owner: "bob",
        title: "Collection",
        sources,
        createdAt: Date.now(),
      });
    });
    const imports = [
      { id: "one", title: "Collection", receiptIds: [receiptId] },
    ];
    const c = await bob.mutation(api.projects.create, {
      title: "Collection",
      scene,
      imports,
    });
    await expect(
      bob.mutation(api.projects.create, {
        title: "Copie",
        scene,
        imports,
        copyFrom: b,
      }),
    ).rejects.toThrow("1 000 sources");
    await expect(
      bob.mutation(api.projects.save, {
        id: b,
        title: "Modifié",
        scene,
        revision: 0,
        imports,
      }),
    ).rejects.toThrow("1 000 sources");
    expect((await bob.query(api.projects.get, { id: b })).revision).toBe(0);
    const publicationC = await publish(bob, c);
    await expect(
      bob.mutation(api.projects.prepareImport, { id: c }),
    ).rejects.toThrow("1 000 sources");
    const versionC = (await t.query(api.projects.creation, {
      id: publicationC,
    }))!;
    await expect(
      bob.mutation(api.projects.remix, {
        id: publicationC,
        versionId: versionC._id,
      }),
    ).rejects.toThrow("1 000 sources");
  });

  it("continue une pagination commencée sur l’ancien index après la migration", async () => {
    const { t, bob, b, publicationA, publish, migrate } = await setup();
    const ids = [await publish(bob, b)];
    for (let i = 0; i < 3; i++) {
      const id = await bob.mutation(api.projects.create, {
        title: `Copie ${i}`,
        scene,
        copyFrom: b,
      });
      ids.push(await publish(bob, id));
    }
    const first = await t.query(api.projects.remixes, {
      publicationId: publicationA,
      paginationOpts: { numItems: 2, cursor: null },
    });
    expect(first.continueCursor).toMatch(/^legacy:/);
    await migrate();
    const last = await t.query(api.projects.remixes, {
      publicationId: publicationA,
      paginationOpts: { numItems: 2, cursor: first.continueCursor },
    });
    expect(new Set([...first.page, ...last.page].map((p) => p._id))).toEqual(
      new Set(ids),
    );
    const migrated = await t.query(api.projects.remixes, {
      publicationId: publicationA,
      paginationOpts: { numItems: 2, cursor: null },
    });
    expect(migrated.continueCursor).toMatch(/^edges:/);
  });

  it("transmet les crédits d’un assemblage à sa reprise par un autre compte", async () => {
    const { t, bob, b, publicationA, publish } = await setup();
    const publicationB = await publish(bob, b);
    const prepared = await bob.mutation(api.projects.prepareImport, { id: b });
    const c = await bob.mutation(api.projects.create, {
      title: "Village",
      scene,
      imports: [
        { id: "one", title: prepared.title, receiptIds: [prepared.receiptId] },
      ],
    });
    const publicationC = await publish(bob, c);
    const versionC = (await t.query(api.projects.creation, {
      id: publicationC,
    }))!;
    const carol = t.withIdentity({ subject: "carol", name: "Carol" });
    const d = await carol.mutation(api.projects.remix, {
      id: publicationC,
      versionId: versionC._id,
    });
    const doc = await carol.query(api.projects.get, { id: d });
    expect(doc.imports).toHaveLength(1);
    expect(doc.imports![0].receiptIds).not.toContain(prepared.receiptId);
    await carol.mutation(api.projects.save, {
      id: d,
      title: doc.title,
      scene: doc.scene,
      revision: 0,
      imports: doc.imports!.map(({ id, title, receiptIds }) => ({
        id,
        title,
        receiptIds,
      })),
    });
    const reimport = await carol.mutation(api.projects.prepareImport, {
      id: d,
    });
    expect(new Set(reimport.sources.map((s) => s.publicationId))).toEqual(
      new Set([publicationA, publicationB, publicationC]),
    );
  });

  it("relie un assemblage publié à la reprise importée et à son origine, sans doublons", async () => {
    const { t, bob, b, publicationA, publish, migrate } = await setup();
    const publicationB = await publish(bob, b);
    const prepared = await bob.mutation(api.projects.prepareImport, { id: b });
    expect(prepared.sources.map((s) => s.publicationId).sort()).toEqual(
      [publicationA, publicationB].sort(),
    );
    const imports = [
      { id: "first", title: prepared.title, receiptIds: [prepared.receiptId] },
      { id: "second", title: prepared.title, receiptIds: [prepared.receiptId] },
    ];
    const c = await bob.mutation(api.projects.create, {
      title: "Le village",
      scene,
      imports,
    });
    expect(
      (await bob.query(api.projects.get, { id: c })).origin,
    ).toBeUndefined();
    expect(
      (
        await t.query(api.projects.remixes, {
          publicationId: publicationA,
          paginationOpts,
        })
      ).page.map((p) => p._id),
    ).not.toContain(c);
    const publicationC = await publish(bob, c);
    await migrate();
    for (const parent of [publicationA, publicationB]) {
      const result = await t.query(api.projects.remixes, {
        publicationId: parent,
        paginationOpts,
      });
      const cards = result.page.filter((p) => p._id === publicationC);
      expect(cards).toHaveLength(1);
      expect(cards[0]).toMatchObject({
        relationship: "assembly",
        isAssembly: true,
      });
      expect(cards[0]).not.toHaveProperty("imports");
      expect(cards[0]).not.toHaveProperty("scene");
    }
    const publicC = (await t.query(api.projects.creation, {
      id: publicationC,
    }))!;
    expect(publicC.sources).toHaveLength(2);
    expect(publicC).not.toHaveProperty("imports");
    expect(JSON.stringify(publicC)).not.toContain(prepared.receiptId);
    const edges = await t.run((ctx) =>
      ctx.db
        .query("publicationSources")
        .withIndex("by_publication", (q) => q.eq("publicationId", publicationC))
        .collect(),
    );
    expect(edges).toHaveLength(2);
  });
  it("vérifie les propriétaires et refuse les preuves d’un autre compte", async () => {
    const { t, alice, bob, b } = await setup();
    await expect(
      t.mutation(api.projects.prepareImport, { id: b }),
    ).rejects.toThrow("Connexion");
    await expect(
      alice.mutation(api.projects.prepareImport, { id: b }),
    ).rejects.toThrow("introuvable");
    const source = await bob.mutation(api.projects.prepareImport, { id: b });
    await expect(
      alice.mutation(api.projects.create, {
        title: "Faux",
        scene,
        imports: [
          { id: "bad", title: "Faux auteur", receiptIds: [source.receiptId] },
        ],
      }),
    ).rejects.toThrow("non autorisée");
    await expect(
      alice.mutation(api.projects.create, {
        title: "Faux",
        scene,
        originReceiptId: source.originReceiptId,
      }),
    ).rejects.toThrow("non autorisée");
    const empty = await bob.mutation(api.projects.create, {
      title: "Vide",
      scene: JSON.stringify(emptyScene()),
    });
    await expect(
      bob.mutation(api.projects.prepareImport, { id: empty }),
    ).rejects.toThrow("aucune pièce");
  });
  it("fige les sources même après suppression de la reprise ou retrait de l’original", async () => {
    const { t, alice, bob, b, publicationA, publish, migrate } = await setup();
    const prepared = await bob.mutation(api.projects.prepareImport, { id: b });
    expect(prepared.sources.map((s) => s.publicationId)).toEqual([
      publicationA,
    ]);
    await bob.mutation(api.projects.remove, { id: b });
    await alice.mutation(api.projects.withdraw, { id: publicationA });
    const c = await bob.mutation(api.projects.create, {
      title: "Suite",
      scene,
      imports: [
        { id: "one", title: prepared.title, receiptIds: [prepared.receiptId] },
      ],
    });
    const publicC = await publish(bob, c);
    await migrate();
    expect(
      (await t.query(api.projects.creation, { id: publicC }))?.sources,
    ).toMatchObject([
      { publicationId: publicationA, author: "Alice", available: false },
    ]);
    expect(
      (
        await t.query(api.projects.remixes, {
          publicationId: publicationA,
          paginationOpts,
        })
      ).page,
    ).toEqual([]);
  });
  it("publie l’état d’attribution sauvegardé, préserve les anciennes versions et les copies", async () => {
    const { t, bob, b, publish, migrate, publicationA } = await setup();
    const prepared = await bob.mutation(api.projects.prepareImport, { id: b });
    const imports = [
      { id: "one", title: prepared.title, receiptIds: [prepared.receiptId] },
    ];
    const c = await bob.mutation(api.projects.create, {
      title: "Suite",
      scene,
      imports,
    });
    const publicationC = await publish(bob, c);
    const v1 = (await t.query(api.projects.creation, { id: publicationC }))!;
    await migrate();
    await bob.mutation(api.projects.save, {
      id: c,
      title: "Suite",
      scene,
      revision: 0,
      imports: [],
    });
    // Private edits do not alter the published version before republication.
    expect(
      (await t.query(api.projects.creation, { id: publicationC }))?.sources,
    ).toHaveLength(1);
    await publish(bob, c);
    expect(
      (
        await t.query(api.projects.remixes, {
          publicationId: publicationA,
          paginationOpts,
        })
      ).page.some((p) => p._id === publicationC),
    ).toBe(false);
    expect(
      (
        await t.query(api.projects.creation, {
          id: publicationC,
          versionId: v1._id,
        })
      )?.sources,
    ).toHaveLength(1);
    await bob.mutation(api.projects.save, {
      id: c,
      title: "Suite",
      scene,
      revision: 1,
      imports,
    });
    await publish(bob, c);
    expect(
      (
        await t.query(api.projects.remixes, {
          publicationId: publicationA,
          paginationOpts,
        })
      ).page.filter((p) => p._id === publicationC),
    ).toHaveLength(1);
    const copied = await bob.mutation(api.projects.create, {
      title: "Copie",
      scene,
      copyFrom: b,
    });
    expect(
      (await bob.query(api.projects.get, { id: copied })).origin?.publicationId,
    ).toBe(publicationA);
    const copyLocal = await bob.mutation(api.projects.create, {
      title: "Copie locale",
      scene,
      originReceiptId: prepared.originReceiptId,
    });
    expect(
      (await bob.query(api.projects.get, { id: copyLocal })).origin
        ?.publicationId,
    ).toBe(publicationA);
    await bob.mutation(api.projects.withdraw, { id: publicationC });
    expect(
      (
        await t.query(api.projects.remixes, {
          publicationId: publicationA,
          paginationOpts,
        })
      ).page.some((p) => p._id === publicationC),
    ).toBe(false);
  });
  it("migre les reprises existantes une seule fois et pagine les deux types de descendants", async () => {
    const { t, bob, b, publicationA, publish, migrate } = await setup();
    await publish(bob, b);
    await t.run((ctx) => ctx.db.patch(b, { originReceiptId: undefined }));
    await migrate();
    const count = await t.run(
      async (ctx) => (await ctx.db.query("importReceipts").collect()).length,
    );
    expect(await t.mutation(internal.projects.migrateLineage, {})).toBe(true);
    expect(
      await t.run(
        async (ctx) => (await ctx.db.query("importReceipts").collect()).length,
      ),
    ).toBe(count);
    expect(
      (await bob.query(api.projects.get, { id: b })).originReceiptId,
    ).toBeTruthy();
    const prepared = await bob.mutation(api.projects.prepareImport, { id: b });
    const publications: string[] = [];
    for (let i = 0; i < 4; i++) {
      vi.advanceTimersByTime(100);
      const id = await bob.mutation(api.projects.create, {
        title: `Assemblage ${i}`,
        scene,
        imports: [
          {
            id: `import-${i}`,
            title: prepared.title,
            receiptIds: [prepared.receiptId],
          },
        ],
      });
      publications.push(await publish(bob, id));
    }
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const page = await t.query(api.projects.remixes, {
        publicationId: publicationA,
        paginationOpts: { numItems: 2, cursor },
      });
      seen.push(...page.page.map((p) => p._id));
      cursor = page.isDone ? null : page.continueCursor;
    } while (cursor);
    expect(seen.slice(0, 4)).toEqual([...publications].reverse());
    expect(new Set(seen).size).toBe(5);
  });
  it("rejette l’import dans un projet de défi, même si son stock permet la scène", async () => {
    const { t, bob, b } = await setup();
    const prepared = await bob.mutation(api.projects.prepareImport, { id: b });
    const challengeId = await bob.mutation(api.challenges.ensureToday, {});
    const c = await bob.mutation(api.projects.create, {
      title: "Défi",
      scene: JSON.stringify(emptyScene()),
    });
    await t.run((ctx) => ctx.db.patch(c, { challengeId }));
    await expect(
      bob.mutation(api.projects.save, {
        id: c,
        title: "Défi",
        scene: JSON.stringify(emptyScene()),
        revision: 0,
        imports: [
          {
            id: "one",
            title: prepared.title,
            receiptIds: [prepared.receiptId],
          },
        ],
      }),
    ).rejects.toThrow("atelier libre");
    expect((await bob.query(api.projects.get, { id: c })).revision).toBe(0);
  });
});
