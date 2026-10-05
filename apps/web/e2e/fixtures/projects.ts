import type { Page } from "@playwright/test";
import { emptyScene, makePart, type ProjectImport } from "@clik/scene";

// Transport fixture only: no real account, upload or publication is created.
export async function projectsFixture(
  page: Page,
  options: {
    published?: boolean;
    userName?: string;
    userEmail?: string;
    privateCount?: number;
  } = {},
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
    imports: [] as ProjectImport[],
  };
  const calls = {
    lists: [] as any[],
    uploads: [] as any[],
    publications: [] as any[],
    withdrawals: [] as any[],
    creations: [] as any[],
    saves: [] as any[],
    deletions: [] as any[],
    preparations: [] as any[],
  };
  const imported = new Map<string, typeof project>();
  const privateProjects = Array.from(
    { length: options.privateCount ?? 0 },
    (_, i) => ({
      ...project,
      _id: `private-${i}`,
      title: `Création privée ${i + 1}`,
      publicationId: null,
      updatedAt: project.updatedAt + 1000 + i,
    }),
  );
  const deleted = new Set<string>();
  let failDelete = false;
  let failCreate = false;
  let fail = false;
  let failWithdrawal = false;
  let failImport = false;
  const sources = [
    {
      publicationId: "original",
      versionId: "original-version",
      author: "Alice",
      title: "La maison d’Alice",
    },
  ];
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
    const query = (path: string, args: any) => {
      if (path === "auth:getCurrentUser") return user;
      if (path === "projects:sourcesAvailable")
        return args.ids.map((id: string) => ({ id, available: true }));
      if (path === "projects:get") {
        const target =
          args.id === "project"
            ? project
            : args.id === "closed-challenge"
              ? {
                  ...project,
                  _id: "closed-challenge",
                  title: "Un ancien défi",
                  challenge: { day: "2020-01-01", closesAt: 1 },
                }
              : [...imported.values()].find((p) => p._id === args.id);
        return target
          ? { ...target, owner: user._id, serverNow: Date.now() }
          : null;
      }
      if (path === "projects:list") {
        const rows = [
          ...privateProjects,
          ...imported.values(),
          project,
          {
            ...project,
            _id: "closed-challenge",
            title: "Un ancien défi",
            publicationId: null,
            challenge: { day: "2020-01-01", closesAt: 1 },
          },
        ]
          .filter((p) => !deleted.has(p._id))
          .sort((a, b) =>
            args.sort === "oldest"
              ? a.updatedAt - b.updatedAt
              : b.updatedAt - a.updatedAt,
          );
        const start = Number(args.paginationOpts.cursor ?? 0);
        const end = start + Math.min(12, args.paginationOpts.numItems);
        return {
          page: rows.slice(start, end),
          isDone: end >= rows.length,
          continueCursor: end >= rows.length ? "" : String(end),
        };
      }
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
            value: query(q.udfPath, q.args[0]),
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
          if (mod.type === "Add") {
            queries.set(mod.queryId, mod);
            if (mod.udfPath === "projects:list") calls.lists.push(mod.args[0]);
          } else queries.delete(mod.queryId);
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
        const removing = message.udfPath === "projects:remove";
        const creating = message.udfPath === "projects:create";
        const saving = message.udfPath === "projects:save";
        const preparing = message.udfPath === "projects:prepareImport";
        const failed = preparing
          ? failImport
          : removing
            ? failDelete
            : creating
              ? failCreate
              : saving
                ? false
                : withdrawing
                  ? failWithdrawal
                  : fail;
        let result: any = "publication";
        if (preparing) {
          calls.preparations.push(args);
          result = {
            title: "Un ancien défi",
            scene: project.scene,
            receiptId: "import-receipt",
            sources,
          };
        }
        if (removing) {
          calls.deletions.push(args);
          if (!failed) deleted.add(args.id);
        }
        if (creating) {
          calls.creations.push(args);
          if (!failed && !imported.has(args.localSourceId))
            imported.set(args.localSourceId, {
              ...project,
              _id: "imported",
              title: args.title,
              scene: args.scene,
              revision: 0,
              publicationId: null,
              imports: (args.imports ?? []).map((item: any) => ({
                ...item,
                sources: item.receiptIds.length ? sources : [],
              })),
            });
          result = "imported";
        }
        if (saving) {
          calls.saves.push(args);
          const target =
            args.id === "project"
              ? project
              : [...imported.values()].find((p) => p._id === args.id)!;
          target.title = args.title;
          target.scene = args.scene;
          target.revision = args.revision + 1;
          target.updatedAt = Date.now();
          target.imports = (args.imports ?? []).map((item: any) => ({
            ...item,
            sources: item.receiptIds.length ? sources : [],
          }));
          result = target.revision;
        }
        if (withdrawing) {
          calls.withdrawals.push(args);
          if (!failed) project.publicationId = null;
        }
        if (message.udfPath === "projects:publish") {
          calls.publications.push(args);
          if (!fail) {
            const target =
              args.id === "project"
                ? project
                : [...imported.values()].find((p) => p._id === args.id)!;
            target.publicationId = "publication";
            target.description = args.description;
          }
        }
        seq++;
        ws.send(
          JSON.stringify({
            type: "MutationResponse",
            requestId: message.requestId,
            success: !failed,
            result: failed
              ? preparing
                ? "Import indisponible, réessayez."
                : removing
                  ? "Suppression indisponible, réessayez."
                  : creating
                    ? "Enregistrement indisponible, réessayez."
                    : withdrawing
                      ? "Retrait indisponible, réessayez."
                      : "Publication indisponible, réessayez."
              : result,
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
    failImport: (value: boolean) => {
      failImport = value;
    },
    failCreation: (value: boolean) => {
      failCreate = value;
    },
    failDelete: (value: boolean) => {
      failDelete = value;
    },
    failPublication: (value: boolean) => {
      fail = value;
    },
    failWithdrawal: (value: boolean) => {
      failWithdrawal = value;
    },
  };
}
