import { useSyncExternalStore } from "react";

export const ANALYTICS_CONSENT_KEY = "clik-analytics-consent";
const changeEvent = "clik:analytics-consent";
const lifetime = 180 * 24 * 60 * 60 * 1000;
export type AnalyticsConsent = "accepted" | "declined";
type Choice = { value: AnalyticsConsent; expiresAt: number };
let memoryChoice: Choice | undefined;

export function analyticsConfigured() {
  return (
    import.meta.env.PROD && Boolean(import.meta.env.VITE_PUBLIC_POSTHOG_KEY)
  );
}

export function getAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      memoryChoice ??
      JSON.parse(window.localStorage.getItem(ANALYTICS_CONSENT_KEY) || "null");
    if (
      raw &&
      (raw.value === "accepted" || raw.value === "declined") &&
      typeof raw.expiresAt === "number" &&
      raw.expiresAt > Date.now()
    )
      return raw.value;
  } catch {
    // A blocked or damaged storage must never grant consent.
    if (memoryChoice && memoryChoice.expiresAt > Date.now())
      return memoryChoice.value;
  }
  return null;
}

export function setAnalyticsConsent(value: AnalyticsConsent) {
  const choice = { value, expiresAt: Date.now() + lifetime };
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, JSON.stringify(choice));
    memoryChoice = undefined;
  } catch {
    // Keep the choice for this tab when the browser disallows persistence.
    memoryChoice = choice;
  }
  window.dispatchEvent(new Event(changeEvent));
}

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === ANALYTICS_CONSENT_KEY || event.key === null) listener();
  };
  window.addEventListener(changeEvent, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(changeEvent, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useAnalyticsConsent() {
  return useSyncExternalStore(subscribe, getAnalyticsConsent, () => null);
}
