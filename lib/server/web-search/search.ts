import "server-only";

import { searchBing } from "@/lib/server/web-search/bing";
import { searchBrave } from "@/lib/server/web-search/brave";
import { searchDuckDuckGo } from "@/lib/server/web-search/duckduckgo";
import { searchGoogleNews } from "@/lib/server/web-search/google-news";
import { searchWikipediaEn } from "@/lib/server/web-search/wikipedia";
import { finalizeSearchResults } from "@/lib/server/web-search/quality";
import { mergeWebSearchBatches } from "@/lib/web-search/merge";
import type { WebSearchApiResult } from "@/lib/web-search/types";

/**
 * 100% key-free search providers running concurrently:
 * - Google News RSS: Real-time web/news coverage, zero IP blocking on Vercel, supports English & Hindi.
 * - Wikipedia En/Hi: MediaWiki full-text search across millions of topics and concepts.
 * - DuckDuckGo: GET/POST HTML + Lite + Instant Answer.
 * - Brave: Datacenter HTML scraper with graceful recovery.
 * - Bing: US market HTML SERP with decoded click redirect URLs.
 */
export const KEYLESS_PROVIDERS = [
  searchGoogleNews,
  searchWikipediaEn,
  searchDuckDuckGo,
  searchBrave,
  searchBing,
] as const;

/**
 * Purely key-free web search. No search API keys required.
 * Runs keyless providers in parallel, merges results, and applies quality filters.
 */
export async function searchWeb(
  query: string,
  maxResults = 8,
): Promise<WebSearchApiResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { query: "", results: [] };
  }

  const settled = await Promise.allSettled(
    KEYLESS_PROVIDERS.map((provider) => provider(trimmed, maxResults)),
  );

  const batches: WebSearchApiResult[] = [];
  for (const outcome of settled) {
    if (outcome.status === "fulfilled" && outcome.value.results.length > 0) {
      batches.push(outcome.value);
    }
  }

  const merged = mergeWebSearchBatches(batches, maxResults * 2);
  const results = finalizeSearchResults(trimmed, merged, maxResults);

  return { query: trimmed, results };
}
