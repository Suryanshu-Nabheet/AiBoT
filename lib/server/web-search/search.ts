import "server-only";

import { searchTavily } from "@/lib/server/web-search/tavily";
import { searchGoogleNews } from "@/lib/server/web-search/google-news";
import { searchDuckDuckGo } from "@/lib/server/web-search/duckduckgo";
import { searchBrave } from "@/lib/server/web-search/brave";
import { searchBing } from "@/lib/server/web-search/bing";
import { searchWikipediaEn } from "@/lib/server/web-search/wikipedia";
import { finalizeSearchResults } from "@/lib/server/web-search/quality";
import { enrichSourcesWithPageExcerpts } from "@/lib/server/web-search/enrich";
import { mergeWebSearchBatches } from "@/lib/web-search/merge";
import type { WebSearchApiResult } from "@/lib/web-search/types";

/**
 * Available keyless providers. The orchestrator selects providers by query
 * type, then runs the selected providers concurrently:
 * - Tavily: Real-time keyless web search for LLMs (`X-Tavily-Access-Mode: keyless`).
 * - Google News RSS: Current news coverage, supports English & Hindi.
 * - English Wikipedia OpenSearch: Stable entity and general-knowledge fallback.
 * - DuckDuckGo: GET/POST HTML + Lite + Instant Answer.
 * - Brave: Datacenter HTML scraper with graceful recovery.
 * - Bing: US market HTML SERP with decoded click redirect URLs.
 */
export const KEYLESS_PROVIDERS = [
  searchTavily,
  searchGoogleNews,
  searchDuckDuckGo,
  searchBrave,
  searchWikipediaEn,
  searchBing,
] as const;

const PROVIDER_DEADLINE_MS = 10_000;

async function searchWithProviderDeadline(
  provider: (query: string, maxResults?: number) => Promise<WebSearchApiResult>,
  query: string,
  maxResults: number,
): Promise<WebSearchApiResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      provider(query, maxResults),
      new Promise<WebSearchApiResult>((resolve) => {
        timer = setTimeout(
          () => resolve({ query, results: [] }),
          PROVIDER_DEADLINE_MS,
        );
      }),
    ]);
  } catch {
    return { query, results: [] };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Purely key-free web search. No search API keys required.
 * Runs keyless providers in parallel, merges results, and applies quality filters.
 */
export async function searchWeb(
  query: string,
  maxResults = 8,
  options?: { enrichPageExcerpts?: boolean },
): Promise<WebSearchApiResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { query: "", results: [] };
  }

  maxResults = Math.min(12, Math.max(1, Math.floor(maxResults) || 8));
  const isFreshOrNews =
    /\b(latest|recent|current|today|yesterday|breaking|news|headlines|released?|updates?|price|weather|forecast|score|results|gpt[- ]?\d|claude|gemini|deepseek|sora|blackwell|nemotron)\b|\breact\s*19\b|\bnext\.?js\s*15\b|\btailwind\s*v?4\b/i.test(
      trimmed,
    );
  const isNewsQuery =
    /\b(news|headlines|released?|announced|launch(?:ed)?|breaking)\b/i.test(
      trimmed,
    ) ||
    /\b(latest|recent|current)\b.{0,50}\b(ai|technology|model|product|framework|software)\b/i.test(
      trimmed,
    );
  const providers = KEYLESS_PROVIDERS.filter((provider) => {
    if (provider === searchGoogleNews) return isNewsQuery;
    if (provider === searchWikipediaEn) return !isFreshOrNews;
    return true;
  });

  const settled = await Promise.all(
    providers.map((provider) =>
      searchWithProviderDeadline(provider, trimmed, maxResults),
    ),
  );
  const batches = settled.filter(
    (batch) => Array.isArray(batch.results) && batch.results.length > 0,
  );

  // Keep all provider candidates until topic-aware ranking has run. A large
  // snippet alone must not crowd stronger results out before relevance checks.
  const merged = mergeWebSearchBatches(
    batches,
    maxResults * KEYLESS_PROVIDERS.length,
  );
  const candidates = finalizeSearchResults(trimmed, merged, maxResults);
  const enriched = options?.enrichPageExcerpts
    ? await enrichSourcesWithPageExcerpts(candidates, {
        maxPages: Math.min(3, maxResults),
      })
    : candidates;
  const results = finalizeSearchResults(trimmed, enriched, maxResults);

  return { query: trimmed, results };
}
