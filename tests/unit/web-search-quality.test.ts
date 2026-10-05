import { describe, expect, it } from "vitest";
import {
  finalizeSearchResults,
  filterIrrelevantNewsHomepages,
} from "@/lib/server/web-search/quality";
import { decodeHtmlEntities } from "@/lib/server/web-search/common";

describe("decodeHtmlEntities", () => {
  it("decodes numeric entities from SERP titles", () => {
    expect(decodeHtmlEntities("Google &#214;vers&#228;tt")).toBe(
      "Google Översätt",
    );
  });
});

describe("finalizeSearchResults", () => {
  it("rejects foreign-language SERP noise for English tech queries", () => {
    const results = finalizeSearchResults(
      "what is webrtc",
      [
        {
          title: "&#214;vergripande analys gav geh&#246;r",
          href: "https://www.lipus.se/report",
          domain: "lipus.se",
          brand: "generic",
        },
        {
          title: "Translate Swedish to English",
          href: "https://www.translate.com/",
          domain: "translate.com",
          brand: "generic",
        },
      ],
      8,
    );
    expect(results).toHaveLength(0);
  });
});

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
