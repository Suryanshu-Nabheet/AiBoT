import "server-only";

import type {
  WebSearchApiResult,
  WebSearchSource,
} from "@/lib/web-search/types";
import { FETCH_TIMEOUT_MS, sourceFromHref } from "@/lib/server/web-search/common";

/** Official Brave Search API — reliable from Vercel/serverless when HTML scrapers fail. */
export async function searchBraveApi(
  query: string,
  maxResults = 8,
): Promise<WebSearchApiResult> {
  const trimmed = query.trim();
  const apiKey = process.env.BRAVE_SEARCH_API_KEY?.trim();
  if (!trimmed || !apiKey) {
    return { query: trimmed, results: [] };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const url = `https://api.search.brave.com/res/v1/web/search?${new URLSearchParams({
      q: trimmed,
      count: String(Math.min(maxResults, 20)),
      search_lang: "en",
      country: "US",
      text_decorations: "false",
    })}`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      return { query: trimmed, results: [] };
    }

    const data = (await response.json()) as {
      web?: { results?: { title?: string; url?: string; description?: string }[] };
    };

    const results: WebSearchSource[] = [];
    for (const item of data.web?.results ?? []) {
      if (!item.url || !item.title) continue;
      results.push(
        sourceFromHref(item.url, item.title, item.description?.trim() || undefined),
      );
      if (results.length >= maxResults) break;
    }

    return { query: trimmed, results };
  } finally {
    clearTimeout(timeout);
  }
}
