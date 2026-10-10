import { publicHttpFixture } from "./public-http";
import type { Page } from "@playwright/test";
import {
  challengeDay,
  challengeStart,
  challengeStock,
  emptyScene,
  makePart,
} from "@clik/scene";
// Browser-only transport fixture. No test users, publications or emails are created remotely.
// Business invariants are exercised against real Convex functions in backend tests.
export async function challengeFixture(page: Page) {
  const uploads: { projectId: string; bytes: { $bytes: string } }[] = [];
  const today = challengeDay(),
    start = challengeStart(today);
  const challenge = {
    _id: "challenge",
    _creationTime: start,
    day: today,
    opensAt: start,
    closesAt: start + 86400000,
    stock: challengeStock(today),
    generatorVersion: 1,
  };
  const user = {
    _id: "viewer",
    id: "viewer",
    name: "Camille",
    email: "camille@example.test",
    emailVerified: true,
  };
  const entries = Array.from({ length: 4 }, (_, i) => ({
    _id: `entry-${i}`,
    owner: `author-${i}`,
    title: [
      "Le petit phare",
      "Un pont bleu",
      "La maison des idées",
      "Le robot du jour",
    ][i],
    author: `Créateur ${i + 1}`,
    voteCount: i,
    commentCount: 0,
    updatedAt: start + i,
    thumbnailUrl: null,
  }));
  const project = {
    _id: "project",
    owner: user._id,
    title: "Mon défi",
    scene: JSON.stringify(emptyScene()),
    revision: 0,
    updatedAt: start,
    challengeId: challenge._id,
  };
  let started = false;
  let publicationId: string | null = null;
  let choices: { publicationId: string; epoch: number }[] = [];
  let comments: {
    _id: string;
    _creationTime: number;
    publicationId: string;
    owner: string;
    author: string;
    body: string;
    createdAt: number;
    updatedAt?: number;
  }[] = [];
  let nextComment = 1;
  let failedComment: "add" | "edit" | "remove" | null = null;
  const b64 = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = `${b64({ alg: "RS256" })}.${b64({ sub: "viewer", exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000) })}.signature`;
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({
      json: {
        user,
        session: {
          id: "test-session",
          userId: "viewer",
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          token: "test-session",
        },
      },
    }),
  );
  await page.route("**/api/auth/convex/token*", (route) =>
    route.fulfill({ json: { token } }),
  );
  function query(path: string, a: any) {
    switch (path) {
      case "auth:getCurrentUser":
        return user;
      case "challenges:day":
        return {
          challenge: {
            ...challenge,
            _id: `challenge-${a.day ?? today}`,
            day: a.day ?? today,
            opensAt: challengeStart(a.day ?? today),
            closesAt: challengeStart(a.day ?? today) + 86400000,
          },
          today,
          firstDay: challengeDay(start - 2 * 86400000),
          serverNow: Date.now(),
          choices,
          projectId: started ? project._id : null,
        };
      case "projects:get":
        return {
          ...project,
          challenge,
          publicationId,
          serverNow: Date.now(),
        };
      case "challenges:entries":
        return {
          page:
            a.sort === "votes"
              ? [...entries].sort((a, b) => b.voteCount - a.voteCount)
              : entries,
          isDone: true,
          continueCursor: "",
        };
      case "projects:remixes":
        return { page: [], isDone: true, continueCursor: "" };
      case "projects:creation": {
        const e = entries.find((e) => e._id === a.id)!;
        return {
          ...e,
          _id: `version-${e._id}-${project.revision}`,
          publicationId: e._id,
          createdAt: start,
          submittedAt: start,
          challenge,
          description: "Une construction pour le défi du jour.",
          scene:
            e.owner === user._id
              ? project.scene
              : JSON.stringify({
                  ...emptyScene(),
                  nodes: [makePart("brick-2x4", "#4079e8")],
                }),
          commentCount: comments.filter((c) => c.publicationId === e._id)
            .length,
        };
      }
      case "comments:list":
        return {
          page: comments.filter((c) => c.publicationId === a.publicationId),
          isDone: true,
          continueCursor: "",
        };
      default:
        return null;
    }
  }
  await publicHttpFixture(query);
  await page.routeWebSocket(/\/api\/.*\/sync/, (ws) => {
    let seq = 0;
    const ts = () => {
      const b = Buffer.alloc(8);
      b.writeBigUInt64LE(BigInt(seq));
      return b.toString("base64");
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
      else if (
        message.type === "Action" &&
        message.udfPath === "projects:uploadThumbnail"
      ) {
        uploads.push(message.args[0]);
        ws.send(
          JSON.stringify({
            type: "ActionResponse",
            requestId: message.requestId,
            success: true,
            result: "thumbnail",
            logLines: [],
          }),
        );
      } else if (message.type === "Mutation") {
        const a = message.args[0];
        if (failedComment && message.udfPath === `comments:${failedComment}`) {
          failedComment = null;
          seq++;
          ws.send(
            JSON.stringify({
              type: "MutationResponse",
              requestId: message.requestId,
              success: false,
              result: "Opération temporairement indisponible",
              ts: ts(),
              logLines: [],
            }),
          );
          return;
        }
        let result: unknown = null;
        if (message.udfPath === "challenges:ensureToday")
          result = challenge._id;
        if (message.udfPath === "challenges:start") {
          started = true;
          result = project._id;
        }
        if (message.udfPath === "projects:save") {
          project.title = a.title;
          project.scene = a.scene;
          result = ++project.revision;
        }
        if (message.udfPath === "projects:publish") {
          const existing = entries.find((e) => e._id === publicationId);
          if (existing) existing.title = a.title;
          else {
            publicationId = "own-entry";
            entries.push({
              _id: publicationId,
              owner: user._id,
              title: a.title,
              author: user.name,
              voteCount: 0,
              commentCount: 0,
              updatedAt: Date.now(),
              thumbnailUrl: null,
            });
          }
          result = publicationId;
        }
        if (message.udfPath === "challenges:vote") {
          const entry = entries.find((e) => e._id === a.publicationId)!;
          const had = choices.some((c) => c.publicationId === entry._id);
          if (had !== a.voted) {
            entry.voteCount += a.voted ? 1 : -1;
            choices = a.voted
              ? [...choices, { publicationId: entry._id, epoch: 0 }]
              : choices.filter((c) => c.publicationId !== entry._id);
          }
        }
        if (message.udfPath === "comments:add") {
          result = `comment-${nextComment++}`;
          comments.unshift({
            _id: String(result),
            _creationTime: Date.now(),
            publicationId: a.publicationId,
            owner: "viewer",
            author: "Camille",
            body: a.body,
            createdAt: Date.now(),
          });
        }
        if (message.udfPath === "comments:edit")
          comments = comments.map((c) =>
            c._id === a.id ? { ...c, body: a.body, updatedAt: Date.now() } : c,
          );
        if (message.udfPath === "comments:remove")
          comments = comments.filter((c) => c._id !== a.id);
        seq++;
        ws.send(
          JSON.stringify({
            type: "MutationResponse",
            requestId: message.requestId,
            success: true,
            result,
            ts: ts(),
            logLines: [],
          }),
        );
        transition();
      }
    });
  });
  return {
    uploads,
    failNextComment: (operation: "add" | "edit" | "remove") => {
      failedComment = operation;
    },
  };
}
