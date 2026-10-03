import { describe, expect, it, vi } from "vitest";
import { scrollThreadToEnd } from "@/lib/chat/scroll-thread-to-end";

describe("scrollThreadToEnd", () => {
  it("scrolls the container without calling scrollIntoView", () => {
    const scrollTo = vi.fn();
    const container = {
      scrollHeight: 1200,
      scrollTo,
    } as unknown as HTMLDivElement;

    scrollThreadToEnd({ current: container }, "smooth");

    expect(scrollTo).toHaveBeenCalledWith({
      top: 1200,
      behavior: "smooth",
    });
  });
});
