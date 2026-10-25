import { afterEach, describe, expect, it, vi } from "vitest";
import { runWebSearchForTurn } from "@/lib/web-search/client";

describe("runWebSearchForTurn", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends the original request for server-side planning and preserves provider failures", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        const request = JSON.parse(String(init?.body)) as Record<
          string,
          unknown
        >;
        expect(request.query).toBe("Search the web for current React changes");
        expect(request).not.toHaveProperty("queries");
        return new Response(
          JSON.stringify({
            batches: [
              {
                query: "current React changes",
                results: [],
                status: "error",
                errorMessage: "All search providers are unavailable.",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await runWebSearchForTurn(
      "Search the web for current React changes",
      { force: true },
    );

    expect(result.trace.status).toBe("error");
    expect(result.context).toContain("WEB SEARCH FAILED");
    expect(result.context).toContain("Do not fabricate current facts");
  });

  it("returns a server-side intent skip without fabricating an empty result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              batches: [],
              skipped: true,
              reason: "skip_greeting",
            }),
            { status: 200 },
          ),
      ),
    );

    const result = await runWebSearchForTurn(
      "What are the latest weather updates?",
      { force: true },
    );
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("skip_greeting");
    expect(result.context).toBe("");
  });
});
