const storageKey = "clik:last-local-draft";

// An empty id explicitly opens the original "guest" draft.
export function isLocalDraftId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9-]{0,80}$/i.test(value);
}

export function getLastLocalDraftId(): string | undefined {
  try {
    const id = localStorage.getItem(storageKey);
    return isLocalDraftId(id) ? id : undefined;
  } catch {
    return undefined;
  }
}

export function rememberLocalDraft(id: string) {
  if (!isLocalDraftId(id)) return;
  try {
    localStorage.setItem(storageKey, id);
  } catch {
    // Saving scenes in IndexedDB must still work if preferences are blocked.
  }
}

export function forgetLocalDraft(id: string) {
  try {
    if (localStorage.getItem(storageKey) === id)
      localStorage.removeItem(storageKey);
  } catch {
    // Removing a scene does not depend on preference storage.
  }
}
