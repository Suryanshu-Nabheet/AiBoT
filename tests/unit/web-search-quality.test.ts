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

  it("discards completely unrelated commercial spam missing query tokens", () => {
    const results = finalizeSearchResults(
      "who is suryanshu nabheet",
      [
        {
          title: "The Lumen Project — FireRock Products",
          href: "https://firerockproducts.com/lumen",
          domain: "firerockproducts.com",
          brand: "generic",
        },
        {
          title: "Vermont Gray Black - FireRock Products",
          href: "https://firerockproducts.com/vermont",
          domain: "firerockproducts.com",
          brand: "generic",
        },
      ],
      8,
    );
    expect(results).toHaveLength(0);
  });

  it("limits results per domain to at most 2", () => {
    const results = finalizeSearchResults(
      "react 19 tutorials",
      [
        {
          title: "React 19 Hooks Tutorial",
          href: "https://example.com/1",
          domain: "example.com",
          brand: "generic",
        },
        {
          title: "React 19 Server Actions Tutorial",
          href: "https://example.com/2",
          domain: "example.com",
          brand: "generic",
        },
        {
          title: "React 19 Use Hook Tutorial",
          href: "https://example.com/3",
          domain: "example.com",
          brand: "generic",
        },
        {
          title: "React 19 Guide - Dev.to",
          href: "https://dev.to/react-19",
          domain: "dev.to",
          brand: "generic",
        },
      ],
      8,
    );
    expect(results).toHaveLength(3);
    const exampleCount = results.filter(
      (r) => r.domain === "example.com",
    ).length;
    expect(exampleCount).toBe(2);
  });

  it("ranks punctuation variants such as Next.js against nextjs queries", () => {
    const results = finalizeSearchResults(
      "nextjs news",
      [
        {
          title: "Next.js 15 Release Announcement",
          href: "https://vercel.com/blog/nextjs15",
          domain: "vercel.com",
          brand: "generic",
          snippet: "The Next.js framework release includes new features.",
        },
      ],
      5,
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.domain).toBe("vercel.com");
  });

  it("rejects version-mismatched and keyword-overlap noise", () => {
    const results = finalizeSearchResults(
      "the latest official React 19 updates, compare the released changes",
      [
        {
          title: "Amazon Changes Website Font, Customers React",
          href: "https://www.businessinsider.com/amazon-customers-react-2018",
          domain: "businessinsider.com",
          brand: "generic",
          snippet: "Customers react to a website font change.",
        },
        {
          title: "React 18 upgrade guide",
          href: "https://example.com/react-18",
          domain: "example.com",
          brand: "generic",
          snippet: "A guide to React 18 updates and changes.",
        },
        {
          title: "React 19",
          href: "https://react.dev/blog/2024/12/05/react-19",
          domain: "react.dev",
          brand: "generic",
          snippet: "React 19 introduces new features and changes.",
        },
      ],
      8,
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.domain).toBe("react.dev");
  });

  it("prioritizes the topic owner's site when official sources are requested", () => {
    const results = finalizeSearchResults(
      "latest official React 19 updates",
      [
        {
          title: "Every React 19 Change In 6 Minutes",
          href: "https://youtube.com/watch?v=example",
          domain: "youtube.com",
          brand: "generic",
          snippet: "A video about React 19 changes.",
        },
        {
          title: "React v19 – React",
          href: "https://react.dev/blog/2024/12/05/react-19",
          domain: "react.dev",
          brand: "generic",
          snippet: "React 19 introduces new features and changes.",
        },
      ],
      8,
    );

    expect(results[0]?.domain).toBe("react.dev");
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
