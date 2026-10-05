import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WebSearchApiResult } from "@/lib/web-search/types";

const searchBing = vi.fn<() => Promise<WebSearchApiResult>>();
const searchBrave = vi.fn<() => Promise<WebSearchApiResult>>();
const searchDuckDuckGo = vi.fn<() => Promise<WebSearchApiResult>>();
const searchWikipediaEn = vi.fn<() => Promise<WebSearchApiResult>>();

vi.mock("@/lib/server/web-search/bing", () => ({ searchBing }));
vi.mock("@/lib/server/web-search/brave", () => ({ searchBrave }));
vi.mock("@/lib/server/web-search/duckduckgo", () => ({ searchDuckDuckGo }));
vi.mock("@/lib/server/web-search/wikipedia", () => ({ searchWikipediaEn }));

describe("searchWeb orchestration", () => {
  beforeEach(() => {
    searchBing.mockReset();
    searchBrave.mockReset();
    searchDuckDuckGo.mockReset();
    searchWikipediaEn.mockReset();
    searchBing.mockResolvedValue({ query: "", results: [] });
    searchBrave.mockResolvedValue({ query: "", results: [] });
    searchWikipediaEn.mockResolvedValue({ query: "", results: [] });
  });

  it("returns DuckDuckGo hits when they pass quality filters", async () => {
    searchDuckDuckGo.mockResolvedValue({
      query: "react",
      results: [
        {
          title: "React",
          href: "https://react.dev/",
          domain: "react.dev",
          brand: "generic",
        },
      ],
    });

    const { searchWeb } = await import("@/lib/server/web-search/search");
    const batch = await searchWeb("react", 5);

    expect(batch.results).toHaveLength(1);
    expect(batch.results[0]?.href).toBe("https://react.dev/");
    expect(searchDuckDuckGo).toHaveBeenCalledOnce();
  });

  it("merges Brave results when DuckDuckGo is empty", async () => {
    searchDuckDuckGo.mockResolvedValue({ query: "vue", results: [] });
    searchBrave.mockResolvedValue({
      query: "vue",
      results: [
        {
          title: "Vue.js",
          href: "https://vuejs.org/",
          domain: "vuejs.org",
          brand: "generic",
        },
      ],
    });

    const { searchWeb } = await import("@/lib/server/web-search/search");
    const batch = await searchWeb("vue", 5);

    expect(batch.results[0]?.href).toBe("https://vuejs.org/");
  });

  it("filters Bing noise and keeps Wikipedia for definitional queries", async () => {
    searchDuckDuckGo.mockResolvedValue({
      query: "what is webrtc",
      results: [],
    });
    searchBrave.mockResolvedValue({ query: "what is webrtc", results: [] });
    searchBing.mockResolvedValue({
      query: "what is webrtc",
      results: [
        {
          title: "&#214;vergripande analys",
          href: "https://www.lipus.se/x",
          domain: "lipus.se",
          brand: "generic",
        },
      ],
    });
    searchWikipediaEn.mockResolvedValue({
      query: "what is webrtc",
      results: [
        {
          title: "WebRTC",
          href: "https://en.wikipedia.org/wiki/WebRTC",
          domain: "wikipedia.org",
          brand: "wikipedia",
        },
      ],
    });

    const { searchWeb } = await import("@/lib/server/web-search/search");
    const batch = await searchWeb("what is webrtc", 5);

    expect(batch.results[0]?.href).toContain("wikipedia.org/wiki/WebRTC");
    expect(batch.results.some((r) => r.domain === "lipus.se")).toBe(false);
  });
});
