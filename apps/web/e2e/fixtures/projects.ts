import type { Page } from "@playwright/test";
import { emptyScene, makePart } from "@clik/scene";

// Transport fixture only: no real account, upload or publication is created.
export async function projectsFixture(
  page: Page,
  options: { published?: boolean; userName?: string; userEmail?: string } = {},
) {
  const user = {
    _id: "viewer",
    id: "viewer",
    name: options.userName ?? "Camille",
    email: options.userEmail ?? "camille@example.test",
    emailVerified: true,
  };
  const project = {
    _id: "project",
    title: "Le phare bleu",
    description: "Une lumière au bord de la mer.",
    scene: JSON.stringify({
      ...emptyScene(),
      nodes: [makePart("brick-2x4", "#4079e8")],
    }),
    revision: 7,
    updatedAt: Date.now(),
    publicationId: (options.published ? "publication" : null) as string | null,
    challenge: null,
  };
  const calls = {
    uploads: [] as any[],
    publications: [] as any[],
    withdrawals: [] as any[],
  };
  let fail = false;
  let failWithdrawal = false;
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
  await page.routeWebSocket(/\/api\/.*\/sync/, (ws) => {
    let seq = 0;
    const ts = () => {
      const buffer = Buffer.alloc(8);
      buffer.writeBigUInt64LE(BigInt(seq));
      return buffer.toString("base64");
    };
    let version = { querySet: 0, identity: 0, ts: ts() };
    const queries = new Map<number, { udfPath: string; args: any[] }>();
    const query = (path: string) => {
      if (path === "auth:getCurrentUser") return user;
      if (path === "projects:list")
        return {
          page: [
            project,
            {
              ...project,
              _id: "closed-challenge",
              title: "Un ancien défi",
              publicationId: null,
              challenge: { day: "2020-01-01", closesAt: 1 },
            },
          ],
          isDone: true,
          continueCursor: "",
        };
      return null;
    };
    const transition = (next = version) => {
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
            value: query(q.udfPath),
            logLines: [],
            journal: null,
          })),
        }),
      );
      version = endVersion;
    };
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
        calls.uploads.push(message.args[0]);
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
        const args = message.args[0];
        const withdrawing = message.udfPath === "projects:withdraw";
        const failed = withdrawing ? failWithdrawal : fail;
        if (withdrawing) {
          calls.withdrawals.push(args);
          if (!failed) project.publicationId = null;
        }
        if (message.udfPath === "projects:publish") {
          calls.publications.push(args);
          if (!fail) {
            project.publicationId = "publication";
            project.description = args.description;
          }
        }
        seq++;
        ws.send(
          JSON.stringify({
            type: "MutationResponse",
            requestId: message.requestId,
            success: !failed,
            result: failed
              ? withdrawing
                ? "Retrait indisponible, réessayez."
                : "Publication indisponible, réessayez."
              : "publication",
            ts: ts(),
            logLines: [],
          }),
        );
        transition();
      }
    });
  });
  return {
    calls,
    failPublication: (value: boolean) => {
      fail = value;
    },
    failWithdrawal: (value: boolean) => {
      failWithdrawal = value;
    },
  };
}
