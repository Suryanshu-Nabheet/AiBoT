import "server-only";

import type {
  WebSearchApiResult,
  WebSearchSource,
} from "@/lib/web-search/types";
import {
  FETCH_TIMEOUT_MS,
  pushUniqueResult,
  sourceFromHref,
} from "@/lib/server/web-search/common";

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";

interface TavilySearchResponse {
  query?: string;
  results?: Array<{
    url?: string;
    title?: string;
    content?: string;
    score?: number;
  }>;
}

/**
 * Keyless search provider using Tavily.
 * Uses `X-Tavily-Access-Mode: keyless` (or optional `TAVILY_API_KEY` environment variable).
 */
export async function searchTavily(
  query: string,
  maxResults = 8,
): Promise<WebSearchApiResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { query: "", results: [] };
  }

  const apiKey = process.env.TAVILY_API_KEY?.trim();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  } else {
    headers["X-Tavily-Access-Mode"] = "keyless";
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Math.min(FETCH_TIMEOUT_MS, 6_000),
  );

  try {
    const body: Record<string, unknown> = {
      query: trimmed,
      max_results: maxResults,
    };
    if (apiKey) {
      body.api_key = apiKey;
    }

    const response = await fetch(TAVILY_SEARCH_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      return { query: trimmed, results: [] };
    }

    const data = (await response.json()) as TavilySearchResponse;
    const items = data.results ?? [];

    const results: WebSearchSource[] = [];
    const seen = new Set<string>();

    for (const item of items) {
      if (results.length >= maxResults) break;
      const href = item.url?.trim();
      const title = item.title?.trim();
      if (!href || !title || !href.startsWith("http")) continue;

      const snippet = item.content?.trim();
      pushUniqueResult(
        results,
        seen,
        sourceFromHref(href, title, snippet || undefined),
        maxResults,
      );
    }

    return { query: trimmed, results };
  } catch {
    return { query: trimmed, results: [] };
  } finally {
    // Keep the deadline active through response.json(); headers can arrive
    // while a provider stalls the response body indefinitely.
    clearTimeout(timeout);
  }
}
