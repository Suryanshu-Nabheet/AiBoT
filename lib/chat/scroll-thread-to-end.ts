import type { RefObject } from "react";

/** Scroll a thread viewport to the latest message without moving ancestor layouts. */
export function scrollThreadToEnd(
  scrollRef: RefObject<HTMLDivElement | null>,
  behavior: ScrollBehavior = "smooth",
) {
  const container = scrollRef.current;
  if (!container) return;
  container.scrollTo({
    top: container.scrollHeight,
    behavior,
  });
}
