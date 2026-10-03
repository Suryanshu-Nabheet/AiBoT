import { describe, expect, it } from "vitest";
import { formatWebSearchContextForModel } from "@/lib/web-search/context";
import { mergeWebSearchBatches } from "@/lib/web-search/merge";

describe("mergeWebSearchBatches", () => {
  it("dedupes by URL and prefers longer snippets", () => {
    const merged = mergeWebSearchBatches(
      [
        {
          query: "a",
          results: [
            {
              title: "A",
              href: "https://example.com/a",
              domain: "example.com",
              brand: "generic",
              snippet: "short",
            },
          ],
        },
        {
          query: "b",
          results: [
            {
              title: "A longer",
              href: "https://example.com/a",
              domain: "example.com",
              brand: "generic",
              snippet: "much longer snippet text",
            },
          ],
        },
      ],
      5,
    );

    expect(merged).toHaveLength(1);
    expect(merged[0].snippet).toContain("much longer");
  });
});

describe("formatWebSearchContextForModel", () => {
  it("formats batches like the original web search context block", () => {
    const text = formatWebSearchContextForModel([
      {
        query: "react",
        results: [
          {
            title: "React",
            href: "https://react.dev/",
            domain: "react.dev",
            brand: "generic",
            snippet: "The library for web UIs.",
          },
        ],
      },
    ]);

    expect(text).toContain("Web search context");
    expect(text).toContain("Query: react");
    expect(text).toContain("https://react.dev/");
    expect(text).toContain("The library for web UIs.");
  });
});
