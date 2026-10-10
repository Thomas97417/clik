import { publicHttpFixture } from "./public-http";
import {
  CROWNS,
  RINGS,
  defaultAvatar,
  type AvatarDescriptor,
} from "@clik/avatars";
import type { Page } from "@playwright/test";
import {
  challengeDay,
  challengeStart,
  challengeStock,
  emptyScene,
  makePart,
} from "@clik/scene";

// Browser transport only. The real visibility rules are tested with Convex functions.
export async function creatorsFixture(
  page: Page,
  authenticated = false,
  options: { now?: number } = {},
) {
  const now = options.now ?? Date.now(),
    day = challengeDay(now),
    start = challengeStart(day);
  const challenge = {
    _id: "challenge",
    _creationTime: start,
    day,
    opensAt: start,
    closesAt: start + 86400000,
    stock: challengeStock(day),
    generatorVersion: 1,
    rewardAt: undefined as number | undefined,
    rewardStatus: undefined as "pending" | "complete" | undefined,
  };
  const user = {
    _id: "viewer",
    id: "viewer",
    name: "Camille",
    email: "private@example.test",
    emailVerified: true,
  };
  let rewardCount = 0;
  let rewardKeys: string[] = [];
  const avatars = new Map<string, AvatarDescriptor>();
  const avatarFor = (owner: string) =>
    avatars.get(owner) ?? defaultAvatar(owner);
  let avatarFailure = false;
  const avatarSaves: AvatarDescriptor[] = [];
  const profiles = new Map([
    [
      "alice",
      {
        id: "alice",
        name: "Alice",
        imageUrl: "https://images.example.test/avatar.svg" as string | null,
      },
    ],
    ["bob", { id: "bob", name: "Bob", imageUrl: null }],
    ["viewer", { id: "viewer", name: "Camille", imageUrl: null }],
    ["empty", { id: "empty", name: "Sans publication", imageUrl: null }],
    [
      "broken",
      {
        id: "broken",
        name: "Photo indisponible",
        imageUrl: "https://images.example.test/broken.png",
      },
    ],
  ]);
  const publications = Array.from({ length: 17 }, (_, i) => ({
    _id: `creation-${i}`,
    owner: i < 15 ? "alice" : "bob",
    author: i < 15 ? "Alice" : "Bob",
    title:
      ["La maison bleue", "Le petit phare", "Le pont des idées"][i % 3] +
      ` ${i + 1}`,
    active: true,
    publishedAt: now - i * 1000,
    challenge: i === 1 ? challenge : null,
    thumbnailUrl: `https://images.example.test/model-${i % 3}.svg`,
    commentCount: 1,
    voteCount: 2,
    updatedAt: now,
    submittedAt: now,
    origin: undefined as { publicationId: string } | undefined,
    isAssembly: false,
    sources: [] as {
      publicationId: string;
      versionId: string;
      title: string;
      author: string;
      available: boolean;
    }[],
  }));
  const remixCalls: { id: string; versionId: string }[] = [];
  let remixFailure = false;
  let remixHeld = false;
  const pendingRemixes: (() => void)[] = [];
  let remixed = false;
  const remixedProject = {
    _id: "remixed-project",
    owner: user._id,
    title: "",
    scene: JSON.stringify(emptyScene()),
    revision: 0,
    updatedAt: now,
    challenge: null,
    publicationId: null,
    origin: { publicationId: "", versionId: "", title: "", author: "" },
    originReceiptId: "remix-receipt",
    imports: [],
  };
  await page.route("https://images.example.test/**", (route) => {
    if (route.request().url().includes("broken"))
      return route.fulfill({ status: 404, body: "Missing" });
    const avatar = route.request().url().includes("avatar");
    return route.fulfill({
      contentType: "image/svg+xml",
      body: avatar
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#edf3ff"/><circle cx="48" cy="35" r="17" fill="#356ae6"/><path d="M18 96V78a30 30 0 0 1 60 0v18" fill="#356ae6"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#eef2f8"/><path d="M85 135l115 55 115-55v75l-115 55-115-55" fill="#356ae6"/><path d="M85 135l115-55 115 55-115 55" fill="#74a3ff"/><ellipse cx="200" cy="125" rx="35" ry="18" fill="#3e7beb"/></svg>',
    });
  });
  const b64 = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = `${b64({ alg: "RS256" })}.${b64({ sub: "viewer", sessionId: "test-session", exp: Math.floor(now / 1000) + 3600, iat: Math.floor(now / 1000) })}.signature`;
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({
      json: authenticated
        ? {
            user,
            session: {
              id: "test-session",
              userId: "viewer",
              expiresAt: new Date(now + 3600000).toISOString(),
              token: "test-session",
            },
          }
        : null,
    }),
  );
  await page.route("**/api/auth/convex/token*", (route) =>
    route.fulfill({ json: { token: authenticated ? token : null } }),
  );
  if (authenticated) {
    // The server-side auth guard uses this RPC during client navigation.
    // Only mock getAuth; never use or create a real server session.
    await page.route("**/_serverFn/**", (route) => {
      const identifier = new URL(route.request().url()).pathname
        .split("/")
        .pop()!;
      const decoded = Buffer.from(identifier, "base64url").toString();
      if (decoded.includes("getAuth_createServerFn_handler"))
        return route.fulfill({ json: { result: token, context: {} } });
      return route.fallback();
    });
    await page.route("**/api/auth/list-sessions*", (route) =>
      route.fulfill({
        json: [
          {
            id: "test-session",
            userId: "viewer",
            token: "test-session",
            userAgent: "Mozilla/5.0 Chrome/130",
            updatedAt: new Date(now).toISOString(),
            expiresAt: new Date(now + 3600000).toISOString(),
          },
        ],
      }),
    );
    await page.route("**/api/auth/list-accounts*", (route) =>
      route.fulfill({
        json: [
          {
            id: "credential",
            providerId: "credential",
            userId: "viewer",
            createdAt: new Date(now).toISOString(),
            updatedAt: new Date(now).toISOString(),
          },
        ],
      }),
    );
  }
  const refreshers = new Set<() => void>();
  const query = (path: string, args: any) => {
    if (path === "rewards:mine")
      return authenticated
        ? {
            count: rewardCount,
            rewards: rewardKeys.map((key) => ({
              key,
              earnedAt: now,
              day: CROWNS.some((c) => c.id === key) ? day : undefined,
            })),
          }
        : null;
    if (path === "rewards:podium")
      return {
        page: [
          {
            _id: "award-1",
            rank: 1,
            score: 7,
            publicationId: "creation-1",
            title: "Le phare couronné",
            owner: "alice",
            author: "Alice",
            avatar: avatarFor("alice"),
          },
          {
            _id: "award-2",
            rank: 1,
            score: 7,
            publicationId: null,
            title: "Création retirée",
            owner: null,
            author: null,
            avatar: null,
          },
          {
            _id: "award-3",
            rank: 3,
            score: 4,
            publicationId: "creation-2",
            title: "Le pont de bronze",
            owner: "bob",
            author: "Bob",
            avatar: avatarFor("bob"),
          },
        ],
        isDone: true,
        continueCursor: "",
      };
    if (path === "auth:getCurrentUser")
      return authenticated ? { ...user, avatar: avatarFor(user._id) } : null;
    if (path === "projects:get")
      return remixed && args.id === remixedProject._id
        ? { ...remixedProject, serverNow: Date.now() }
        : null;
    if (path === "projects:sourcesAvailable")
      return args.ids.map((id: string) => ({
        id,
        available: !!publications.find((p) => p._id === id)?.active,
      }));
    if (path === "projects:creator") {
      const profile = profiles.get(args.userId);
      return profile ? { ...profile, avatar: avatarFor(args.userId) } : null;
    }
    if (path === "projects:gallery" || path === "projects:remixes") {
      const rows = publications
        .filter(
          (p) =>
            p.active &&
            (path !== "projects:remixes" ||
              p.origin?.publicationId === args.publicationId ||
              p.sources.some(
                (source) => source.publicationId === args.publicationId,
              )) &&
            (args.ownerId === undefined || p.owner === args.ownerId),
        )
        .sort((a, b) =>
          args.sort === "oldest"
            ? a.publishedAt - b.publishedAt
            : args.sort === "comments"
              ? b.commentCount - a.commentCount || b.publishedAt - a.publishedAt
              : b.publishedAt - a.publishedAt,
        );
      const from = Number(args.paginationOpts.cursor || 0),
        end = from + args.paginationOpts.numItems;
      return {
        page: rows
          .slice(from, end)
          .map((p) => ({ ...p, avatar: avatarFor(p.owner) })),
        isDone: end >= rows.length,
        continueCursor: String(Math.min(end, rows.length)),
      };
    }
    if (path === "projects:creation") {
      const p = publications.find((p) => p._id === args.id && p.active);
      return p
        ? {
            ...p,
            avatar: avatarFor(p.owner),
            _id: `version-${p._id}`,
            publicationId: p._id,
            createdAt: p.publishedAt,
            description: "Une construction imaginée pour partager des idées.",
            scene: JSON.stringify({
              ...emptyScene(),
              nodes: [makePart("brick-2x4", "#4079e8")],
            }),
            sources: p.sources.map((source) => ({
              ...source,
              available: !!publications.find(
                (p) => p._id === source.publicationId,
              )?.active,
            })),
          }
        : null;
    }
    if (path === "comments:list")
      return {
        page: [
          {
            _id: "comment",
            _creationTime: now,
            publicationId: args.publicationId,
            owner: "bob",
            author: "Bob",
            avatar: avatarFor("bob"),
            body: "Une très belle idée !",
            createdAt: now,
          },
        ],
        isDone: true,
        continueCursor: "",
      };
    if (path === "comments:replies")
      return { page: [], isDone: true, continueCursor: "" };
    if (path === "challenges:day")
      return {
        challenge: args.day && args.day !== day ? null : challenge,
        today: day,
        firstDay: day,
        serverNow: now,
        choices: [],
        projectId: null,
      };
    if (path === "challenges:entries")
      return {
        page: publications
          .filter((p) => p.active && p.challenge)
          .map((p) => ({ ...p, avatar: avatarFor(p.owner) })),
        isDone: true,
        continueCursor: "",
      };
    return null;
  };
  await publicHttpFixture(query);
  await page.routeWebSocket(/\/api\/.*\/sync/, (ws) => {
    let seq = 0;
    const ts = () => {
      const bytes = Buffer.alloc(8);
      bytes.writeBigUInt64LE(BigInt(seq));
      return bytes.toString("base64");
    };
    let version = { querySet: 0, identity: 0, ts: ts() };
    const queries = new Map<number, { udfPath: string; args: any[] }>();
    function transition(next = version) {
      seq++;
      const endVersion = { ...next, ts: ts() };
      ws.send(
        JSON.stringify({
          type: "Transition",
          startVersion: version,
          endVersion,
          modifications: [...queries].map(([queryId, q]) => ({
            type: "QueryUpdated",
            queryId,
            value: query(q.udfPath, q.args[0]),
            logLines: [],
            journal: null,
          })),
        }),
      );
      version = endVersion;
    }
    const refresh = () => transition();
    refreshers.add(refresh);
    ws.onClose(() => refreshers.delete(refresh));
    ws.onMessage((raw) => {
      const message = JSON.parse(String(raw));
      if (message.type === "ModifyQuerySet") {
        for (const mod of message.modifications) {
          if (mod.type === "Add") queries.set(mod.queryId, mod);
          else queries.delete(mod.queryId);
        }
        transition({ ...version, querySet: message.newVersion });
      } else if (message.type === "Authenticate")
        transition({ ...version, identity: message.baseVersion + 1 });
      else if (message.type === "Mutation") {
        if (message.udfPath === "projects:remix") {
          const args = message.args[0];
          remixCalls.push(args);
          const finish = () => {
            if (!remixFailure) {
              const source = publications.find((p) => p._id === args.id)!;
              remixed = true;
              Object.assign(remixedProject, {
                title: `${source.title} · reprise`,
                scene: query("projects:creation", { id: args.id })!.scene,
                origin: {
                  publicationId: source._id,
                  versionId: args.versionId,
                  title: source.title,
                  author: source.author,
                },
              });
            }
            seq++;
            ws.send(
              JSON.stringify({
                type: "MutationResponse",
                requestId: message.requestId,
                success: !remixFailure,
                result: remixFailure
                  ? "Création temporairement indisponible"
                  : remixedProject._id,
                ts: ts(),
                logLines: [],
              }),
            );
            transition();
          };
          if (remixHeld) pendingRemixes.push(finish);
          else finish();
          return;
        }
        const savingAvatar = message.udfPath === "avatars:save";
        const failed = savingAvatar && avatarFailure;
        if (savingAvatar) {
          avatarSaves.push(message.args[0]);
          if (!failed) {
            const args = message.args[0];
            avatars.set(user._id, {
              ...avatarFor(user._id),
              ...args,
              crown:
                args.crown === null
                  ? undefined
                  : (args.crown ?? avatarFor(user._id).crown),
              ring:
                args.ring === null
                  ? undefined
                  : (args.ring ?? avatarFor(user._id).ring),
            });
          }
        }
        seq++;
        ws.send(
          JSON.stringify({
            type: "MutationResponse",
            requestId: message.requestId,
            success: !failed,
            result: failed
              ? "Enregistrement indisponible"
              : savingAvatar
                ? message.args[0]
                : "challenge",
            ts: ts(),
            logLines: [],
          }),
        );
        transition();
      }
    });
  });
  return {
    remixCalls,
    failRemix: (value: boolean) => {
      remixFailure = value;
    },
    holdRemix: (value: boolean) => {
      remixHeld = value;
      if (!value) pendingRemixes.splice(0).forEach((finish) => finish());
    },
    setAssembly: (id: string, sourceIds: string[]) => {
      const publication = publications.find((p) => p._id === id)!;
      publication.isAssembly = true;
      publication.sources = sourceIds.map((id) => {
        const source = publications.find((p) => p._id === id)!;
        return {
          publicationId: id,
          versionId: `version-${id}`,
          title: source.title,
          author: source.author,
          available: source.active,
        };
      });
      refreshers.forEach((refresh) => refresh());
    },
    setOrigin: (id: string, publicationId: string) => {
      publications.find((p) => p._id === id)!.origin = { publicationId };
      refreshers.forEach((refresh) => refresh());
    },
    setComments: (id: string, count: number) => {
      publications.find((p) => p._id === id)!.commentCount = count;
      refreshers.forEach((refresh) => refresh());
    },
    avatarSaves,
    setRewards: (count: number, crowns: string[] = []) => {
      rewardCount = count;
      rewardKeys = [
        ...crowns,
        ...RINGS.filter((r) => r.threshold <= count).map((r) => r.id),
      ];
      refreshers.forEach((refresh) => refresh());
    },
    setRewardPhase: (phase: "pending" | "complete") => {
      challenge.rewardAt =
        phase === "complete" ? now - 1000 : start + 2 * 86400000;
      challenge.rewardStatus = phase;
      refreshers.forEach((refresh) => refresh());
    },
    failAvatarSave: (value: boolean) => {
      avatarFailure = value;
    },
    setAvatar: (owner: string, avatar: AvatarDescriptor) => {
      avatars.set(owner, avatar);
      refreshers.forEach((refresh) => refresh());
    },
    rename: (name: string) => {
      profiles.get("alice")!.name = name;
      refreshers.forEach((refresh) => refresh());
    },
    setPublished: (id: string, active: boolean) => {
      publications.find((p) => p._id === id)!.active = active;
      refreshers.forEach((refresh) => refresh());
    },
  };
}
