import { createIsomorphicFn } from "@tanstack/react-start";
import { z } from "zod";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@my-better-t-app/backend/convex/_generated/api";

const cursor = z.string().max(8192).optional();
const sort = z.enum(["recent", "oldest", "comments"]).optional();
export const publicRequest = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("gallery"), sort, cursor }),
  z.object({
    kind: z.literal("creator"),
    userId: z.string().max(128),
    sort,
    cursor,
  }),
  z.object({ kind: z.literal("creation"), id: z.string().max(128) }),
  z.object({
    kind: z.literal("challenge"),
    day: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    sort: z.enum(["recent", "votes"]).optional(),
    cursor,
  }),
]);
export type PublicRequest = z.infer<typeof publicRequest>;
export type PublicData = {
  gallery: FunctionReturnType<typeof api.projects.gallery>;
  creator: {
    creator: FunctionReturnType<typeof api.projects.creator>;
    gallery: FunctionReturnType<typeof api.projects.gallery>;
  };
  creation: {
    creation: FunctionReturnType<typeof api.projects.creation>;
    comments: FunctionReturnType<typeof api.comments.list>;
    remixes: FunctionReturnType<typeof api.projects.remixes>;
  };
  challenge: {
    data: FunctionReturnType<typeof api.challenges.day>;
    entries: FunctionReturnType<typeof api.challenges.entries>;
    sort: "recent" | "votes";
    previous: string | null;
    next: string | null;
  };
};
const read = createIsomorphicFn()
  .server(async (request: PublicRequest) =>
    (await import("./public-data-server")).readPublic(request),
  )
  .client(async (request: PublicRequest) => {
    const response = await fetch(
      `/api/public?input=${encodeURIComponent(JSON.stringify(request))}`,
    );
    if (!response.ok)
      throw new Error(
        "Les créations ne peuvent pas être chargées. Réessayez dans un instant.",
      );
    return response.json();
  });
export async function loadPublic<K extends PublicRequest["kind"]>(
  request: Extract<PublicRequest, { kind: K }>,
): Promise<PublicData[K]> {
  return read(request);
}
