import "server-only";

import { searchBing } from "@/lib/server/web-search/bing";
import { searchBraveApi } from "@/lib/server/web-search/brave-api";
import { searchBrave } from "@/lib/server/web-search/brave";
import { searchDuckDuckGo } from "@/lib/server/web-search/duckduckgo";
import { finalizeSearchResults } from "@/lib/server/web-search/quality";
import type { WebSearchApiResult } from "@/lib/web-search/types";

function acceptBatch(
  query: string,
  batch: WebSearchApiResult,
  maxResults: number,
): WebSearchApiResult | null {
  const results = finalizeSearchResults(query, batch.results, maxResults);
  if (results.length === 0) return null;
  return { query: batch.query, results };
}

/**
 * DuckDuckGo first (best relevance from residential-like IPs). On Vercel, DDG HTML
 * is often blocked — Brave API (when configured), Brave HTML, then Bing.
 */
export async function searchWeb(
  query: string,
  maxResults = 8,
): Promise<WebSearchApiResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { query: "", results: [] };
  }

  const providers: (() => Promise<WebSearchApiResult>)[] = [
    () => searchBraveApi(trimmed, maxResults),
    () => searchDuckDuckGo(trimmed, maxResults),
    () => searchBrave(trimmed, maxResults),
    () => searchBing(trimmed, maxResults),
  ];

  for (const run of providers) {
    try {
      const batch = await run();
      const accepted = acceptBatch(trimmed, batch, maxResults);
      if (accepted) return accepted;
    } catch {
      // fall through
    }
  }

  return { query: trimmed, results: [] };
}
