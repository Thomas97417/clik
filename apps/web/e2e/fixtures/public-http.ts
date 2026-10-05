import { createServer } from "node:http";
let read: (path: string, args: any) => any = () => null;
let started: Promise<void> | undefined;
/** Node transport for SSR loaders; shares each fixture's state with its WebSocket. */
export async function publicHttpFixture(query: typeof read) {
  read = query;
  if (!started)
    started = new Promise((resolve, reject) => {
      const server = createServer(async (request, response) => {
        response.setHeader("Content-Type", "application/json");
        let body = "";
        for await (const chunk of request) body += chunk;
        try {
          const input = JSON.parse(body || "{}");
          const args = Array.isArray(input.args) ? input.args[0] : input.args;
          let value;
          if (input.path === "challenges:publicNeighbors")
            value = { previous: null, next: null };
          else if (input.path === "projects:sitemapPage") {
            const gallery = read("projects:gallery", {
              paginationOpts: { numItems: 250, cursor: args.cursor },
            });
            value = {
              ...gallery,
              page: gallery.page.map((p: any) => ({
                id: p._id,
                modified: p.publishedAt,
              })),
              owners: [...new Set(gallery.page.map((p: any) => p.owner))],
            };
          } else if (input.path === "challenges:sitemapPage")
            value = { page: [], isDone: true, continueCursor: "" };
          else value = read(input.path, args);
          response.end(
            JSON.stringify({ status: "success", value, logLines: [] }),
          );
        } catch (error) {
          response.end(
            JSON.stringify({
              status: "error",
              errorMessage: String(error),
              logLines: [],
            }),
          );
        }
      });
      server.once("error", reject);
      server.listen(3219, "127.0.0.1", () => {
        server.unref();
        resolve();
      });
    });
  await started;
}
