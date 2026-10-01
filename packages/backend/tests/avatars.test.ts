import { describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { defaultAvatar } from "@clik/avatars";
import { emptyScene } from "@clik/scene";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { readAvatar, deleteAvatar } from "../convex/lib/avatars";

vi.mock("../convex/auth", () => ({
  authComponent: {
    safeGetAuthUser: async (ctx: any) => {
      const identity = await ctx.auth.getUserIdentity();
      return identity ? { _id: identity.subject, name: "Alice" } : null;
    },
    getAnyUserById: async (_ctx: unknown, id: string) => ({
      _id: id,
      name: "Alice",
      email: "private@example.test",
      image: "https://photo.test/legacy.png",
    }),
  },
}));
const modules = import.meta.glob("../convex/**/*.{ts,tsx,js}");
const first = {
  seed: "12345678-1234-4234-9234-123456789abc",
  version: 1 as const,
};
const second = {
  seed: "abcdefab-1234-4234-9234-123456789abc",
  version: 1 as const,
};

describe("Choix d’avatar", () => {
  it("donne un défaut stable sans écrire et réserve l’enregistrement au compte connecté", async () => {
    const t = convexTest(schema, modules);
    expect(await t.run((ctx) => readAvatar(ctx, "alice"))).toEqual(
      defaultAvatar("alice"),
    );
    expect(await t.run((ctx) => ctx.db.query("userAvatars").collect())).toEqual(
      [],
    );
    await expect(t.mutation(api.avatars.save, first)).rejects.toThrow(
      "Connexion requise",
    );
    const alice = t.withIdentity({ subject: "alice" });
    await expect(
      alice.mutation(api.avatars.save, { ...first, seed: "not-a-seed" }),
    ).rejects.toThrow("invalide");
    await expect(
      alice.mutation(api.avatars.save, { ...first, version: 2 as 1 }),
    ).rejects.toThrow();
    await expect(
      alice.mutation(api.avatars.save, {
        ...first,
        owner: "bob",
      } as typeof first),
    ).rejects.toThrow();
    await alice.mutation(api.avatars.save, first);
    await alice.mutation(api.avatars.save, second);
    expect(await t.run((ctx) => readAvatar(ctx, "alice"))).toEqual(second);
    expect(await t.run((ctx) => readAvatar(ctx, "bob"))).toEqual(
      defaultAvatar("bob"),
    );
    expect(
      await t.run((ctx) => ctx.db.query("userAvatars").collect()),
    ).toHaveLength(1);
    await t.run((ctx) => deleteAvatar(ctx, "alice"));
    await t.run((ctx) => deleteAvatar(ctx, "alice"));
    expect(await t.run((ctx) => ctx.db.query("userAvatars").collect())).toEqual(
      [],
    );
  });
  it("reflète le choix courant dans les profils, créations, défis et anciens commentaires", async () => {
    const t = convexTest(schema, modules);
    const { publicationId, challengeId } = await t.run(async (ctx) => {
      const thumbnail = await ctx.storage.store(new Blob(["png"]));
      const challengeId = await ctx.db.insert("challenges", {
        day: "2026-10-01",
        opensAt: 0,
        closesAt: 86400000,
        generatorVersion: 1,
        stock: [],
      });
      const projectId = await ctx.db.insert("projects", {
        owner: "alice",
        title: "Création",
        scene: JSON.stringify(emptyScene()),
        revision: 0,
        updatedAt: 1,
      });
      const publicationId = await ctx.db.insert("publications", {
        owner: "alice",
        projectId,
        title: "Création",
        description: "",
        author: "Ancien nom",
        active: true,
        publishedAt: 1,
        submittedAt: 1,
        challengeId,
        thumbnail,
      });
      const versionId = await ctx.db.insert("versions", {
        publicationId,
        scene: JSON.stringify(emptyScene()),
        title: "Création",
        description: "",
        author: "Ancien nom",
        thumbnail,
        createdAt: 1,
      });
      await ctx.db.patch(publicationId, { versionId });
      await ctx.db.insert("comments", {
        publicationId,
        owner: "alice",
        author: "Ancien nom",
        body: "Bonjour",
        createdAt: 1,
      });
      return { publicationId, challengeId };
    });
    const paginationOpts = { numItems: 12, cursor: null };
    for (const avatar of [first, second]) {
      await t
        .withIdentity({ subject: "alice" })
        .mutation(api.avatars.save, avatar);
      expect(await t.query(api.projects.creator, { userId: "alice" })).toEqual({
        id: "alice",
        name: "Alice",
        avatar,
      });
      expect(
        (await t.query(api.projects.gallery, { paginationOpts })).page[0]
          .avatar,
      ).toEqual(avatar);
      expect(
        (await t.query(api.projects.creation, { id: publicationId }))?.avatar,
      ).toEqual(avatar);
      expect(
        (
          await t.query(api.challenges.entries, {
            challengeId,
            sort: "recent",
            paginationOpts,
          })
        ).page[0].avatar,
      ).toEqual(avatar);
      expect(
        (await t.query(api.comments.list, { publicationId, paginationOpts }))
          .page[0].avatar,
      ).toEqual(avatar);
    }
  });
});
