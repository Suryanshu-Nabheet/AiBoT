import { describe, expect, it } from "vitest";
import {
  normalizeUserQueryForSearch,
  planWebSearchQueries,
} from "@/lib/web-search/query";
import { parseDuckDuckGoHtml } from "@/lib/server/web-search/duckduckgo";

describe("normalizeUserQueryForSearch", () => {
  it("strips web search instructions from the prompt", () => {
    expect(
      normalizeUserQueryForSearch(
        "what is webrtc , do websearch to get latest context",
      ),
    ).toBe("webrtc");
  });

  it("extracts latest news topic from conversational prompts", () => {
    expect(
      normalizeUserQueryForSearch(
        "do web search and then give the latest news of bihar",
      ),
    ).toBe("latest news bihar");
  });
});

describe("planWebSearchQueries", () => {
  it("returns empty for blank input", () => {
    expect(planWebSearchQueries("   ")).toEqual([]);
  });

  it("uses the normalized message as the primary query", () => {
    expect(planWebSearchQueries("react server components")).toEqual([
      "react server components",
    ]);
  });

  it("adds a year query when freshness is implied", () => {
    const year = new Date().getFullYear();
    const queries = planWebSearchQueries("latest AI news");
    expect(queries).toHaveLength(2);
    expect(queries[0]).toBe("latest AI news");
    expect(queries[1]).toBe(`latest AI news ${year}`);
  });
});

describe("parseDuckDuckGoHtml", () => {
  it("extracts titles, links, and snippets from result blocks", () => {
    const html = `
      <a rel="nofollow" class="result__a" href="https://duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fpage">
        Example Title
      </a>
      <a class="result__snippet">A short description of the page.</a>
    `;

    const results = parseDuckDuckGoHtml(html, 5);
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Example Title");
    expect(results[0].href).toBe("https://example.com/page");
    expect(results[0].snippet).toBe("A short description of the page.");
    expect(results[0].domain).toBe("example.com");
  });

  it("parses when href appears before class", () => {
    const html = `<a href="https://webrtc.org/" rel="nofollow" class="result__a">WebRTC</a>`;
    const results = parseDuckDuckGoHtml(html, 5);
    expect(results).toHaveLength(1);
    expect(results[0].href).toBe("https://webrtc.org/");
  });

  it("respects maxResults", () => {
    const html = `
      <a class="result__a" href="https://a.test/1">One</a>
      <a class="result__a" href="https://b.test/2">Two</a>
      <a class="result__a" href="https://c.test/3">Three</a>
    `;
    expect(parseDuckDuckGoHtml(html, 2)).toHaveLength(2);
  });
});
