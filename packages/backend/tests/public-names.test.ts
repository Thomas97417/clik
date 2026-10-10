import { expect, it } from "vitest";
import { convexTest } from "convex-test";
import betterAuth from "@convex-dev/better-auth/test";
import { emptyScene } from "@clik/scene";
import schema from "../convex/schema";
import { api, components } from "../convex/_generated/api";
import { readAuthorNames } from "../convex/lib/authorNames";

const modules = import.meta.glob("../convex/**/*.{ts,tsx,js}");
const paginationOpts = { numItems: 24, cursor: null };

async function setup() {
  const t = convexTest(schema, modules);
  betterAuth.register(t);
  const createAccount = (name: string, email: string) =>
    t.mutation(components.betterAuth.adapter.create, {
      input: {
        model: "user",
        data: {
          name,
          email,
          emailVerified: true,
          image: "https://private.example.test/profile.png",
          createdAt: 1,
          updatedAt: 1,
        },
      },
    });
  const alice = await createAccount(
    "Ancien pseudo Alice",
    "alice@example.test",
  );
  const bob = await createAccount("Ancien pseudo Bob", "bob@example.test");
  const data = await t.run(async (ctx) => {
    const thumbnail = await ctx.storage.store(new Blob(["png"]));
    const challengeId = await ctx.db.insert("challenges", {
      day: "2026-10-01",
      opensAt: 0,
      closesAt: 86400000,
      generatorVersion: 1,
      stock: [],
      rewardStatus: "complete",
    });
    const publish = async (owner: string, author: string, title: string) => {
      const projectId = await ctx.db.insert("projects", {
        owner,
        title,
        scene: JSON.stringify(emptyScene()),
        revision: 0,
        updatedAt: 1,
      });
      const id = await ctx.db.insert("publications", {
        owner,
        author,
        projectId,
        title,
        description: "",
        active: true,
        challengeId,
        thumbnail,
        publishedAt: 1,
      });
      const versionId = await ctx.db.insert("versions", {
        publicationId: id,
        author,
        title,
        description: "",
        scene: JSON.stringify(emptyScene()),
        thumbnail,
        createdAt: 1,
      });
      await ctx.db.patch(id, { versionId });
      return { id, versionId };
    };
    const original = await publish(alice._id, alice.name, "Maison initiale");
    const remix = await publish(bob._id, bob.name, "Maison reprise");
    const origin = {
      publicationId: original.id,
      versionId: original.versionId,
      author: alice.name,
      title: "Maison initiale",
    };
    await ctx.db.patch(remix.id, { origin });
    await ctx.db.patch(remix.versionId, {
      origin,
      imports: [
        { id: "import", title: "Maison", receiptIds: [], sources: [origin] },
      ],
    });
    const currentVersionId = await ctx.db.insert("versions", {
      publicationId: original.id,
      author: alice.name,
      title: "Maison terminée",
      description: "Nouvelle version",
      scene: JSON.stringify(emptyScene()),
      thumbnail,
      createdAt: 2,
    });
    await ctx.db.patch(original.id, {
      versionId: currentVersionId,
      commentCount: 3,
    });
    await ctx.db.insert("challengeAwards", {
      challengeId,
      publicationId: original.id,
      owner: alice._id,
      rank: 1,
      score: 7,
    });
    const threadId = await ctx.db.insert("comments", {
      publicationId: original.id,
      owner: alice._id,
      author: alice.name,
      body: "Comment trouvez-vous cette maison ?",
      replyCount: 2,
      createdAt: 1,
    });
    const replyId = await ctx.db.insert("comments", {
      publicationId: original.id,
      threadId,
      replyToId: threadId,
      owner: bob._id,
      author: bob.name,
      body: "Très belle !",
      createdAt: 2,
    });
    await ctx.db.insert("comments", {
      publicationId: original.id,
      threadId,
      replyToId: replyId,
      owner: alice._id,
      author: alice.name,
      body: "Merci !",
      createdAt: 3,
    });
    return { original, remix, challengeId, threadId };
  });
  const rename = (owner: string, name: string) =>
    t.mutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: owner }],
        update: { name, updatedAt: 3 },
      },
    });
  return { t, alice, bob, rename, ...data };
}

it("affiche le pseudo actuel sur les anciennes publications, versions, crédits, défis et discussions sans republier", async () => {
  const { t, alice, bob, rename, original, remix, challengeId, threadId } =
    await setup();
  expect(
    (await t.query(api.projects.creation, { id: original.id }))?.author,
  ).toBe(alice.name);
  await rename(alice._id, "  Alice construit  ");
  await rename(bob._id, "Bob bâtisseur");

  const gallery = await t.query(api.projects.gallery, { paginationOpts });
  expect(gallery.page.find((p) => p.owner === alice._id)?.author).toBe(
    "Alice construit",
  );
  expect(gallery.page.find((p) => p.owner === bob._id)?.author).toBe(
    "Bob bâtisseur",
  );
  const personal = await t.query(api.projects.gallery, {
    ownerId: alice._id,
    paginationOpts,
  });
  expect(personal.page.map((p) => p.author)).toEqual(["Alice construit"]);
  expect(
    (await t.query(api.projects.creator, { userId: alice._id }))?.name,
  ).toBe("Alice construit");
  for (const versionId of [undefined, original.versionId]) {
    const creation = await t.query(api.projects.creation, {
      id: original.id,
      versionId,
    });
    expect(creation).toMatchObject({
      author: "Alice construit",
      owner: alice._id,
      title: versionId ? "Maison initiale" : "Maison terminée",
    });
  }
  const copied = await t.query(api.projects.creation, { id: remix.id });
  expect(copied?.author).toBe("Bob bâtisseur");
  expect(copied?.origin).toMatchObject({
    author: "Alice construit",
    title: "Maison initiale",
  });
  expect(copied?.sources).toHaveLength(1);
  expect(copied?.sources[0]).toMatchObject({
    author: "Alice construit",
    available: true,
  });
  const remixes = await t.query(api.projects.remixes, {
    publicationId: original.id,
    paginationOpts,
  });
  expect(remixes.page.map((p) => p.author)).toEqual(["Bob bâtisseur"]);
  for (const sort of ["recent", "votes"] as const) {
    const entries = await t.query(api.challenges.entries, {
      challengeId,
      sort,
      paginationOpts,
    });
    expect(entries.page.find((p) => p.owner === alice._id)?.author).toBe(
      "Alice construit",
    );
  }
  const podium = await t.query(api.rewards.podium, {
    challengeId,
    paginationOpts,
  });
  expect(podium.page[0].author).toBe("Alice construit");
  const comments = await t.query(api.comments.list, {
    publicationId: original.id,
    paginationOpts,
  });
  expect(comments.page[0].author).toBe("Alice construit");
  const replies = await t.query(api.comments.replies, {
    threadId,
    paginationOpts,
  });
  expect(replies.page.map((c) => c.author)).toEqual([
    "Alice construit",
    "Bob bâtisseur",
  ]);
  expect(replies.page.map((c) => c.replyTo?.author)).toEqual([
    "Bob bâtisseur",
    "Alice construit",
  ]);

  // Identity changes must not overwrite version content or stored credit history.
  await t.run(async (ctx) => {
    expect((await ctx.db.get(original.id))?.author).toBe(alice.name);
    expect((await ctx.db.get(original.versionId))?.author).toBe(alice.name);
    expect((await ctx.db.get(remix.versionId))?.origin?.author).toBe(
      alice.name,
    );
    expect((await ctx.db.get(threadId))?.author).toBe(alice.name);
  });
  const publicData = JSON.stringify({
    gallery,
    copied,
    podium,
    comments,
    replies,
  });
  expect(publicData).not.toContain("alice@example.test");
  expect(publicData).not.toContain("bob@example.test");
  expect(publicData).not.toContain("private.example.test");
});

it("conserve l’attribution si le compte n’existe plus et accepte les anciennes identités sans casser la page", async () => {
  const { t, alice, original, remix, threadId } = await setup();
  await t.mutation(components.betterAuth.adapter.deleteOne, {
    input: { model: "user", where: [{ field: "_id", value: alice._id }] },
  });
  expect(
    (await t.query(api.projects.creation, { id: original.id }))?.author,
  ).toBe(alice.name);
  expect(
    (await t.query(api.projects.creation, { id: remix.id }))?.sources[0].author,
  ).toBe(alice.name);
  expect(
    (
      await t.query(api.comments.list, {
        publicationId: original.id,
        paginationOpts,
      })
    ).page[0].author,
  ).toBe(alice.name);
  expect(
    (await t.query(api.comments.replies, { threadId, paginationOpts })).page[1]
      .replyTo?.author,
  ).toBe(alice.name);
  expect(await t.query(api.projects.creator, { userId: alice._id })).toBeNull();
  await t.run(async (ctx) => {
    const names = await readAuthorNames(ctx, [
      "",
      "malformed",
      "a".repeat(129),
    ]);
    expect([...names.values()]).toEqual([undefined, undefined, undefined]);
  });
});
