import { describe, expect, it } from "vitest";
import {
  normalizeUserQueryForSearch,
  planWebSearchQueries,
} from "@/lib/web-search/query";
import {
  decodeBingRedirect,
  parseBingSearchHtml,
} from "@/lib/server/web-search/bing";
import { parseBraveSearchHtml } from "@/lib/server/web-search/brave";
import { isDuckDuckGoBlockedHtml } from "@/lib/server/web-search/common";
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

describe("isDuckDuckGoBlockedHtml", () => {
  it("detects bot challenge pages", () => {
    expect(
      isDuckDuckGoBlockedHtml(
        '<div class="anomaly-modal">bots use DuckDuckGo</div>',
      ),
    ).toBe(true);
    expect(isDuckDuckGoBlockedHtml('<a class="result__a">ok</a>')).toBe(false);
  });
});

describe("decodeBingRedirect", () => {
  it("decodes Bing click-through URLs", () => {
    const href =
      "https://www.bing.com/ck/a?!&&p=x&u=a1aHR0cHM6Ly9leGFtcGxlLmNvbS8&ntb=1";
    expect(decodeBingRedirect(href)).toBe("https://example.com/");
  });
});

describe("parseBingSearchHtml", () => {
  it("extracts results from b_algo blocks", () => {
    const html = `
      <li class="b_algo">
        <h2><a href="https://www.bing.com/ck/a?u=a1aHR0cHM6Ly9leGFtcGxlLmNvbS8">Example Site</a></h2>
        <div class="b_caption"><p>A short description.</p></div>
      </li>
    `;
    const results = parseBingSearchHtml(html, 5);
    expect(results).toHaveLength(1);
    expect(results[0].href).toBe("https://example.com/");
    expect(results[0].title).toBe("Example Site");
    expect(results[0].snippet).toBe("A short description.");
  });
});

describe("parseBraveSearchHtml", () => {
  it("extracts title, href, and snippet from Brave SERP markup", () => {
    const html = `
      <a href="https://example.com/page">
        <div class="title search-snippet-title line-clamp-1" title="Example Page Title">Example Page Title</div>
      </a>
      <div class="generic-snippet"><div class="content">A helpful snippet about the page.</div></div>
    `;

    const results = parseBraveSearchHtml(html, 5);
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Example Page Title");
    expect(results[0].href).toBe("https://example.com/page");
    expect(results[0].snippet).toBe("A helpful snippet about the page.");
    expect(results[0].domain).toBe("example.com");
  });
});
