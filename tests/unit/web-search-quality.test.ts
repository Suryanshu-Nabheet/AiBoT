import { describe, expect, it } from "vitest";
import { filterIrrelevantNewsHomepages } from "@/lib/server/web-search/quality";

describe("filterIrrelevantNewsHomepages", () => {
  it("removes generic news homepages when the query is not about news", () => {
    const results = filterIrrelevantNewsHomepages(
      [
        {
          title: "Fox News - Breaking News Updates",
          href: "https://www.foxnews.com/",
          domain: "foxnews.com",
          brand: "generic",
        },
        {
          title: "Claude pricing - Anthropic",
          href: "https://www.anthropic.com/pricing",
          domain: "anthropic.com",
          brand: "generic",
        },
      ],
      "latest claude models with cost",
    );

    expect(results).toHaveLength(1);
    expect(results[0].domain).toBe("anthropic.com");
  });

  it("keeps news domains when the user asked for news", () => {
    const results = filterIrrelevantNewsHomepages(
      [
        {
          title: "Breaking News",
          href: "https://www.cnn.com/",
          domain: "cnn.com",
          brand: "generic",
        },
      ],
      "latest news bihar",
    );

    expect(results).toHaveLength(1);
  });
});
