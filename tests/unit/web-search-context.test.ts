import { describe, expect, it } from "vitest";
import { formatWebSearchContextForModel } from "@/lib/web-search/context";
import { mergeWebSearchBatches } from "@/lib/web-search/merge";

describe("mergeWebSearchBatches", () => {
  it("dedupes by URL and prefers longer excerpts", () => {
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
              pageExcerpt: "Detailed page body text.",
            },
          ],
        },
      ],
      5,
    );

    expect(merged).toHaveLength(1);
    expect(merged[0].snippet).toContain("much longer");
    expect(merged[0].pageExcerpt).toContain("Detailed");
  });
});

describe("formatWebSearchContextForModel", () => {
  it("includes snippets, excerpts, and grounding instructions", () => {
    const text = formatWebSearchContextForModel(
      [
        {
          query: "react",
          results: [
            {
              title: "React",
              href: "https://react.dev/",
              domain: "react.dev",
              brand: "generic",
              snippet: "The library for web UIs.",
              pageExcerpt:
                "React lets you build user interfaces from components.",
            },
          ],
        },
      ],
      { userQuestion: "What is React?" },
    );

    expect(text).toContain("User question: What is React?");
    expect(text).toContain("Search snippet:");
    expect(text).toContain("Page excerpt:");
    expect(text).toContain("https://react.dev/");
    expect(text).toContain("cite the URL");
  });
});
