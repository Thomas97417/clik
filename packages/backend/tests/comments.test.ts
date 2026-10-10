import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

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
const paginationOpts = { numItems: 20, cursor: null };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-10T10:00:00Z"));
});
afterEach(() => vi.useRealTimers());

async function setup() {
  const t = convexTest(schema, modules);
  const publicationId = await t.run(async (ctx) => {
    const projectId = await ctx.db.insert("projects", {
      owner: "alice",
      title: "Maison",
      scene: "{}",
      revision: 0,
      updatedAt: Date.now(),
    });
    const thumbnail = await ctx.storage.store(new Blob(["png"]));
    return ctx.db.insert("publications", {
      owner: "alice",
      projectId,
      title: "Maison",
      author: "Alice",
      description: "",
      active: true,
      publishedAt: Date.now(),
      thumbnail,
      commentCount: 0,
    });
  });
  const alice = t.withIdentity({ subject: "alice", name: "Alice" });
  const bob = t.withIdentity({ subject: "bob", name: "Bob" });
  const count = () =>
    t.run(async (ctx) => (await ctx.db.get(publicationId))!.commentCount);
  return { t, publicationId, alice, bob, count };
}

it("rattache les réponses et les réponses aux réponses à un seul fil, y compris pour les anciens commentaires", async () => {
  const { t, publicationId, alice, bob, count } = await setup();
  const root = await t.run(async (ctx) => {
    await ctx.db.patch(publicationId, { commentCount: 1 });
    // Existing documents have none of the optional discussion fields.
    return ctx.db.insert("comments", {
      publicationId,
      owner: "alice",
      author: "Alice",
      body: "Comment avez-vous fait le toit ?",
      createdAt: Date.now(),
    });
  });
  const reply = await bob.mutation(api.comments.add, {
    publicationId,
    replyToId: root,
    body: "  Avec une charnière.  ",
  });
  vi.setSystemTime(Date.now() + 1);
  const followup = await alice.mutation(api.comments.add, {
    publicationId,
    replyToId: reply,
    body: "Merci Bob !",
  });
  const roots = await t.query(api.comments.list, {
    publicationId,
    paginationOpts,
  });
  expect(roots.page).toHaveLength(1);
  expect(roots.page[0]).toMatchObject({ _id: root, replyCount: 2 });
  const replies = await t.query(api.comments.replies, {
    threadId: root,
    paginationOpts,
  });
  expect(replies.page.map((c) => c._id)).toEqual([followup, reply]);
  expect(replies.page[0]).toMatchObject({
    threadId: root,
    replyToId: reply,
    replyTo: { _id: reply, author: "Bob" },
  });
  expect(replies.page[1]).toMatchObject({
    threadId: root,
    replyToId: root,
    body: "Avec une charnière.",
  });
  expect(replies.page.every((c) => c.avatar)).toBe(true);
  expect(await count()).toBe(3);
  await bob.mutation(api.comments.edit, {
    id: reply,
    body: "Une charnière bleue.",
  });
  expect(await count()).toBe(3);
});

it("protège les réponses contre les accès anonymes, les autres publications et les parents absents", async () => {
  const { t, publicationId, alice, bob, count } = await setup();
  const root = await alice.mutation(api.comments.add, {
    publicationId,
    body: "Bonjour",
  });
  await expect(
    t.mutation(api.comments.add, {
      publicationId,
      replyToId: root,
      body: "Bravo",
    }),
  ).rejects.toThrow("Connexion");
  for (const body of ["   ", "x".repeat(1001)])
    await expect(
      bob.mutation(api.comments.add, { publicationId, replyToId: root, body }),
    ).rejects.toThrow("1 000");
  const otherPublication = await t.run(async (ctx) => {
    const { _id, _creationTime, ...publication } =
      (await ctx.db.get(publicationId))!;
    return ctx.db.insert("publications", publication);
  });
  await expect(
    bob.mutation(api.comments.add, {
      publicationId: otherPublication,
      replyToId: root,
      body: "Une réponse au mauvais endroit",
    }),
  ).rejects.toThrow("n’est plus disponible");
  expect(await count()).toBe(1);
  await alice.mutation(api.comments.remove, { id: root });
  await expect(
    bob.mutation(api.comments.add, {
      publicationId,
      replyToId: root,
      body: "Trop tard",
    }),
  ).rejects.toThrow("n’est plus disponible");
  expect(await count()).toBe(0);
});

it("pagine séparément les discussions et les réponses, et retire tout accès à une création masquée", async () => {
  const { t, publicationId, alice, bob, count } = await setup();
  const roots = [];
  for (let i = 0; i < 21; i++) {
    vi.setSystemTime(Date.now() + 1);
    roots.push(
      await alice.mutation(api.comments.add, {
        publicationId,
        body: `Question ${i}`,
      }),
    );
  }
  const replyIds = [];
  for (let i = 0; i < 21; i++) {
    vi.setSystemTime(Date.now() + 1);
    replyIds.push(
      await bob.mutation(api.comments.add, {
        publicationId,
        replyToId: roots[0],
        body: `Réponse ${i}`,
      }),
    );
  }
  const first = await t.query(api.comments.list, {
    publicationId,
    paginationOpts: { numItems: 100, cursor: null },
  });
  expect(first.page).toHaveLength(20);
  expect(first.page.every((c) => c.threadId === undefined)).toBe(true);
  const last = await t.query(api.comments.list, {
    publicationId,
    paginationOpts: { numItems: 20, cursor: first.continueCursor },
  });
  expect(last.page.map((c) => c._id)).toEqual([roots[0]]);
  expect(last.page[0].replyCount).toBe(21);
  const replies = await t.query(api.comments.replies, {
    threadId: roots[0],
    paginationOpts: { numItems: 100, cursor: null },
  });
  expect(replies.page).toHaveLength(20);
  expect(replies.page[0]._id).toBe(replyIds[20]);
  const older = await t.query(api.comments.replies, {
    threadId: roots[0],
    paginationOpts: { numItems: 20, cursor: replies.continueCursor },
  });
  expect(older.page.map((c) => c._id)).toEqual([replyIds[0]]);
  expect(await count()).toBe(42);
  expect(
    (
      await t.query(api.comments.replies, {
        threadId: replyIds[0],
        paginationOpts,
      })
    ).page,
  ).toEqual([]);

  await t.run((ctx) => ctx.db.patch(publicationId, { active: false }));
  expect(
    (await t.query(api.comments.list, { publicationId, paginationOpts })).page,
  ).toEqual([]);
  expect(
    (
      await t.query(api.comments.replies, {
        threadId: roots[0],
        paginationOpts,
      })
    ).page,
  ).toEqual([]);
  await expect(
    bob.mutation(api.comments.add, {
      publicationId,
      replyToId: roots[0],
      body: "Plus disponible",
    }),
  ).rejects.toThrow("indisponible");
  await expect(
    bob.mutation(api.comments.edit, { id: replyIds[0], body: "Modifié" }),
  ).rejects.toThrow("indisponible");
  await expect(
    bob.mutation(api.comments.remove, { id: replyIds[0] }),
  ).rejects.toThrow("indisponible");
});

it("conserve les réponses des autres après suppression du commentaire initial et nettoie le fil devenu vide", async () => {
  const { t, publicationId, alice, bob, count } = await setup();
  const root = await alice.mutation(api.comments.add, {
    publicationId,
    body: "Question initiale",
  });
  const reply = await bob.mutation(api.comments.add, {
    publicationId,
    replyToId: root,
    body: "Une réponse à conserver",
  });
  await expect(
    alice.mutation(api.comments.remove, { id: reply }),
  ).rejects.toThrow("indisponible");
  await alice.mutation(api.comments.remove, { id: root });
  const list = await t.query(api.comments.list, {
    publicationId,
    paginationOpts,
  });
  expect(list.page[0]).toMatchObject({
    _id: root,
    body: "",
    replyCount: 1,
    deletedAt: Date.now(),
  });
  expect(
    (await t.query(api.comments.replies, { threadId: root, paginationOpts }))
      .page[0].body,
  ).toBe("Une réponse à conserver");
  expect(await count()).toBe(1);
  await expect(
    alice.mutation(api.comments.edit, { id: root, body: "Restaurer" }),
  ).rejects.toThrow("indisponible");
  await expect(
    alice.mutation(api.comments.remove, { id: root }),
  ).rejects.toThrow("indisponible");

  const continued = await bob.mutation(api.comments.add, {
    publicationId,
    replyToId: root,
    body: "La discussion continue",
  });
  expect(await count()).toBe(2);
  await bob.mutation(api.comments.remove, { id: reply });
  await bob.mutation(api.comments.remove, { id: continued });
  expect(await count()).toBe(0);
  expect(
    (await t.query(api.comments.list, { publicationId, paginationOpts })).page,
  ).toEqual([]);
  expect(await t.run((ctx) => ctx.db.get(root))).toBeNull();
});

it("conserve une réponse à une réponse supprimée sans exposer son ancien texte", async () => {
  const { t, publicationId, alice, bob, count } = await setup();
  const root = await alice.mutation(api.comments.add, {
    publicationId,
    body: "Question",
  });
  const reply = await bob.mutation(api.comments.add, {
    publicationId,
    replyToId: root,
    body: "Premier avis",
  });
  const followup = await alice.mutation(api.comments.add, {
    publicationId,
    replyToId: reply,
    body: "Merci pour cet avis",
  });
  await bob.mutation(api.comments.remove, { id: reply });
  const replies = await t.query(api.comments.replies, {
    threadId: root,
    paginationOpts,
  });
  expect(replies.page).toHaveLength(1);
  expect(replies.page[0]).toMatchObject({
    _id: followup,
    threadId: root,
    replyToId: reply,
    replyTo: null,
  });
  expect(
    (await t.query(api.comments.list, { publicationId, paginationOpts }))
      .page[0].replyCount,
  ).toBe(1);
  expect(await count()).toBe(2);
});
