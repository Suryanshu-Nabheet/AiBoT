import { afterEach, describe, expect, it, vi } from "vitest";

const { fetchPageExcerpt } = vi.hoisted(() => ({
  fetchPageExcerpt: vi.fn<() => Promise<string | undefined>>(),
}));

vi.mock("@/lib/server/web-search/page-excerpt", () => ({ fetchPageExcerpt }));

import { enrichSourcesWithPageExcerpts } from "@/lib/server/web-search/enrich";

describe("enrichSourcesWithPageExcerpts", () => {
  afterEach(() => {
    vi.useRealTimers();
    fetchPageExcerpt.mockReset();
  });

  it("returns search results when a page excerpt fetch stalls", async () => {
    vi.useFakeTimers();
    fetchPageExcerpt.mockImplementation(
      () => new Promise<string | undefined>(() => undefined),
    );
    const source = {
      title: "React",
      href: "https://react.dev/",
      domain: "react.dev",
      brand: "generic" as const,
      snippet: "A library for web interfaces.",
    };

    const resultPromise = enrichSourcesWithPageExcerpts([source], {
      maxPages: 1,
    });
    await vi.advanceTimersByTimeAsync(5_001);
    const result = await resultPromise;

    expect(result).toEqual([source]);
  });
});
