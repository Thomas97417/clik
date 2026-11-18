import { useHydrated, useLocation, useRouter } from "@tanstack/react-router";
import type { PaginationStatus } from "convex/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type Filter = "all" | "online" | "local" | "published";
type Bookmark = { count: number; scrollTop: number; filter: Filter };

function readBookmark(key?: string): Bookmark | undefined {
  if (!key) return;
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? "null");
    if (
      value &&
      Number.isSafeInteger(value.count) &&
      value.count >= 0 &&
      Number.isFinite(value.scrollTop) &&
      ["all", "online", "local", "published"].includes(value.filter)
    )
      return value;
  } catch {
    // Storage may be unavailable in this tab.
  }
}

export function useCollectionVisit(path: "/gallery" | "/projects") {
  const hydrated = useHydrated();
  const entry = useLocation({
    select: ({ pathname, state }) =>
      pathname === path || pathname === path + "/"
        ? state.__TSR_key
        : undefined,
  });
  const key = hydrated && entry ? `clik-collection:${entry}` : undefined;
  const bookmark = useMemo(() => readBookmark(key), [key]);
  const [selection, setSelection] = useState({
    key,
    filter: bookmark?.filter ?? "all",
  });
  if (selection.key !== key) {
    // A new sort keeps the active filter. Back restores that visit's filter.
    setSelection({ key, filter: bookmark?.filter ?? selection.filter });
  }
  return {
    key,
    entry,
    bookmark,
    filter: selection.filter,
    setFilter: (filter: Filter) => setSelection({ key, filter }),
  };
}

export function useCollectionReturn(
  { key, entry, bookmark, filter }: ReturnType<typeof useCollectionVisit>,
  {
    count,
    ready,
    status,
    loadMore,
  }: {
    count: number;
    ready: boolean;
    status: PaginationStatus;
    loadMore: (count: number) => void;
  },
) {
  const router = useRouter();
  const restored = useRef<Bookmark | undefined>(undefined);

  useLayoutEffect(() => {
    if (!key || !ready) return;
    const save = () => {
      const scroller = document.querySelector(".page-scroll");
      if (!scroller) return;
      // Keep the original position if the user leaves during restoration.
      if (
        bookmark &&
        restored.current !== bookmark &&
        bookmark.filter === filter
      )
        return;
      try {
        sessionStorage.setItem(
          key,
          JSON.stringify({ count, filter, scrollTop: scroller.scrollTop }),
        );
      } catch {
        // Browsing still works when session storage is full or disabled.
      }
    };
    const unsubscribe = router.subscribe(
      "onBeforeNavigate",
      ({ toLocation }) => {
        if (toLocation.state.__TSR_key !== entry) save();
      },
    );
    window.addEventListener("pagehide", save);
    return () => {
      unsubscribe();
      window.removeEventListener("pagehide", save);
    };
  }, [router, key, entry, ready, count, filter, bookmark]);

  useEffect(() => {
    if (!bookmark || restored.current === bookmark) return;
    if (bookmark.filter !== filter) {
      restored.current = bookmark;
      return;
    }
    if (!ready) return;
    if (count < bookmark.count && status !== "Exhausted") {
      if (status === "CanLoadMore") loadMore(12);
      return;
    }
    // The router can restore against a short first page or a loading skeleton.
    const frame = requestAnimationFrame(() => {
      const scroller = document.querySelector(".page-scroll");
      if (scroller) scroller.scrollTop = bookmark.scrollTop;
      restored.current = bookmark;
    });
    return () => cancelAnimationFrame(frame);
  }, [bookmark, filter, ready, count, status, loadMore]);
}
