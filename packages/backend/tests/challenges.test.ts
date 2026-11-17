import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import {
  CATALOG,
  challengeDay,
  challengeStart,
  challengeStock,
  CHALLENGE_DAY_MS,
  CHALLENGE_GENERATOR_VERSION,
  emptyScene,
  makePart,
  type PartType,
} from "@clik/scene";
import type { Id } from "../convex/_generated/dataModel";
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
      scene: JSON.stringify({
        ...emptyScene(),
        nodes: [makePart(p.challenge!.stock[0].type as PartType, "#4079e8")],
      }),
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
  it("permet de recréer une participation supprimée sans récupérer ses votes", async () => {
    const { t, user, publish } = setup();
    const entry = await publish("alice");
    const voter = user("voter");
    await voter.mutation(api.challenges.vote, {
      publicationId: entry.id,
      voted: true,
    });
    await entry.u.mutation(api.projects.remove, { id: entry.projectId });
    expect(await t.query(api.projects.creation, { id: entry.id })).toBeNull();
    expect((await voter.query(api.challenges.day, { day })).choices).toEqual(
      [],
    );
    const replacement = await publish("alice");
    expect(replacement.projectId).not.toBe(entry.projectId);
    expect(replacement.id).not.toBe(entry.id);
    expect(await t.query(api.projects.creation, { id: entry.id })).toBeNull();
    expect(
      (await t.query(api.projects.creation, { id: replacement.id }))?.voteCount,
    ).toBe(0);
    expect((await voter.query(api.challenges.day, { day })).choices).toEqual(
      [],
    );
  });
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
    expect(info.challenge?.generatorVersion).toBe(CHALLENGE_GENERATOR_VERSION);
    expect(info.challenge?.stock).toEqual(challengeStock(day));
    expect(info.projectId).toBe(a);
    const otherId = await user("bob").mutation(api.challenges.start, { day });
    expect(
      (await user("bob").query(api.projects.get, { id: otherId })).challenge,
    ).toEqual(info.challenge);
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
  it("conserve le lot déjà ouvert en version 1 et renouvelle le lendemain en version 2", async () => {
    const { t, user } = setup();
    const stock = challengeStock(day, 1);
    const id = await t.run((ctx) =>
      ctx.db.insert("challenges", {
        day,
        opensAt: challengeStart(day),
        closesAt: challengeStart(day) + CHALLENGE_DAY_MS,
        generatorVersion: 1,
        stock,
      }),
    );
    const before = await t.run((ctx) => ctx.db.get(id));
    expect(await t.mutation(api.challenges.ensureToday, {})).toBe(id);
    const u = user("alice");
    const projectId = await u.mutation(api.challenges.start, { day });
    expect(await t.run((ctx) => ctx.db.get(id))).toEqual(before);
    // A legacy reference remains usable even when absent from the new draw.
    const legacyPart = stock.find(
      (item) => !challengeStock(day).some((next) => next.type === item.type),
    )!;
    const scene = JSON.stringify({
      ...emptyScene(),
      nodes: [makePart(legacyPart.type, "#4079e8")],
    });
    await u.mutation(api.projects.save, {
      id: projectId,
      title: "Ancien lot",
      scene,
      revision: 0,
    });
    vi.setSystemTime(challengeStart(day) + CHALLENGE_DAY_MS);
    const nextId = await t.mutation(api.challenges.ensureToday, {});
    const next = await t.run((ctx) => ctx.db.get(nextId));
    expect(next?.generatorVersion).toBe(CHALLENGE_GENERATOR_VERSION);
    expect(next?.stock).toEqual(challengeStock(challengeDay()));
    // Archived projects still validate against their persisted stock.
    await u.mutation(api.projects.save, {
      id: projectId,
      title: "Ancien lot recoloré",
      scene: JSON.stringify({
        ...JSON.parse(scene),
        nodes: [makePart(legacyPart.type, "#ff0051")],
      }),
      revision: 1,
    });
  });
  it("refuse un stock dépassé, même pour des pièces masquées et via les API ordinaires", async () => {
    const { user } = setup(),
      u = user("alice");
    const id = await u.mutation(api.challenges.start, { day });
    const stock = (await u.query(api.projects.get, { id })).challenge!.stock;
    const { type, quantity } = stock[0];
    const scene = JSON.stringify({
      ...emptyScene(),
      nodes: Array.from({ length: quantity + 1 }, () => ({
        ...makePart(type as PartType, "#4079e8"),
        hidden: true,
      })),
    });
    await expect(
      u.mutation(api.projects.save, { id, title: "Stock", scene, revision: 0 }),
    ).rejects.toThrow(`${quantity} exemplaires`);
    const absent = (Object.keys(CATALOG) as PartType[]).find(
      (type) => !stock.some((item) => item.type === type),
    )!;
    const invalid = JSON.stringify({
      ...emptyScene(),
      nodes: [makePart(absent, "#4079e8")],
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
  it("sauvegarde les 17 pièces d’un défi après leur recoloration personnalisée", async () => {
    const { user } = setup();
    const u = user("alice");
    const date = "2026-11-16";
    vi.setSystemTime(challengeStart(date) + 3600000);
    const id = await u.mutation(api.challenges.start, { day: date });
    const stock = (await u.query(api.projects.get, { id })).challenge!.stock;
    const scene = {
      ...emptyScene(),
      nodes: stock
        .flatMap(({ type, quantity }) =>
          Array.from({ length: quantity }, (_, i) =>
            makePart(type as PartType, "#4079e8", [i * 10, 0, 0]),
          ),
        )
        .slice(0, 17),
    };
    const revision = await u.mutation(api.projects.save, {
      id,
      title: "Mon défi",
      scene: JSON.stringify(scene),
      revision: 0,
    });
    scene.nodes = scene.nodes.map((node) => ({ ...node, color: "#ff0051" }));
    const nextRevision = await u.mutation(api.projects.save, {
      id,
      title: "Mon défi",
      scene: JSON.stringify(scene),
      revision,
    });
    const saved = await u.query(api.projects.get, { id });
    expect(saved.revision).toBe(nextRevision);
    expect(JSON.parse(saved.scene)).toEqual(scene);
  });
  it("refuse les dépôts vides et les dépôts à minuit, sans empêcher la sauvegarde privée", async () => {
    const { t, user, publish } = setup();
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
    const doc = (await entry.u.query(api.projects.get, { id: entry.projectId }))
      .scene;
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
