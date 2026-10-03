import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WebSearchApiResult } from "@/lib/web-search/types";

const searchBing = vi.fn<() => Promise<WebSearchApiResult>>();
const searchBrave = vi.fn<() => Promise<WebSearchApiResult>>();
const searchDuckDuckGo = vi.fn<() => Promise<WebSearchApiResult>>();

vi.mock("@/lib/server/web-search/bing", () => ({ searchBing }));
vi.mock("@/lib/server/web-search/brave", () => ({ searchBrave }));
vi.mock("@/lib/server/web-search/duckduckgo", () => ({ searchDuckDuckGo }));

describe("searchWeb orchestration", () => {
  beforeEach(() => {
    searchBing.mockReset();
    searchBrave.mockReset();
    searchDuckDuckGo.mockReset();
  });

  it("returns the first provider that yields results", async () => {
    searchBing.mockResolvedValue({ query: "react", results: [] });
    searchBrave.mockResolvedValue({
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
    searchDuckDuckGo.mockResolvedValue({ query: "react", results: [] });

    const { searchWeb } = await import("@/lib/server/web-search/search");
    const batch = await searchWeb("react", 5);

    expect(batch.results).toHaveLength(1);
    expect(searchBing).toHaveBeenCalledOnce();
    expect(searchBrave).toHaveBeenCalledOnce();
    expect(searchDuckDuckGo).not.toHaveBeenCalled();
  });

  it("falls through to DuckDuckGo when earlier providers are empty", async () => {
    searchBing.mockResolvedValue({ query: "vue", results: [] });
    searchBrave.mockResolvedValue({ query: "vue", results: [] });
    searchDuckDuckGo.mockResolvedValue({
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
    expect(searchDuckDuckGo).toHaveBeenCalledOnce();
  });
});
