import type { OptimisticLocalStore } from "convex/browser";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";

/** Convex replays pending votes over live data and rolls each one back on failure. */
export function optimisticVote(
  store: OptimisticLocalStore,
  {
    publicationId,
    voted,
  }: { publicationId: Id<"publications">; voted: boolean },
  challengeId: Id<"challenges"> | undefined,
) {
  if (!challengeId) return;
  const days = store.getAllQueries(api.challenges.day);
  const current = days.find(
    (query) => query.value?.challenge?._id === challengeId,
  )?.value;
  if (!current) return;
  const had = current.choices.some(
    (choice) => choice.publicationId === publicationId,
  );
  if (had === voted || (voted && current.choices.length >= 3)) return;
  const delta = voted ? 1 : -1;

  for (const { args, value } of days) {
    if (value?.challenge?._id !== challengeId) continue;
    store.setQuery(api.challenges.day, args, {
      ...value,
      choices: voted
        ? [
            ...value.choices.filter(
              (choice) => choice.publicationId !== publicationId,
            ),
            { publicationId, epoch: 0 },
          ]
        : value.choices.filter(
            (choice) => choice.publicationId !== publicationId,
          ),
    });
  }
  for (const { args, value } of store.getAllQueries(api.challenges.entries)) {
    if (args.challengeId !== challengeId || !value) continue;
    store.setQuery(api.challenges.entries, args, {
      ...value,
      page: value.page.map((entry) =>
        entry._id === publicationId
          ? { ...entry, voteCount: Math.max(0, entry.voteCount + delta) }
          : entry,
      ),
    });
  }
  for (const { args, value } of store.getAllQueries(api.projects.creation)) {
    if (args.id !== publicationId || !value) continue;
    store.setQuery(api.projects.creation, args, {
      ...value,
      voteCount: Math.max(0, value.voteCount + delta),
    });
  }
}
