import type { KeyboardEvent } from "react";
import { ConvexError } from "convex/values";

export const inputClass =
  "w-full min-h-26 max-h-90 resize-y rounded-lg border-[#dfe5ef] bg-[#fafbfd] p-3 text-sm leading-[1.7] text-[#2e405b] placeholder:text-[#8392a8] focus-visible:border-[#356ae6] focus-visible:ring-[#356ae6]/20 md:text-sm md:leading-[1.7]";
export const controlClass =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#356ae6] focus-visible:outline-offset-3 disabled:cursor-not-allowed disabled:opacity-40";
export const primaryClass = `${controlClass} min-h-10 bg-[#356ae6] text-white hover:bg-[#2458ce]`;
export const actionClass = `${controlClass} min-h-9 text-[#63758f] hover:bg-[#eef2f8] hover:text-[#25354e]`;
export const errorClass =
  "mt-3 rounded-lg border border-[#efd5db] bg-[#fff4f6] px-3 py-2.5 text-[13px] leading-relaxed text-[#9d3d50] wrap-anywhere";

export function submitOnShortcut(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (
    event.key === "Enter" &&
    (event.ctrlKey || event.metaKey) &&
    !event.nativeEvent.isComposing
  ) {
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }
}

export function commentError(error: unknown, fallback: string) {
  return error instanceof ConvexError && typeof error.data === "string"
    ? error.data
    : fallback;
}
