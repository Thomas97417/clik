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
