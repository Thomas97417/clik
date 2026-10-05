import { ConvexHttpClient } from "convex/browser";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import { env } from "@my-better-t-app/env/web";
import type { PublicRequest } from "./public-data";
const empty = { page: [], isDone: true, continueCursor: "" };
// A separate anonymous client: never reuse the authenticated router client here.
export function publicClient() {
  return new ConvexHttpClient(env.VITE_CONVEX_URL, {
    fetch: (input, init) =>
      fetch(input, { ...init, signal: AbortSignal.timeout(10000) }),
  });
}
export async function readPublic(request: PublicRequest) {
  const client = publicClient();
  const paginationOpts = {
    numItems: 12,
    cursor: "cursor" in request ? (request.cursor ?? null) : null,
  };
  switch (request.kind) {
    case "gallery":
      return client.query(api.projects.gallery, {
        sort: request.sort,
        paginationOpts,
      });
    case "creator": {
      const [creator, gallery] = await Promise.all([
        client.query(api.projects.creator, { userId: request.userId }),
        client.query(api.projects.gallery, {
          ownerId: request.userId,
          sort: request.sort,
          paginationOpts,
        }),
      ]);
      return { creator, gallery };
    }
    case "creation": {
      const creation = await client.query(api.projects.creation, {
        id: request.id,
      });
      if (!creation) return { creation: null, comments: empty, remixes: empty };
      const publicationId = request.id as Id<"publications">;
      const [comments, remixes] = await Promise.all([
        client.query(api.comments.list, {
          publicationId,
          paginationOpts: { numItems: 20, cursor: null },
        }),
        client.query(api.projects.remixes, {
          publicationId,
          paginationOpts: { numItems: 6, cursor: null },
        }),
      ]);
      return { creation, comments, remixes };
    }
    case "challenge": {
      const data = await client.query(api.challenges.day, { day: request.day });
      const sort =
        request.sort ??
        (data.challenge && data.serverNow >= data.challenge.closesAt
          ? "votes"
          : "recent");
      const [entries, neighbors] = await Promise.all([
        data.challenge
          ? client.query(api.challenges.entries, {
              challengeId: data.challenge._id,
              sort,
              paginationOpts,
            })
          : empty,
        client.query(api.challenges.publicNeighbors, {
          day: request.day ?? data.today,
        }),
      ]);
      return { data, entries, sort, ...neighbors };
    }
  }
}
