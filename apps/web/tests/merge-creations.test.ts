import { describe, expect, it } from "vitest";
import { mergeCreations } from "../src/lib/clik/merge-creations";

describe("Pagination des créations locales et en ligne", () => {
  it.each(["recent", "oldest"] as const)(
    "prolonge la liste sans déplacer les cartes déjà affichées (%s)",
    (sort) => {
      const remote = Array.from({ length: 6 }, (_, i) => ({
        id: `remote-${i + 1}`,
        updatedAt: i + 1,
      }));
      if (sort === "recent") remote.reverse();
      const local = [
        { id: "newest", updatedAt: 7 },
        { id: "between-newer", updatedAt: 5.5 },
        { id: "tie", updatedAt: 4 },
        { id: "between-older", updatedAt: 2.5 },
        { id: "old", updatedAt: 1 },
        { id: "undated" },
      ];
      const expected =
        sort === "recent"
          ? [
              "newest",
              "remote-6",
              "between-newer",
              "remote-5",
              "remote-4",
              "tie",
              "remote-3",
              "between-older",
              "remote-2",
              "remote-1",
              "old",
              "undated",
            ]
          : [
              "undated",
              "remote-1",
              "old",
              "remote-2",
              "between-older",
              "remote-3",
              "remote-4",
              "tie",
              "remote-5",
              "between-newer",
              "remote-6",
              "newest",
            ];
      let previous: string[] = [];
      for (const count of [2, 4, 6]) {
        const visible = mergeCreations(
          remote.slice(0, count),
          local,
          sort,
          count < remote.length,
        ).map((creation) => creation.id);
        expect(visible.slice(0, previous.length)).toEqual(previous);
        expect(visible).toEqual(expected.slice(0, visible.length));
        previous = visible;
      }
      expect(previous).toEqual(expected);
    },
  );

  it.each(["recent", "oldest"] as const)(
    "garde l’ordre du serveur pour les dates identiques, même entre deux pages (%s)",
    (sort) => {
      const remote = ["z", "m", "a", "b"].map((id) => ({
        id,
        updatedAt: 42,
      }));
      const local = [{ id: "local", updatedAt: 42 }];
      expect(
        mergeCreations(remote.slice(0, 2), local, sort, true).map(
          (creation) => creation.id,
        ),
      ).toEqual(["z", "m"]);
      expect(
        mergeCreations(remote, local, sort, false).map(
          (creation) => creation.id,
        ),
      ).toEqual(["z", "m", "a", "b", "local"]);
    },
  );

  it("affiche les créations locales seules lorsque la source en ligne est épuisée ou absente", () => {
    const local = [
      { id: "older", updatedAt: 1 },
      { id: "newer", updatedAt: 2 },
    ];
    expect(mergeCreations([], local, "recent", true)).toEqual([]);
    expect(mergeCreations([], local, "recent", false)).toEqual([
      local[1],
      local[0],
    ]);
    expect(mergeCreations([], local, "oldest", false)).toEqual(local);
  });
});
