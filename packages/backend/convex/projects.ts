import { recordParticipation } from "./lib/rewards";
import { v, ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import {
  query,
  mutation,
  internalMutation,
  action,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { authComponent } from "./auth";
import { readAvatar, readAvatars } from "./lib/avatars";
import {
  validateScene,
  validateChallengeStock,
  inherited,
  type ChallengeStock,
  MAX_PROJECT_SOURCES,
} from "@clik/scene";
import { assertOpen } from "./challenges";
import { importInput } from "./schema";
type StoredImport = NonNullable<Doc<"projects">["imports"]>[number];
type Source = NonNullable<Doc<"projects">["origin"]>;
const uniqueSources = (sources: Source[]) => [
  ...new Map(sources.map((source) => [source.publicationId, source])).values(),
];
function assertSourceLimit(sources: Source[]) {
  if (uniqueSources(sources).length > MAX_PROJECT_SOURCES)
    throw new ConvexError("Limite de 1 000 sources atteinte.");
}

async function resolveImports(
  ctx: MutationCtx,
  owner: string,
  inputs: { id: string; title: string; receiptIds: Id<"importReceipts">[] }[],
  previous: StoredImport[] = [],
) {
  if (new TextEncoder().encode(JSON.stringify(inputs)).length > 512 * 1024)
    throw new ConvexError("Les sources du projet sont trop volumineuses.");
  const accepted = new Set(previous.flatMap((item) => item.receiptIds));
  const seen = new Set<string>();
  const receipts = new Map<Id<"importReceipts">, Doc<"importReceipts">>();
  const result: StoredImport[] = [];
  for (const item of inputs) {
    if (!item.id || item.id.length > 80 || seen.has(item.id))
      throw new ConvexError("Import invalide.");
    seen.add(item.id);
    const sources: Source[] = [];
    const receiptIds = [...new Set(item.receiptIds)];
    for (const id of receiptIds) {
      let receipt = receipts.get(id);
      if (!receipt) {
        receipt = (await ctx.db.get(id)) ?? undefined;
        if (!receipt || (receipt.owner !== owner && !accepted.has(id)))
          throw new ConvexError("Source d’import non autorisée.");
        receipts.set(id, receipt);
      }
      sources.push(...receipt.sources);
    }
    result.push({
      id: item.id,
      title: title(item.title),
      receiptIds,
      sources: uniqueSources(sources),
    });
  }
  if (new TextEncoder().encode(JSON.stringify(result)).length > 512 * 1024)
    throw new ConvexError("Les sources du projet sont trop volumineuses.");
  assertSourceLimit(result.flatMap((item) => item.sources));
  return result;
}

async function sourceAvailability(ctx: QueryCtx, sources: Source[]) {
  return Promise.all(
    uniqueSources(sources).map(async (source) => ({
      ...source,
      available: !!(await ctx.db.get(source.publicationId))?.active,
    })),
  );
}

async function syncPublicationSources(
  ctx: MutationCtx,
  p: Doc<"publications">,
) {
  const old = await ctx.db
    .query("publicationSources")
    .withIndex("by_publication", (q) => q.eq("publicationId", p._id))
    .collect();
  const sources = new Map<Id<"publications">, "remix" | "assembly">();
  for (const item of p.imports ?? [])
    for (const source of item.sources)
      if (source.publicationId !== p._id)
        sources.set(source.publicationId, "assembly");
  if (p.origin && p.origin.publicationId !== p._id)
    sources.set(p.origin.publicationId, "remix");
  for (const edge of old) {
    const kind = sources.get(edge.sourceId);
    if (kind) {
      await ctx.db.patch(edge._id, {
        kind,
        active: p.active,
        publishedAt: p.publishedAt,
      });
      sources.delete(edge.sourceId);
    } else await ctx.db.delete(edge._id);
  }
  for (const [sourceId, kind] of sources)
    await ctx.db.insert("publicationSources", {
      sourceId,
      publicationId: p._id,
      kind,
      active: p.active,
      publishedAt: p.publishedAt,
    });
}
async function user(ctx: QueryCtx | MutationCtx) {
  const u = await authComponent.safeGetAuthUser(ctx);
  if (!u) throw new ConvexError("Connexion requise.");
  return u;
}
export async function owned(ctx: QueryCtx | MutationCtx, id: Id<"projects">) {
  const u = await user(ctx),
    p = await ctx.db.get(id);
  if (!p || p.owner !== u._id) throw new ConvexError("Projet introuvable.");
  return p;
}
function title(value: string) {
  const s = value.trim();
  if (!s || s.length > 100)
    throw new ConvexError("Le titre doit contenir entre 1 et 100 caractères.");
  return s;
}
function scene(value: string) {
  return JSON.stringify(validateScene(JSON.parse(value)));
}
export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal("recent"), v.literal("oldest"))),
  },
  handler: async (ctx, a) => {
    const u = await user(ctx);
    // 12 × 512 KiB stays comfortably below the transaction read limit.
    const result = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("owner", u._id))
      .order(a.sort === "oldest" ? "asc" : "desc")
      .paginate({
        ...a.paginationOpts,
        numItems: Math.min(12, a.paginationOpts.numItems),
      });
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (p) => {
          const publication = await ctx.db
            .query("publications")
            .withIndex("by_project", (q) => q.eq("projectId", p._id))
            .unique();
          return {
            _id: p._id,
            title: p.title,
            scene: p.scene,
            revision: p.revision,
            updatedAt: p.updatedAt,
            origin: p.origin,
            originReceiptId: p.originReceiptId,
            imports: p.imports,
            challenge: p.challengeId ? await ctx.db.get(p.challengeId) : null,
            publicationId: publication?.active ? publication._id : null,
            description: publication?.description ?? "",
          };
        }),
      ),
    };
  },
});
export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, { id }) => {
    const p = await owned(ctx, id);
    const publication = await ctx.db
      .query("publications")
      .withIndex("by_project", (q) => q.eq("projectId", id))
      .unique();
    return {
      ...p,
      challenge: p.challengeId ? await ctx.db.get(p.challengeId) : null,
      publicationId: publication?.active ? publication._id : null,
      serverNow: Date.now(),
    };
  },
});
export const create = mutation({
  args: {
    title: v.string(),
    scene: v.string(),
    localSourceId: v.optional(v.string()),
    imports: v.optional(v.array(importInput)),
    originReceiptId: v.optional(v.id("importReceipts")),
    copyFrom: v.optional(v.id("projects")),
  },
  handler: async (ctx, a) => {
    const u = await user(ctx);
    const projectTitle = title(a.title),
      document = scene(a.scene);
    const copied = a.copyFrom ? await owned(ctx, a.copyFrom) : undefined;
    const imports = await resolveImports(
      ctx,
      u._id,
      a.imports ?? copied?.imports ?? [],
      copied?.imports,
    );
    let origin = copied?.origin;
    const originReceiptId = a.originReceiptId ?? copied?.originReceiptId;
    if (originReceiptId) {
      const receipt = await ctx.db.get(originReceiptId);
      if (!receipt || receipt.owner !== u._id || !receipt.origin)
        throw new ConvexError("Origine non autorisée.");
      origin = receipt.origin;
    }
    assertSourceLimit([
      ...(origin ? [origin] : []),
      ...imports.flatMap((item) => item.sources),
    ]);
    if (a.localSourceId !== undefined) {
      if (!a.localSourceId || a.localSourceId.length > 240)
        throw new ConvexError("Identifiant local invalide.");
      // Reuse an import after a failed publication, including across reloads.
      const existing = await ctx.db
        .query("projects")
        .withIndex("by_local_source", (q) =>
          q.eq("owner", u._id).eq("localSourceId", a.localSourceId),
        )
        .unique();
      if (existing) {
        if (
          existing.title !== projectTitle ||
          existing.scene !== document ||
          JSON.stringify(existing.imports ?? []) !== JSON.stringify(imports) ||
          existing.origin?.publicationId !== origin?.publicationId
        )
          throw new ConvexError(
            "Le projet en ligne a été modifié. Votre version locale a été conservée.",
          );
        return existing._id;
      }
    }
    return ctx.db.insert("projects", {
      owner: u._id,
      localSourceId: a.localSourceId,
      title: projectTitle,
      scene: document,
      revision: 0,
      updatedAt: Date.now(),
      origin,
      originReceiptId,
      imports,
    });
  },
});
export const save = mutation({
  args: {
    id: v.id("projects"),
    title: v.string(),
    scene: v.string(),
    revision: v.number(),
    imports: v.optional(v.array(importInput)),
  },
  handler: async (ctx, a) => {
    const p = await owned(ctx, a.id);
    if (p.revision !== a.revision)
      throw new ConvexError({
        code: "CONFLICT",
        message: "Ce projet a été modifié dans un autre onglet.",
      });
    if (p.challengeId) {
      if (a.imports?.length)
        throw new ConvexError("L’import est réservé à l’atelier libre.");
      const challenge = await ctx.db.get(p.challengeId);
      if (!challenge) throw new ConvexError("Défi introuvable.");
      validateChallengeStock(
        validateScene(JSON.parse(a.scene)),
        challenge.stock as ChallengeStock,
      );
    }
    const imports =
      a.imports === undefined
        ? p.imports
        : await resolveImports(ctx, p.owner, a.imports, p.imports);
    assertSourceLimit([
      ...(p.origin ? [p.origin] : []),
      ...(imports ?? []).flatMap((item) => item.sources),
    ]);
    await ctx.db.patch(a.id, {
      title: title(a.title),
      scene: scene(a.scene),
      revision: p.revision + 1,
      updatedAt: Date.now(),
      imports,
    });
    return p.revision + 1;
  },
});
export const prepareImport = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, { id }) => {
    const p = await owned(ctx, id);
    const document = validateScene(JSON.parse(p.scene));
    if (!document.nodes.some((n) => n.kind === "part"))
      throw new ConvexError("Ce projet ne contient aucune pièce à importer.");
    const publication = await ctx.db
      .query("publications")
      .withIndex("by_project", (q) => q.eq("projectId", id))
      .unique();
    const version =
      publication?.active && publication.versionId
        ? await ctx.db.get(publication.versionId)
        : null;
    const sources = uniqueSources([
      ...(publication?.active && version
        ? [
            {
              publicationId: publication._id,
              versionId: version._id,
              title: version.title,
              author: version.author,
            },
          ]
        : []),
      ...(p.origin ? [p.origin] : []),
      ...(p.imports ?? []).flatMap((item) => item.sources),
    ]);
    assertSourceLimit(sources);
    let originReceiptId = p.originReceiptId;
    if (p.origin && !originReceiptId) {
      originReceiptId = await ctx.db.insert("importReceipts", {
        owner: p.owner,
        title: p.title,
        origin: p.origin,
        sources: [p.origin],
        createdAt: Date.now(),
      });
      await ctx.db.patch(p._id, { originReceiptId });
    }
    const receiptId = await ctx.db.insert("importReceipts", {
      owner: p.owner,
      title: p.title,
      origin: p.origin,
      sources,
      createdAt: Date.now(),
    });
    return {
      title: p.title,
      scene: p.scene,
      receiptId,
      sources,
      originReceiptId,
    };
  },
});
export const sourcesAvailable = query({
  args: { ids: v.array(v.id("publications")) },
  handler: async (ctx, { ids }) => {
    if (ids.length > MAX_PROJECT_SOURCES)
      throw new ConvexError("Trop de sources.");
    return Promise.all(
      [...new Set(ids)].map(async (id) => ({
        id,
        available: !!(await ctx.db.get(id))?.active,
      })),
    );
  },
});
export const registerThumbnail = internalMutation({
  args: { projectId: v.id("projects"), storageId: v.id("_storage") },
  handler: async (ctx, a) => {
    const p = await owned(ctx, a.projectId);
    await ctx.db.insert("thumbnails", { owner: p.owner, ...a });
    return a.storageId;
  },
});
export const uploadThumbnail = action({
  args: { projectId: v.id("projects"), bytes: v.bytes() },
  handler: async (ctx, a): Promise<Id<"_storage">> => {
    await ctx.runQuery(api.projects.get, { id: a.projectId });
    const bytes = new Uint8Array(a.bytes);
    if (
      bytes.length > 512 * 1024 ||
      bytes.length < 24 ||
      ![137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b)
    )
      throw new ConvexError("Miniature PNG invalide (512 Kio maximum).");
    const view = new DataView(a.bytes);
    if (view.getUint32(16) > 1600 || view.getUint32(20) > 1600)
      throw new ConvexError("Miniature trop grande.");
    const storageId = await ctx.storage.store(
      new Blob([a.bytes], { type: "image/png" }),
    );
    try {
      return await ctx.runMutation(internal.projects.registerThumbnail, {
        projectId: a.projectId,
        storageId,
      });
    } catch (e) {
      await ctx.storage.delete(storageId);
      throw e;
    }
  },
});
export const publish = mutation({
  args: {
    id: v.id("projects"),
    title: v.string(),
    description: v.string(),
    thumbnail: v.id("_storage"),
    revision: v.number(),
  },
  handler: async (ctx, a) => {
    const p = await owned(ctx, a.id),
      u = await user(ctx);
    if (p.challengeId) {
      const challenge = await ctx.db.get(p.challengeId);
      assertOpen(challenge);
      const document = validateChallengeStock(
        validateScene(JSON.parse(p.scene)),
        challenge!.stock as ChallengeStock,
      );
      if (
        !document.nodes.some(
          (n) => n.kind === "part" && !inherited(document, n.id, "hidden"),
        )
      )
        throw new ConvexError(
          "Ajoutez au moins une pièce visible avant de participer.",
        );
      const other = await ctx.db
        .query("publications")
        .withIndex("by_owner_challenge", (q) =>
          q.eq("owner", p.owner).eq("challengeId", p.challengeId),
        )
        .unique();
      if (other && other.projectId !== p._id) {
        // A deleted entry may be replaced while this day's challenge is open.
        // Give it a new public identity: old versions, votes and comments stay unavailable.
        if (other.active || (await ctx.db.get(other.projectId)))
          throw new ConvexError("Vous avez déjà une participation à ce défi.");
        await ctx.db.delete(other._id);
      }
    }
    if (p.revision !== a.revision)
      throw new ConvexError(
        "La création a changé. Enregistrez puis réessayez.",
      );
    const thumb = await ctx.db
      .query("thumbnails")
      .withIndex("by_storage", (q) => q.eq("storageId", a.thumbnail))
      .unique();
    if (!thumb || thumb.owner !== p.owner || thumb.projectId !== p._id)
      throw new ConvexError("Miniature non autorisée.");
    if (a.description.length > 2000)
      throw new ConvexError("Description trop longue.");
    const existing = await ctx.db
      .query("publications")
      .withIndex("by_project", (q) => q.eq("projectId", p._id))
      .unique();
    const data = {
      owner: p.owner,
      projectId: p._id,
      title: title(a.title),
      description: a.description,
      author: u.name || "Créateur Clik",
      active: true,
      publishedAt: Date.now(),
      ...(p.challengeId
        ? {
            challengeId: p.challengeId,
            submittedAt: existing?.submittedAt ?? Date.now(),
            rankTie: existing?.rankTie ?? -Date.now(),
            updatedAt: Date.now(),
            voteCount: existing?.voteCount ?? 0,
            voteEpoch: existing?.voteEpoch ?? 0,
          }
        : {}),
      thumbnail: a.thumbnail,
      ...(p.origin ? { origin: p.origin } : {}),
      imports: p.imports ?? [],
    };
    const id = existing
      ? existing._id
      : await ctx.db.insert("publications", data);
    const versionId = await ctx.db.insert("versions", {
      publicationId: id,
      scene: p.scene,
      title: data.title,
      description: data.description,
      author: data.author,
      thumbnail: a.thumbnail,
      createdAt: data.publishedAt,
      ...(p.origin ? { origin: p.origin } : {}),
      imports: p.imports ?? [],
    });
    await ctx.db.patch(id, { ...data, versionId });
    await syncPublicationSources(ctx, (await ctx.db.get(id))!);
    if (p.challengeId) {
      await recordParticipation(ctx, p.owner, p.challengeId);
      const challenge = await ctx.db.get(p.challengeId);
      if (challenge?.rewardAt)
        await ctx.db.patch(id, {
          rewardEligible: true,
          rewardScore: existing?.rewardScore ?? 0,
        });
    }
    return id;
  },
});
export const withdraw = mutation({
  args: { id: v.id("publications") },
  handler: async (ctx, { id }) => {
    const u = await user(ctx),
      p = await ctx.db.get(id);
    if (!p || p.owner !== u._id)
      throw new ConvexError("Publication introuvable.");
    await withdrawPublication(ctx, p);
  },
});
async function withdrawPublication(ctx: MutationCtx, p: Doc<"publications">) {
  const challenge = p.challengeId ? await ctx.db.get(p.challengeId) : null;
  // Preserve an existing public participation if it is withdrawn before the
  // historical import reaches it. Already recorded entries are a no-op.
  if (p.active && p.challengeId)
    await recordParticipation(ctx, p.owner, p.challengeId);
  await ctx.db.patch(p._id, {
    ...(challenge?.rewardAt && Date.now() < challenge.rewardAt
      ? { rewardEligible: false, rewardScore: 0 }
      : {}),
    active: false,
    ...(p.challengeId
      ? { voteCount: 0, voteEpoch: (p.voteEpoch ?? 0) + 1 }
      : {}),
  });
  await syncPublicationSources(ctx, (await ctx.db.get(p._id))!);
}
export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, { id }) => {
    await owned(ctx, id);
    const publication = await ctx.db
      .query("publications")
      .withIndex("by_project", (q) => q.eq("projectId", id))
      .unique();
    // Keep inactive attribution/reward history; public queries cannot access it.
    if (publication?.active) await withdrawPublication(ctx, publication);
    await ctx.db.delete(id);
  },
});

async function publicCards(ctx: QueryCtx, publications: Doc<"publications">[]) {
  const avatars = await readAvatars(
    ctx,
    publications.map((p) => p.owner),
  );
  return Promise.all(
    publications.map(async (p) => ({
      _id: p._id,
      owner: p.owner,
      title: p.title,
      author: p.author,
      avatar: avatars.get(p.owner)!,
      publishedAt: p.publishedAt,
      challenge: p.challengeId ? await ctx.db.get(p.challengeId) : null,
      commentCount: p.commentCount ?? 0,
      isAssembly: !!p.imports?.length,
      thumbnailUrl: await ctx.storage.getUrl(p.thumbnail),
    })),
  );
}

export const remixes = query({
  args: {
    publicationId: v.id("publications"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.publicationId);
    if (!source?.active) return { page: [], isDone: true, continueCursor: "" };
    const migration = await ctx.db
      .query("lineageMigration")
      .withIndex("by_key", (q) => q.eq("key", "v1"))
      .unique();
    // A cursor remains tied to its original index while the backfill completes.
    const cursor = args.paginationOpts.cursor;
    const useEdges = cursor
      ? cursor.startsWith("edges:")
      : migration?.phase === "complete";
    if (useEdges) {
      const result = await ctx.db
        .query("publicationSources")
        .withIndex("by_source_recent", (q) =>
          q.eq("sourceId", args.publicationId).eq("active", true),
        )
        .order("desc")
        .paginate({
          ...args.paginationOpts,
          cursor: cursor ? cursor.slice("edges:".length) : null,
          numItems: Math.min(24, args.paginationOpts.numItems),
        });
      const rows = await Promise.all(
        result.page.map((edge) => ctx.db.get(edge.publicationId)),
      );
      const cards = await publicCards(
        ctx,
        rows.filter((p): p is Doc<"publications"> => !!p?.active),
      );
      return {
        ...result,
        continueCursor: `edges:${result.continueCursor}`,
        page: cards.map((card) => ({
          ...card,
          relationship: result.page.find(
            (edge) => edge.publicationId === card._id,
          )!.kind,
        })),
      };
    }
    // Match the source publication across all its versions; private projects
    // and withdrawn publications never appear in this public list.
    const results = await ctx.db
      .query("publications")
      .withIndex("by_origin_recent", (q) =>
        q.eq("origin.publicationId", args.publicationId).eq("active", true),
      )
      .order("desc")
      .paginate({
        ...args.paginationOpts,
        cursor: cursor?.startsWith("legacy:")
          ? cursor.slice("legacy:".length)
          : cursor,
        numItems: Math.min(24, args.paginationOpts.numItems),
      });
    return {
      ...results,
      continueCursor: `legacy:${results.continueCursor}`,
      page: (await publicCards(ctx, results.page)).map((card) => ({
        ...card,
        relationship: "remix" as const,
      })),
    };
  },
});

export const gallery = query({
  args: {
    paginationOpts: paginationOptsValidator,
    ownerId: v.optional(v.string()),
    sort: v.optional(
      v.union(v.literal("recent"), v.literal("oldest"), v.literal("comments")),
    ),
  },
  handler: async (ctx, a) => {
    const publications =
      a.ownerId !== undefined
        ? ctx.db
            .query("publications")
            .withIndex(
              a.sort === "comments" ? "by_owner_comments" : "by_owner_recent",
              (q) => q.eq("owner", a.ownerId!).eq("active", true),
            )
        : ctx.db
            .query("publications")
            .withIndex(
              a.sort === "comments" ? "by_comments" : "by_recent",
              (q) => q.eq("active", true),
            );
    const results = await publications
      .order(a.sort === "oldest" ? "asc" : "desc")
      .paginate({
        ...a.paginationOpts,
        numItems: Math.min(24, a.paginationOpts.numItems),
      });
    return {
      ...results,
      page: await publicCards(ctx, results.page),
    };
  },
});
/** Only the public identity is exposed; never return the Better Auth document. */
export const creator = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    if (!userId || userId.length > 128) return null;
    let account;
    try {
      account = await authComponent.getAnyUserById(ctx, userId);
    } catch (error) {
      // The adapter uses db.get, which rejects malformed IDs instead of returning null.
      if (
        /invalid.*(?:id|document)|(?:id|document).*invalid/i.test(String(error))
      )
        return null;
      throw error;
    }
    if (!account || typeof account.name !== "string") return null;
    return {
      id: account._id,
      name: account.name?.trim() || "Créateur Clik",
      avatar: await readAvatar(ctx, account._id),
    };
  },
});
export const creation = query({
  args: { id: v.string(), versionId: v.optional(v.id("versions")) },
  handler: async (ctx, a) => {
    const id = ctx.db.normalizeId("publications", a.id);
    if (!id) return null;
    const p = await ctx.db.get(id);
    if (!p?.active) return null;
    const version = await ctx.db.get(a.versionId ?? p.versionId!);
    if (!version || version.publicationId !== p._id) return null;
    const { imports, ...publicVersion } = version;
    return {
      ...publicVersion,
      isAssembly: !!imports?.length,
      sources: await sourceAvailability(
        ctx,
        [
          ...(version.origin ? [version.origin] : []),
          ...(imports ?? []).flatMap((item) => item.sources),
        ].filter((source) => source.publicationId !== p._id),
      ),
      owner: p.owner,
      avatar: await readAvatar(ctx, p.owner),
      challenge: p.challengeId ? await ctx.db.get(p.challengeId) : null,
      voteCount: p.voteCount ?? 0,
      commentCount: p.commentCount ?? 0,
      updatedAt: p.updatedAt,
      submittedAt: p.submittedAt,
      thumbnailUrl: await ctx.storage.getUrl(version.thumbnail),
    };
  },
});
export const remix = mutation({
  args: { id: v.id("publications"), versionId: v.id("versions") },
  handler: async (ctx, a) => {
    const u = await user(ctx),
      p = await ctx.db.get(a.id),
      version = await ctx.db.get(a.versionId);
    if (!p?.active || !version || version.publicationId !== p._id)
      throw new ConvexError("Cette version est indisponible.");
    const origin = {
      publicationId: p._id,
      versionId: version._id,
      author: version.author,
      title: version.title,
    };
    assertSourceLimit([
      origin,
      ...(version.imports ?? []).flatMap((item) => item.sources),
    ]);
    const originReceiptId = await ctx.db.insert("importReceipts", {
      owner: u._id,
      title: version.title,
      origin,
      sources: [origin],
      createdAt: Date.now(),
    });
    const imports: StoredImport[] = [];
    for (const item of version.imports ?? []) {
      const receiptId = await ctx.db.insert("importReceipts", {
        owner: u._id,
        title: item.title,
        sources: item.sources,
        createdAt: Date.now(),
      });
      imports.push({ ...item, receiptIds: [receiptId] });
    }
    return ctx.db.insert("projects", {
      owner: u._id,
      title: title(`${version.title.slice(0, 85)} · reprise`),
      scene: version.scene,
      revision: 0,
      updatedAt: Date.now(),
      origin,
      originReceiptId,
      imports,
    });
  },
});

/** Bounded, restartable backfill; readers keep the old index until it is complete. */
export const migrateLineage = internalMutation({
  args: {},
  handler: async (ctx) => {
    let state = await ctx.db
      .query("lineageMigration")
      .withIndex("by_key", (q) => q.eq("key", "v1"))
      .unique();
    if (!state) {
      const id = await ctx.db.insert("lineageMigration", {
        key: "v1",
        phase: "projects",
      });
      state = (await ctx.db.get(id))!;
    }
    if (state.phase === "complete") return true;
    if (state.phase === "projects") {
      const page = await ctx.db
        .query("projects")
        .paginate({ cursor: state.cursor ?? null, numItems: 12 });
      for (const p of page.page)
        if (p.origin && !p.originReceiptId) {
          const originReceiptId = await ctx.db.insert("importReceipts", {
            owner: p.owner,
            title: p.title,
            origin: p.origin,
            sources: [p.origin],
            createdAt: Date.now(),
          });
          await ctx.db.patch(p._id, { originReceiptId });
        }
      await ctx.db.patch(
        state._id,
        page.isDone
          ? { phase: "publications", cursor: undefined }
          : { cursor: page.continueCursor },
      );
    } else {
      const page = await ctx.db
        .query("publications")
        .paginate({ cursor: state.cursor ?? null, numItems: 12 });
      for (const p of page.page) await syncPublicationSources(ctx, p);
      await ctx.db.patch(
        state._id,
        page.isDone
          ? { phase: "complete", cursor: undefined }
          : { cursor: page.continueCursor },
      );
    }
    await ctx.scheduler.runAfter(0, internal.projects.migrateLineage, {});
    return false;
  },
});

/** Sitemap metadata only; never read project drafts or full version scenes. */
export const sitemapPage = query({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, { cursor }) => {
    const result = await ctx.db
      .query("publications")
      .withIndex("by_recent", (q) => q.eq("active", true))
      .order("asc")
      .paginate({ cursor, numItems: 250 });
    const owners = [...new Set(result.page.map((p) => p.owner))];
    const available = await Promise.all(
      owners.map(async (owner) => {
        try {
          return (await authComponent.getAnyUserById(ctx, owner))
            ? owner
            : null;
        } catch (error) {
          if (
            /invalid.*(?:id|document)|(?:id|document).*invalid/i.test(
              String(error),
            )
          )
            return null;
          throw error;
        }
      }),
    );
    return {
      ...result,
      page: result.page.map((p) => ({
        id: p._id,
        modified: p.updatedAt ?? p.publishedAt,
      })),
      owners: available.filter((owner): owner is string => owner !== null),
    };
  },
});
