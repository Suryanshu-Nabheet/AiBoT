import { describe, expect, it, vi } from "vitest";
import { searchTavily } from "@/lib/server/web-search/tavily";

describe("searchTavily (keyless & API key)", () => {
  it("returns empty result for blank query", async () => {
    const res = await searchTavily("   ");
    expect(res).toEqual({ query: "", results: [] });
  });

  it("sends keyless header and extracts structured results correctly", async () => {
    const mockResponse = {
      query: "patna weather",
      results: [
        {
          url: "https://weather.com/patna",
          title: "Patna Weather Today",
          content: "Sunny with high of 30C and gentle breeze.",
          score: 0.95,
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    vi.stubGlobal("fetch", fetchMock);

    const res = await searchTavily("patna weather", 5);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers["X-Tavily-Access-Mode"]).toBe("keyless");

    expect(res.results).toHaveLength(1);
    expect(res.results[0].title).toBe("Patna Weather Today");
    expect(res.results[0].domain).toBe("weather.com");
    expect(res.results[0].snippet).toBe(
      "Sunny with high of 30C and gentle breeze.",
    );

    vi.unstubAllGlobals();
  });

  it("gracefully returns empty array on network failure", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Network timeout"));
    vi.stubGlobal("fetch", fetchMock);

    const res = await searchTavily("test query", 5);
    expect(res.results).toEqual([]);

    vi.unstubAllGlobals();
  });

  it("keeps its deadline active while reading a stalled response body", async () => {
    vi.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    const fetchMock = vi.fn((_url: string, options: RequestInit) => {
      requestSignal = options.signal as AbortSignal;
      return Promise.resolve({
        ok: true,
        json: () =>
          new Promise((_, reject) => {
            requestSignal?.addEventListener(
              "abort",
              () => reject(new DOMException("Aborted", "AbortError")),
              { once: true },
            );
          }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    try {
      const resultPromise = searchTavily("slow response body");
      await vi.advanceTimersByTimeAsync(6_001);
      const result = await Promise.race([
        resultPromise,
        Promise.resolve("still pending"),
      ]);

      expect(requestSignal?.aborted).toBe(true);
      expect(result).not.toBe("still pending");
      expect(result).toMatchObject({ results: [] });
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });
});
