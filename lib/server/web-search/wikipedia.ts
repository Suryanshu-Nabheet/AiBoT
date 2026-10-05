import "server-only";

import type {
  WebSearchApiResult,
  WebSearchSource,
} from "@/lib/web-search/types";
import {
  FETCH_TIMEOUT_MS,
  sourceFromHref,
} from "@/lib/server/web-search/common";

const WIKI_OPENSEARCH = "https://en.wikipedia.org/w/api.php";

/** Focus opensearch on the topic for "what/who is …" prompts. */
export function wikipediaSearchTerm(query: string): string {
  const trimmed = query.trim();
  const stripped = trimmed
    .replace(/^(what|who)\s+is\s+/i, "")
    .replace(/[.?!,]+$/g, "")
    .trim();
  return (stripped || trimmed).slice(0, 300);
}

/** English Wikipedia opensearch — stable from serverless IPs when HTML scrapers fail. */
export async function searchWikipediaEn(
  query: string,
  maxResults = 8,
): Promise<WebSearchApiResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { query: "", results: [] };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const search = wikipediaSearchTerm(trimmed);
    const url = `${WIKI_OPENSEARCH}?${new URLSearchParams({
      action: "opensearch",
      search,
      limit: String(Math.min(maxResults, 10)),
      namespace: "0",
      format: "json",
      origin: "*",
    })}`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      return { query: trimmed, results: [] };
    }

    const data = (await response.json()) as [
      string,
      string[],
      string[],
      string[],
    ];

    const titles = data[1] ?? [];
    const descriptions = data[2] ?? [];
    const urls = data[3] ?? [];

    const results: WebSearchSource[] = [];
    for (let i = 0; i < titles.length && results.length < maxResults; i += 1) {
      const title = titles[i];
      const href = urls[i];
      if (!title || !href?.startsWith("http")) continue;
      results.push(
        sourceFromHref(
          href,
          title,
          descriptions[i]?.trim() || `English Wikipedia article: ${title}`,
        ),
      );
    }

    return { query: trimmed, results };
  } finally {
    clearTimeout(timeout);
  }
}
