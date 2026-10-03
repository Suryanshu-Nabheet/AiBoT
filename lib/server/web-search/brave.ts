import "server-only";

import type {
  WebSearchApiResult,
  WebSearchSource,
} from "@/lib/web-search/types";
import {
  BROWSER_HEADERS,
  FETCH_TIMEOUT_MS,
  pushUniqueResult,
  sourceFromHref,
  stripHtml,
} from "@/lib/server/web-search/common";

const BRAVE_SEARCH = "https://search.brave.com/search";

/** Parse Brave web SERP HTML (keyless; works from datacenter IPs). */
export function parseBraveSearchHtml(
  html: string,
  maxResults: number,
): WebSearchSource[] {
  const results: WebSearchSource[] = [];
  const seen = new Set<string>();

  const resultRe =
    /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>[\s\S]*?<div class="title search-snippet-title[^"]*" title="([^"]+)"[^>]*>/gi;

  let match: RegExpExecArray | null;
  while (
    (match = resultRe.exec(html)) !== null &&
    results.length < maxResults
  ) {
    const href = match[1];
    const title = match[2].trim();
    if (!title || !href.startsWith("http")) continue;
    if (href.includes("search.brave.com") || href.includes("brave.com/api"))
      continue;

    const tail = html.slice(match.index, match.index + 2200);
    const snippetMatch = tail.match(
      /class="generic-snippet[\s\S]*?class="content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    );
    const snippet = snippetMatch ? stripHtml(snippetMatch[1]) : undefined;

    pushUniqueResult(
      results,
      seen,
      sourceFromHref(href, title, snippet || undefined),
      maxResults,
    );
  }

  return results;
}

export async function searchBrave(
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
    const url = `${BRAVE_SEARCH}?${new URLSearchParams({ q: trimmed })}`;
    const response = await fetch(url, {
      headers: {
        ...BROWSER_HEADERS,
        Referer: "https://search.brave.com/",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    const html = await response.text();
    if (!response.ok && response.status !== 429) {
      return { query: trimmed, results: [] };
    }

    const results = parseBraveSearchHtml(html, maxResults);
    return { query: trimmed, results };
  } finally {
    clearTimeout(timeout);
  }
}
