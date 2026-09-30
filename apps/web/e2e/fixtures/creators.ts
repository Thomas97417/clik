import type { Page } from "@playwright/test";
import {
  challengeDay,
  challengeStart,
  challengeStock,
  emptyScene,
  makePart,
} from "@clik/scene";

// Browser transport only. The real visibility rules are tested with Convex functions.
export async function creatorsFixture(page: Page, authenticated = false) {
  const now = Date.now(),
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
  };
  const user = {
    _id: "viewer",
    id: "viewer",
    name: "Camille",
    email: "private@example.test",
    emailVerified: true,
  };
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
  }));
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
  const token = `${b64({ alg: "RS256" })}.${b64({ sub: "viewer", exp: Math.floor(now / 1000) + 3600, iat: Math.floor(now / 1000) })}.signature`;
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
  const refreshers = new Set<() => void>();
  await page.routeWebSocket(/\/api\/.*\/sync/, (ws) => {
    let seq = 0;
    const ts = () => {
      const bytes = Buffer.alloc(8);
      bytes.writeBigUInt64LE(BigInt(seq));
      return bytes.toString("base64");
    };
    let version = { querySet: 0, identity: 0, ts: ts() };
    const queries = new Map<number, { udfPath: string; args: any[] }>();
    const query = (path: string, args: any) => {
      if (path === "auth:getCurrentUser") return authenticated ? user : null;
      if (path === "projects:creator") return profiles.get(args.userId) ?? null;
      if (path === "projects:gallery") {
        const rows = publications
          .filter(
            (p) =>
              p.active &&
              (args.ownerId === undefined || p.owner === args.ownerId),
          )
          .sort((a, b) => b.publishedAt - a.publishedAt);
        const from = Number(args.paginationOpts.cursor || 0),
          end = from + args.paginationOpts.numItems;
        return {
          page: rows.slice(from, end),
          isDone: end >= rows.length,
          continueCursor: String(Math.min(end, rows.length)),
        };
      }
      if (path === "projects:creation") {
        const p = publications.find((p) => p._id === args.id && p.active);
        return p
          ? {
              ...p,
              _id: `version-${p._id}`,
              publicationId: p._id,
              createdAt: p.publishedAt,
              description: "Une construction imaginée pour partager des idées.",
              scene: JSON.stringify({
                ...emptyScene(),
                nodes: [makePart("brick-2x4", "#4079e8")],
              }),
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
              body: "Une très belle idée !",
              createdAt: now,
            },
          ],
          isDone: true,
          continueCursor: "",
        };
      if (path === "challenges:day")
        return {
          challenge,
          today: day,
          firstDay: day,
          serverNow: now,
          choices: [],
          projectId: null,
        };
      if (path === "challenges:entries")
        return {
          page: publications.filter((p) => p.active && p.challenge),
          isDone: true,
          continueCursor: "",
        };
      return null;
    };
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
        seq++;
        ws.send(
          JSON.stringify({
            type: "MutationResponse",
            requestId: message.requestId,
            success: true,
            result: "challenge",
            ts: ts(),
            logLines: [],
          }),
        );
        transition();
      }
    });
  });
  return {
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
