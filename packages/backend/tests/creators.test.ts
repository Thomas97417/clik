import { defaultAvatar } from "@clik/avatars";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { emptyScene } from "@clik/scene";

const { accounts, avatar } = vi.hoisted(() => ({
  accounts: new Map<
    string,
    {
      _id: string;
      name: string;
      image?: string;
      email: string;
      emailVerified: boolean;
    }
  >(),
  avatar: vi.fn(),
}));
vi.mock("../convex/auth", () => ({
  authComponent: {
    safeGetAuthUser: async (ctx: any) => {
      const identity = await ctx.auth.getUserIdentity();
      return identity ? { _id: identity.subject, name: "Alice" } : null;
    },
    getAnyUserById: async (_ctx: unknown, id: string) => {
      if (id === "malformed") throw Error("Invalid ID: malformed");
      if (id === "unavailable") throw Error("Service unavailable");
      return accounts.get(id) ?? null;
    },
  },
}));
vi.mock("../convex/r2", () => ({ r2: { getMetadata: avatar } }));
const modules = import.meta.glob("../convex/**/*.{ts,tsx,js}");
beforeEach(() => {
  accounts.clear();
  avatar.mockReset();
});

async function seed() {
  const t = convexTest(schema, modules);
  const data = await t.run(async (ctx) => {
    const thumbnail = await ctx.storage.store(
      new Blob(["png"], { type: "image/png" }),
    );
    const challengeId = await ctx.db.insert("challenges", {
      day: "2026-10-01",
      opensAt: 0,
      closesAt: 86400000,
      generatorVersion: 1,
      stock: [],
    });
    const ids = [];
    for (let i = 0; i < 21; i++) {
      const owner = i < 18 ? "alice" : "bob";
      const projectId = await ctx.db.insert("projects", {
        owner,
        title: `Privé ${i}`,
        scene: JSON.stringify(emptyScene()),
        revision: 0,
        updatedAt: i,
      });
      ids.push(
        await ctx.db.insert("publications", {
          owner,
          projectId,
          title: `Création ${i}`,
          description: "Description publique",
          author: owner,
          active: i !== 17,
          publishedAt: i,
          thumbnail,
          ...(i === 16 ? { challengeId } : {}),
        }),
      );
    }
    await ctx.db.insert("projects", {
      owner: "alice",
      title: "Projet jamais publié",
      scene: JSON.stringify(emptyScene()),
      revision: 0,
      updatedAt: 100,
    });
    await ctx.db.insert("versions", {
      publicationId: ids[0],
      scene: JSON.stringify(emptyScene()),
      title: "Ancienne version",
      description: "",
      author: "alice",
      thumbnail,
      createdAt: 100,
    });
    return { ids };
  });
  return { t, ...data };
}

describe("Galeries publiques des créateurs", () => {
  it("pagine les reprises publiques directes de toutes les versions, sans exposer les projets privés", async () => {
    const { t, ids } = await seed();
    await t.run(async (ctx) => {
      const first = (await ctx.db.query("versions").first())!;
      const second = await ctx.db.insert("versions", {
        publicationId: ids[0],
        scene: first.scene,
        title: "Nouvelle version",
        description: "",
        author: "alice",
        thumbnail: first.thumbnail,
        createdAt: 200,
      });
      for (let i = 1; i <= 18; i++) {
        await ctx.db.patch(ids[i], {
          origin: {
            publicationId: ids[0],
            versionId: i % 2 ? first._id : second,
            title: first.title,
            author: "alice",
          },
        });
      }
      // A descendant belongs to its own source, not to the original's direct list.
      await ctx.db.patch(ids[20], {
        origin: {
          publicationId: ids[1],
          versionId: second,
          title: "Autre source",
          author: "alice",
        },
      });
      await ctx.db.insert("projects", {
        owner: "bob",
        title: "Reprise encore privée",
        scene: first.scene,
        revision: 0,
        updatedAt: 300,
        origin: {
          publicationId: ids[0],
          versionId: first._id,
          title: first.title,
          author: "alice",
        },
      });
    });
    const first = await t.query(api.projects.remixes, {
      publicationId: ids[0],
      paginationOpts: { numItems: 6, cursor: null },
    });
    expect(first.page.map((p) => p._id)).toEqual([
      ids[18],
      ...ids.slice(12, 17).reverse(),
    ]);
    expect(first.isDone).toBe(false);
    expect(first.page[1].challenge).not.toBeNull();
    expect(first.page[0].avatar).toEqual(defaultAvatar("bob"));
    expect(first.page[0].thumbnailUrl).toBeTruthy();
    expect(first.page[0]).not.toHaveProperty("scene");
    const last = await t.query(api.projects.remixes, {
      publicationId: ids[0],
      paginationOpts: { numItems: 24, cursor: first.continueCursor },
    });
    expect(last.page.map((p) => p._id)).toEqual(ids.slice(1, 12).reverse());
    expect(last.isDone).toBe(true);
    await t.run((ctx) => ctx.db.patch(ids[18], { active: false }));
    const query = () =>
      t.query(api.projects.remixes, {
        publicationId: ids[0],
        paginationOpts: { numItems: 24, cursor: null },
      });
    expect((await query()).page).toHaveLength(16);
    await t.run((ctx) => ctx.db.patch(ids[18], { active: true }));
    expect((await query()).page).toHaveLength(17);
    await t.run((ctx) => ctx.db.patch(ids[0], { active: false }));
    expect((await query()).page).toEqual([]);
    await t.run((ctx) => ctx.db.delete(ids[0]));
    expect((await query()).page).toEqual([]);
  });
  it("trie toute la galerie avant pagination et conserve le filtre auteur", async () => {
    const { t, ids } = await seed();
    await t.run(async (ctx) => {
      await ctx.db.patch(ids[0], { commentCount: 12 });
      await ctx.db.patch(ids[4], { commentCount: 12 });
      await ctx.db.patch(ids[18], { commentCount: 8 });
      await ctx.db.patch(ids[17], { commentCount: 100 }); // Private: always excluded.
      await ctx.db.patch(ids[19], { commentCount: 0 });
    });
    const first = await t.query(api.projects.gallery, {
      sort: "comments",
      paginationOpts: { numItems: 2, cursor: null },
    });
    expect(first.page.map((p) => p._id)).toEqual([ids[4], ids[0]]);
    expect(first.page.map((p) => p.commentCount)).toEqual([12, 12]);
    const rest = await t.query(api.projects.gallery, {
      sort: "comments",
      paginationOpts: { numItems: 24, cursor: first.continueCursor },
    });
    expect(rest.page[0]._id).toBe(ids[18]);
    expect(rest.page).toHaveLength(18);
    expect(rest.isDone).toBe(true);
    expect(rest.page.some((p) => p._id === ids[17])).toBe(false);
    expect(rest.page.slice(1).every((p) => p.commentCount === 0)).toBe(true);
    const owner = await t.query(api.projects.gallery, {
      sort: "comments",
      ownerId: "alice",
      paginationOpts: { numItems: 24, cursor: null },
    });
    expect(owner.page).toHaveLength(17);
    expect(owner.page.every((p) => p.owner === "alice")).toBe(true);
    expect(owner.page.slice(0, 2).map((p) => p._id)).toEqual([ids[4], ids[0]]);
    const oldest = await t.query(api.projects.gallery, {
      sort: "oldest",
      paginationOpts: { numItems: 2, cursor: null },
    });
    expect(oldest.page.map((p) => p._id)).toEqual(ids.slice(0, 2));
    await t.run((ctx) => ctx.db.patch(ids[18], { commentCount: 20 }));
    const updated = await t.query(api.projects.gallery, {
      sort: "comments",
      paginationOpts: { numItems: 2, cursor: null },
    });
    expect(updated.page[0]._id).toBe(ids[18]);
  });
  it("pagine par auteur les publications actives, défis compris, sans projets privés ni anciennes versions", async () => {
    const { t, ids } = await seed();
    const first = await t.query(api.projects.gallery, {
      ownerId: "alice",
      paginationOpts: { numItems: 12, cursor: null },
    });
    expect(first.page).toHaveLength(12);
    expect(first.isDone).toBe(false);
    expect(first.page.map((p) => p._id)).toEqual(ids.slice(5, 17).reverse());
    expect(first.page[0].challenge?.day).toBe("2026-10-01");
    expect(first.page.every((p) => p.owner === "alice")).toBe(true);
    expect(first.page[0]).not.toHaveProperty("scene");
    const last = await t.query(api.projects.gallery, {
      ownerId: "alice",
      paginationOpts: { numItems: 12, cursor: first.continueCursor },
    });
    expect(last.page.map((p) => p._id)).toEqual(ids.slice(0, 5).reverse());
    expect(last.isDone).toBe(true);
    const all = await t.query(api.projects.gallery, {
      paginationOpts: { numItems: 100, cursor: null },
    });
    expect(all.page).toHaveLength(20);
    expect(all.page[0].owner).toBe("bob");
    for (const ownerId of ["nobody", "", "malformed"]) {
      expect(
        (
          await t.query(api.projects.gallery, {
            ownerId,
            paginationOpts: { numItems: 12, cursor: null },
          })
        ).page,
      ).toEqual([]);
    }
  });
  it("reflète un retrait puis une republication, sans changer de propriétaire", async () => {
    const { t, ids } = await seed();
    await t
      .withIdentity({ subject: "alice" })
      .mutation(api.projects.withdraw, { id: ids[16] });
    const query = () =>
      t.query(api.projects.gallery, {
        ownerId: "alice",
        paginationOpts: { numItems: 24, cursor: null },
      });
    expect((await query()).page.some((p) => p._id === ids[16])).toBe(false);
    await t.run((ctx) =>
      ctx.db.patch(ids[16], { active: true, publishedAt: 200 }),
    );
    expect((await query()).page[0]._id).toBe(ids[16]);
  });
  it("expose le nom et l’avatar généré, sans photo ni données privées", async () => {
    const t = convexTest(schema, modules);
    for (const image of [
      undefined,
      "https://images.example.test/alice.png",
      "avatars/alice/photo",
      "avatars/other/private",
    ]) {
      accounts.set("alice", {
        _id: "alice",
        name: "Alice",
        image,
        email: "private@example.test",
        emailVerified: true,
      });
      expect(await t.query(api.projects.creator, { userId: "alice" })).toEqual({
        id: "alice",
        name: "Alice",
        avatar: defaultAvatar("alice"),
      });
    }
    expect(avatar).not.toHaveBeenCalled();
  });
  it("gère les comptes inexistants sans masquer les erreurs du service", async () => {
    const t = convexTest(schema, modules);
    for (const userId of ["", "missing", "malformed", "a".repeat(129)])
      expect(await t.query(api.projects.creator, { userId })).toBeNull();
    await expect(
      t.query(api.projects.creator, { userId: "unavailable" }),
    ).rejects.toThrow("Service unavailable");
  });
});

it("le sitemap ne révèle que des publications actives et des identités publiques existantes", async () => {
  const { t } = await seed();
  const result = await t.query(api.projects.sitemapPage, { cursor: null });
  expect(result.page.length).toBeGreaterThan(0);
  for (const item of result.page) {
    expect(Object.keys(item).sort()).toEqual(["id", "modified"]);
    expect(
      await t.run(async (ctx) => (await ctx.db.get(item.id))?.active),
    ).toBe(true);
  }
  expect(result.owners.every((owner) => accounts.has(owner))).toBe(true);
});

it("une URL de publication mal formée ne produit pas une erreur backend", async () => {
  const { t } = await seed();
  expect(
    await t.query(api.projects.creation, { id: "invalid-publication" }),
  ).toBeNull();
});
