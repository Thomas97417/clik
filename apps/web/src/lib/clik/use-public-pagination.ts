import { useMemo, useState } from "react";
import {
  useQueries,
  type PaginatedQueryReference,
  type PaginatedQueryArgs,
  type PaginatedQueryItem,
} from "convex/react";
import { getFunctionName, type PaginationResult } from "convex/server";

/** SSR first page, followed by the same reactive Convex pages after hydration. */
export function usePublicPagination<Q extends PaginatedQueryReference>(
  query: Q,
  args: PaginatedQueryArgs<Q> | "skip",
  seed?: PaginationResult<PaginatedQueryItem<Q>>,
  initialCursor?: string,
  count = 12,
) {
  const key = JSON.stringify([args, initialCursor]);
  const name = getFunctionName(query);
  const [state, setState] = useState({
    key,
    cursors: [initialCursor ?? null] as (string | null)[],
  });
  const cursors = state.key === key ? state.cursors : [initialCursor ?? null];
  if (state.key !== key) setState({ key, cursors });
  const requests = useMemo(
    () =>
      args === "skip"
        ? {}
        : Object.fromEntries(
            cursors.map((cursor, i) => [
              String(i),
              {
                query,
                args: {
                  ...args,
                  paginationOpts: {
                    numItems: count,
                    cursor,
                    ...(cursors[i + 1] ? { endCursor: cursors[i + 1] } : {}),
                  },
                },
              },
            ]),
          ),
    [name, key, state, count],
  );
  const live = useQueries(requests);
  const pages = cursors.map((_, i) => {
    const value = live[String(i)];
    if (value instanceof Error) throw value;
    return (value === undefined && i === 0 ? seed : value) as
      PaginationResult<PaginatedQueryItem<Q>> | undefined;
  });
  const last = pages.at(-1);
  const status = !pages[0]
    ? "LoadingFirstPage"
    : !last
      ? "LoadingMore"
      : last.isDone
        ? "Exhausted"
        : "CanLoadMore";
  return {
    results: pages.flatMap((page) => page?.page ?? []),
    status,
    nextCursor: last?.isDone ? undefined : last?.continueCursor,
    loadMore: (_count?: number) => {
      if (status === "CanLoadMore" && last?.continueCursor)
        setState((previous) =>
          previous.cursors.includes(last.continueCursor)
            ? previous
            : { key, cursors: [...previous.cursors, last.continueCursor] },
        );
    },
  };
}
export function continuationHref(
  path: string,
  cursor?: string,
  params: Record<string, string | undefined> = {},
) {
  const search = new URLSearchParams(
    Object.entries(params).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
  if (cursor) search.set("cursor", cursor);
  return `${path}${search.size ? `?${search}` : ""}`;
}
