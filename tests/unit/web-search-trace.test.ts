import { describe, expect, it } from "vitest";
import { buildWebSearchTraceFromResults } from "@/lib/web-search/trace";

describe("buildWebSearchTraceFromResults", () => {
  it("uses singular metadata for one source", () => {
    const trace = buildWebSearchTraceFromResults([
      {
        query: "current documentation",
        results: [
          {
            title: "Official docs",
            href: "https://docs.example.com",
            domain: "docs.example.com",
            brand: "generic",
            snippet: "A relevant source.",
          },
        ],
      },
    ]);

    expect(trace.steps[0]).toMatchObject({
      kind: "summary",
      label: "Ran 1 search",
      meta: "1 source",
    });
  });
});
