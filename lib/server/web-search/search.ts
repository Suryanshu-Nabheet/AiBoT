import "server-only";

import { searchBing } from "@/lib/server/web-search/bing";
import { searchBrave } from "@/lib/server/web-search/brave";
import { searchDuckDuckGo } from "@/lib/server/web-search/duckduckgo";
import { searchWikipediaEn } from "@/lib/server/web-search/wikipedia";
import { finalizeSearchResults } from "@/lib/server/web-search/quality";
import { mergeWebSearchBatches } from "@/lib/web-search/merge";
import type { WebSearchApiResult } from "@/lib/web-search/types";

const KEYLESS_PROVIDERS = [
  searchDuckDuckGo,
  searchBrave,
  searchWikipediaEn,
  searchBing,
] as const;

/**
 * Keyless web search only — no API keys beyond OpenRouter for the app.
 * Runs providers in parallel, merges unique URLs, then applies quality filters.
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
