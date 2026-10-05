import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WebSearchApiResult } from "@/lib/web-search/types";

const searchBing = vi.fn<() => Promise<WebSearchApiResult>>();
const searchBrave = vi.fn<() => Promise<WebSearchApiResult>>();
const searchBraveApi = vi.fn<() => Promise<WebSearchApiResult>>();
const searchDuckDuckGo = vi.fn<() => Promise<WebSearchApiResult>>();

vi.mock("@/lib/server/web-search/bing", () => ({ searchBing }));
vi.mock("@/lib/server/web-search/brave", () => ({ searchBrave }));
vi.mock("@/lib/server/web-search/brave-api", () => ({ searchBraveApi }));
vi.mock("@/lib/server/web-search/duckduckgo", () => ({ searchDuckDuckGo }));

describe("searchWeb orchestration", () => {
  beforeEach(() => {
    searchBing.mockReset();
    searchBrave.mockReset();
    searchBraveApi.mockReset();
    searchDuckDuckGo.mockReset();
    searchBraveApi.mockResolvedValue({ query: "", results: [] });
  });

  it("prefers DuckDuckGo when it returns results", async () => {
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
    searchBrave.mockResolvedValue({ query: "react", results: [] });
    searchBing.mockResolvedValue({ query: "react", results: [] });

    const { searchWeb } = await import("@/lib/server/web-search/search");
    const batch = await searchWeb("react", 5);

    expect(batch.results).toHaveLength(1);
    expect(searchDuckDuckGo).toHaveBeenCalledOnce();
    expect(searchBrave).not.toHaveBeenCalled();
    expect(searchBing).not.toHaveBeenCalled();
  });

  it("falls through to Brave when DuckDuckGo is empty", async () => {
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
    searchBing.mockResolvedValue({ query: "vue", results: [] });

    const { searchWeb } = await import("@/lib/server/web-search/search");
    const batch = await searchWeb("vue", 5);

    expect(batch.results[0]?.href).toBe("https://vuejs.org/");
    expect(searchDuckDuckGo).toHaveBeenCalledOnce();
    expect(searchBrave).toHaveBeenCalledOnce();
    expect(searchBing).not.toHaveBeenCalled();
  });
});
