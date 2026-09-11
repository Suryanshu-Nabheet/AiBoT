/**
 * Shared thread spacing for direct chat and arena lanes (keep insets identical).
 */

import { cn } from "@/lib/utils";

/** Message rows, shimmer status, and thinking panels */
export const CHAT_THREAD_HORIZONTAL_INSET = "px-3 sm:px-4 md:px-5";

export const CHAT_THREAD_SCROLL_CLASS =
  "min-h-0 flex-1 w-full max-w-full overflow-y-auto overflow-x-hidden scroll-smooth overscroll-contain [scrollbar-gutter:stable] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/40";

export function chatThreadContentWrapClass(
  variant: "thread" | "arena" = "thread",
) {
  return cn(
    "mx-auto w-full",
    variant === "thread" ? "max-w-4xl" : "max-w-full",
    variant === "arena"
      ? "px-3 pb-6 pt-3 sm:px-4 sm:pb-8 sm:pt-4"
      : "px-2 pb-6 pt-4 sm:px-4 sm:pt-6 md:pt-8",
  );
}
