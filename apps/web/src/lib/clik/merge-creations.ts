type Creation = { id: string; updatedAt?: number };

/** Merge local entries into the loaded server range without reordering its pages. */
export function mergeCreations<T extends Creation>(
  remote: readonly T[],
  local: readonly T[],
  sort: "recent" | "oldest",
  hasMoreRemote: boolean,
): T[] {
  const direction = sort === "oldest" ? 1 : -1;
  const compare = (a: T, b: T) =>
    direction * ((a.updatedAt ?? 0) - (b.updatedAt ?? 0));
  const sortedLocal = [...local].sort(
    (a, b) => compare(a, b) || a.id.localeCompare(b.id),
  );
  const merged: T[] = [];
  let localIndex = 0;
  for (const creation of remote) {
    while (
      localIndex < sortedLocal.length &&
      compare(sortedLocal[localIndex]!, creation) < 0
    ) {
      merged.push(sortedLocal[localIndex++]!);
    }
    merged.push(creation);
  }
  // Wait for subsequent pages before showing locals beyond the loaded range,
  // including ties, so new server entries cannot appear above visible locals.
  if (!hasMoreRemote) merged.push(...sortedLocal.slice(localIndex));
  return merged;
}
