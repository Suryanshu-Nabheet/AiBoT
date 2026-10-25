import { afterEach, describe, expect, it, vi } from "vitest";

const quickSearch = vi.fn(async (query: string, _maxResults?: number) => ({
  query,
  results: [
    {
      title: "Ada Lovelace biography",
      domain: "britannica.com",
      href: "https://www.britannica.com/biography/Ada-Lovelace",
      brand: "generic" as const,
      snippet: "Ada Lovelace was an English mathematician.",
    },
  ],
}));
const hangingSearch = vi.fn(
  async (_query: string, _maxResults?: number, _signal?: AbortSignal) =>
    new Promise<never>(() => {}),
);

vi.mock("@/lib/server/web-search/tavily", () => ({
  searchTavily: (...args: Parameters<typeof quickSearch>) =>
    quickSearch(...args),
}));
vi.mock("@/lib/server/web-search/google-news", () => ({
  searchGoogleNews: (...args: Parameters<typeof hangingSearch>) =>
    hangingSearch(...args),
}));
vi.mock("@/lib/server/web-search/duckduckgo", () => ({
  searchDuckDuckGo: (...args: Parameters<typeof hangingSearch>) =>
    hangingSearch(...args),
}));
vi.mock("@/lib/server/web-search/brave", () => ({
  searchBrave: (...args: Parameters<typeof hangingSearch>) =>
    hangingSearch(...args),
}));
vi.mock("@/lib/server/web-search/bing", () => ({
  searchBing: (...args: Parameters<typeof hangingSearch>) =>
    hangingSearch(...args),
}));
vi.mock("@/lib/server/web-search/wikipedia", () => ({
  searchWikipediaEn: (...args: Parameters<typeof hangingSearch>) =>
    hangingSearch(...args),
}));

describe("web-search orchestration", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("returns fast sources when other providers exceed the shared deadline", async () => {
    vi.useFakeTimers();
    const { searchWeb } = await import("@/lib/server/web-search/search");

    const pending = searchWeb("Ada Lovelace", 5);
    await vi.advanceTimersByTimeAsync(6_500);
    const result = await pending;

    expect(result.results).toHaveLength(1);
    expect(result.results[0].domain).toBe("britannica.com");
    expect(hangingSearch).toHaveBeenCalled();
  });
});
