import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import {
  challengeDay,
  challengeStart,
  CHALLENGE_DAY_MS,
  emptyScene,
  makePart,
} from "@clik/scene";
import type { Id } from "../convex/_generated/dataModel";
vi.mock("../convex/auth", () => ({
  authComponent: {
    safeGetAuthUser: async (ctx: any) => {
      const id = await ctx.auth.getUserIdentity();
      return id ? { _id: id.subject, name: id.name ?? "Auteur" } : null;
    },
  },
}));
const modules = import.meta.glob("../convex/**/*.{ts,tsx,js}");
const day = "2026-10-01";
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(challengeStart(day) + 3600000);
});
afterEach(() => vi.useRealTimers());
function setup() {
  const t = convexTest(schema, modules);
  const user = (id: string) => t.withIdentity({ subject: id, name: id });
  const doc = JSON.stringify({
    ...emptyScene(),
    nodes: [makePart("brick-2x4", "#4079e8")],
  });
  const publish = async (owner: string, date = challengeDay()) => {
    const u = user(owner),
      projectId = await u.mutation(api.challenges.start, { day: date });
    const p = await u.query(api.projects.get, { id: projectId });
    const revision = await u.mutation(api.projects.save, {
      id: projectId,
      title: owner,
      scene: doc,
      revision: p.revision,
    });
    const thumbnail = await t.run((ctx) =>
      ctx.storage.store(new Blob(["test"])),
    );
    await u.mutation(internal.projects.registerThumbnail, {
      projectId,
      storageId: thumbnail,
    });
    const id = await u.mutation(api.projects.publish, {
      id: projectId,
      title: owner,
      description: "",
      revision,
      thumbnail,
    });
    return { id, projectId, thumbnail, revision, u };
  };
  return { t, user, publish, doc };
}
describe("Défis et publications", () => {
  it("initialise une seule journée UTC et un seul projet par compte", async () => {
    const { t, user } = setup();
    const ids = await Promise.all([
      t.mutation(api.challenges.ensureToday, {}),
      t.mutation(api.challenges.ensureToday, {}),
    ]);
    expect(ids[0]).toBe(ids[1]);
    const u = user("alice");
    const a = await u.mutation(api.challenges.start, { day });
    expect(await u.mutation(api.challenges.start, { day })).toBe(a);
    const info = await u.query(api.challenges.day, { day });
    expect(info.challenge?.closesAt).toBe(
      challengeStart(day) + CHALLENGE_DAY_MS,
    );
    expect(info.challenge?.stock.reduce((n, x) => n + x.quantity, 0)).toBe(100);
    expect(info.projectId).toBe(a);
    await expect(t.mutation(api.challenges.start, { day })).rejects.toThrow(
      "Connexion",
    );
    await expect(
      u.mutation(api.challenges.start, { day: "2026-09-30" }),
    ).rejects.toThrow("Seul le défi");
    await expect(
      t.query(api.challenges.day, { day: "2026-02-30" }),
    ).rejects.toThrow("Date");
  });
  it("refuse un stock dépassé, même pour des pièces masquées et via les API ordinaires", async () => {
    const { user } = setup(),
      u = user("alice");
    const id = await u.mutation(api.challenges.start, { day });
    const scene = JSON.stringify({
      ...emptyScene(),
      nodes: Array.from({ length: 17 }, () => ({
        ...makePart("brick-1x1", "#4079e8"),
        hidden: true,
      })),
    });
    await expect(
      u.mutation(api.projects.save, { id, title: "Stock", scene, revision: 0 }),
    ).rejects.toThrow("16 exemplaires");
    const invalid = JSON.stringify({
      ...emptyScene(),
      nodes: [makePart("brick-2x8", "#4079e8")],
    });
    await expect(
      u.mutation(api.projects.save, {
        id,
        title: "Stock",
        scene: invalid,
        revision: 0,
      }),
    ).rejects.toThrow("absente du lot");
    const p = await u.query(api.projects.get, { id });
    expect(p.revision).toBe(0);
  });
  it("refuse les dépôts vides et les dépôts à minuit, sans empêcher la sauvegarde privée", async () => {
    const { t, user, publish, doc } = setup();
    const u = user("empty"),
      id = await u.mutation(api.challenges.start, { day });
    const thumb = await t.run((ctx) => ctx.storage.store(new Blob(["test"])));
    await u.mutation(internal.projects.registerThumbnail, {
      projectId: id,
      storageId: thumb,
    });
    await expect(
      u.mutation(api.projects.publish, {
        id,
        title: "Vide",
        description: "",
        thumbnail: thumb,
        revision: 0,
      }),
    ).rejects.toThrow("visible");
    const entry = await publish("alice");
    vi.setSystemTime(challengeStart(day) + CHALLENGE_DAY_MS);
    const revision = await entry.u.mutation(api.projects.save, {
      id: entry.projectId,
      title: "Privé",
      scene: doc,
      revision: entry.revision,
    });
    await expect(
      entry.u.mutation(api.projects.publish, {
        id: entry.projectId,
        title: "Trop tard",
        description: "",
        thumbnail: entry.thumbnail,
        revision,
      }),
    ).rejects.toThrow("closes");
    expect(
      (await t.query(api.projects.creation, { id: entry.id }))?.title,
    ).toBe("alice");
  });
  it("conserve votes, commentaires et première date lors des mises à jour", async () => {
    const { t, user, publish } = setup(),
      entry = await publish("alice"),
      bob = user("bob");
    await bob.mutation(api.challenges.vote, {
      publicationId: entry.id,
      voted: true,
    });
    await bob.mutation(api.comments.add, {
      publicationId: entry.id,
      body: "Super idée !",
    });
    const before = await t.query(api.projects.creation, { id: entry.id });
    vi.setSystemTime(Date.now() + 1000);
    const id = await entry.u.mutation(api.projects.publish, {
      id: entry.projectId,
      title: "Évolution",
      description: "",
      revision: entry.revision,
      thumbnail: entry.thumbnail,
    });
    const after = await t.query(api.projects.creation, { id });
    expect(id).toBe(entry.id);
    expect(after).toMatchObject({
      voteCount: 1,
      commentCount: 1,
      submittedAt: before?.submittedAt,
      title: "Évolution",
    });
    expect(after?._id).not.toBe(before?._id);
    expect(after!.updatedAt).toBeGreaterThan(before!.updatedAt!);
  });
});
describe("Votes", () => {
  it("limite les votes concurrents à trois, permet de changer et interdit l’auto-vote", async () => {
    const { t, user, publish } = setup();
    const entries = await Promise.all(
      ["a", "b", "c", "d"].map((name) => publish(name)),
    );
    const voter = user("voter");
    const attempts = await Promise.allSettled(
      entries.map((e) =>
        voter.mutation(api.challenges.vote, {
          publicationId: e.id,
          voted: true,
        }),
      ),
    );
    expect(attempts.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    const info = await voter.query(api.challenges.day, { day });
    expect(info.choices).toHaveLength(3);
    const first = info.choices[0].publicationId;
    await voter.mutation(api.challenges.vote, {
      publicationId: first,
      voted: true,
    });
    expect(
      (await t.query(api.projects.creation, { id: first }))?.voteCount,
    ).toBe(1);
    await voter.mutation(api.challenges.vote, {
      publicationId: first,
      voted: false,
    });
    const fourth = entries.find(
      (e) => !info.choices.some((c) => c.publicationId === e.id),
    )!;
    await voter.mutation(api.challenges.vote, {
      publicationId: fourth.id,
      voted: true,
    });
    await expect(
      entries[0].u.mutation(api.challenges.vote, {
        publicationId: entries[0].id,
        voted: true,
      }),
    ).rejects.toThrow("propre");
    await expect(
      t.mutation(api.challenges.vote, { publicationId: first, voted: true }),
    ).rejects.toThrow("Connexion");
  });
  it("accorde neuf votes sur trois archives, sans renouveler leurs quotas", async () => {
    const { user, publish } = setup(),
      ids: Id<"publications">[][] = [];
    for (let n = 0; n < 3; n++) {
      vi.setSystemTime(challengeStart(day) + n * CHALLENGE_DAY_MS + 1000);
      ids.push(
        await Promise.all(
          ["a", "b", "c", "d"].map(async (name) => (await publish(name)).id),
        ),
      );
    }
    vi.setSystemTime(challengeStart(day) + 4 * CHALLENGE_DAY_MS);
    const voter = user("voter");
    for (const entries of ids) {
      for (const publicationId of entries.slice(0, 3))
        await voter.mutation(api.challenges.vote, {
          publicationId,
          voted: true,
        });
      await expect(
        voter.mutation(api.challenges.vote, {
          publicationId: entries[3],
          voted: true,
        }),
      ).rejects.toThrow("trois votes");
    }
  });
  it("libère les places au retrait et ne ressuscite pas les votes à la republication", async () => {
    const { user, publish, t } = setup(),
      entry = await publish("alice"),
      voter = user("voter");
    await voter.mutation(api.challenges.vote, {
      publicationId: entry.id,
      voted: true,
    });
    await entry.u.mutation(api.projects.withdraw, { id: entry.id });
    expect(
      (await voter.query(api.challenges.day, { day })).choices,
    ).toHaveLength(0);
    await entry.u.mutation(api.projects.publish, {
      id: entry.projectId,
      title: "Retour",
      description: "",
      thumbnail: entry.thumbnail,
      revision: entry.revision,
    });
    expect(
      (await voter.query(api.challenges.day, { day })).choices,
    ).toHaveLength(0);
    expect(
      (await t.query(api.projects.creation, { id: entry.id }))?.voteCount,
    ).toBe(0);
    await voter.mutation(api.challenges.vote, {
      publicationId: entry.id,
      voted: true,
    });
    expect(
      (await t.query(api.projects.creation, { id: entry.id }))?.voteCount,
    ).toBe(1);
  });
  it("classe les égalités selon la première participation", async () => {
    const { t, publish } = setup(),
      first = await publish("first");
    vi.setSystemTime(Date.now() + 1000);
    await publish("second");
    const info = await t.query(api.challenges.day, { day });
    const page = await t.query(api.challenges.entries, {
      challengeId: info.challenge!._id,
      sort: "votes",
      paginationOpts: { numItems: 12, cursor: null },
    });
    expect(page.page[0]._id).toBe(first.id);
  });
});
describe("Commentaires publics", () => {
  it("valide les textes, les droits et le retrait, y compris après la clôture", async () => {
    const { t, user, publish } = setup(),
      entry = await publish("alice"),
      bob = user("bob");
    vi.setSystemTime(challengeStart(day) + 3 * CHALLENGE_DAY_MS);
    await expect(
      t.mutation(api.comments.add, {
        publicationId: entry.id,
        body: "Bonjour",
      }),
    ).rejects.toThrow("Connexion");
    for (const body of ["   ", "x".repeat(1001)])
      await expect(
        bob.mutation(api.comments.add, { publicationId: entry.id, body }),
      ).rejects.toThrow("1 000");
    const id = await bob.mutation(api.comments.add, {
      publicationId: entry.id,
      body: "  Bravo  ",
    });
    await expect(
      entry.u.mutation(api.comments.edit, { id, body: "Autre" }),
    ).rejects.toThrow("indisponible");
    await expect(entry.u.mutation(api.comments.remove, { id })).rejects.toThrow(
      "indisponible",
    );
    await bob.mutation(api.comments.edit, { id, body: "J’aime les couleurs" });
    const list = await t.query(api.comments.list, {
      publicationId: entry.id,
      paginationOpts: { numItems: 20, cursor: null },
    });
    expect(list.page[0]).toMatchObject({
      body: "J’aime les couleurs",
      updatedAt: Date.now(),
    });
    await bob.mutation(api.comments.remove, { id });
    expect(
      (await t.query(api.projects.creation, { id: entry.id }))?.commentCount,
    ).toBe(0);
    await entry.u.mutation(api.projects.withdraw, { id: entry.id });
    await expect(
      bob.mutation(api.comments.add, {
        publicationId: entry.id,
        body: "Bravo",
      }),
    ).rejects.toThrow("indisponible");
  });
});

it("ouvre les commentaires aux publications classiques, avec pagination et sans votes de défi", async () => {
  const { t, user, doc } = setup(),
    alice = user("alice"),
    bob = user("bob");
  const projectId = await alice.mutation(api.projects.create, {
    title: "Libre",
    scene: doc,
  });
  const thumbnail = await t.run((ctx) => ctx.storage.store(new Blob(["test"])));
  await alice.mutation(internal.projects.registerThumbnail, {
    projectId,
    storageId: thumbnail,
  });
  const id = await alice.mutation(api.projects.publish, {
    id: projectId,
    title: "Libre",
    description: "",
    thumbnail,
    revision: 0,
  });
  await expect(
    bob.mutation(api.challenges.vote, { publicationId: id, voted: true }),
  ).rejects.toThrow("indisponible");
  for (let i = 0; i < 21; i++) {
    vi.setSystemTime(Date.now() + 1);
    await bob.mutation(api.comments.add, {
      publicationId: id,
      body: `<script>commentaire ${i}</script>`,
    });
  }
  const first = await t.query(api.comments.list, {
    publicationId: id,
    paginationOpts: { numItems: 20, cursor: null },
  });
  expect(first.page).toHaveLength(20);
  expect(first.page[0].body).toContain("20");
  expect(first.isDone).toBe(false);
  const last = await t.query(api.comments.list, {
    publicationId: id,
    paginationOpts: { numItems: 20, cursor: first.continueCursor },
  });
  expect(last.page).toHaveLength(1);
  expect((await t.query(api.projects.creation, { id }))?.commentCount).toBe(21);
  await alice.mutation(api.projects.withdraw, { id });
  expect(
    (
      await t.query(api.comments.list, {
        publicationId: id,
        paginationOpts: { numItems: 20, cursor: null },
      })
    ).page,
  ).toHaveLength(0);
});
