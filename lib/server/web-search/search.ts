import "server-only";

import { searchTavily } from "@/lib/server/web-search/tavily";
import { searchGoogleNews } from "@/lib/server/web-search/google-news";
import { searchDuckDuckGo } from "@/lib/server/web-search/duckduckgo";
import { searchBrave } from "@/lib/server/web-search/brave";
import { searchBing } from "@/lib/server/web-search/bing";
import { searchWikipediaEn } from "@/lib/server/web-search/wikipedia";
import { finalizeSearchResults } from "@/lib/server/web-search/quality";
import { enrichSourcesWithPageExcerpts } from "@/lib/server/web-search/enrich";
import { runProviderWithResilience } from "@/lib/server/web-search/provider-resilience";
import { mergeWebSearchBatches } from "@/lib/web-search/merge";
import type { WebSearchApiResult } from "@/lib/web-search/types";

/** Bound total provider fan-out latency while retaining any sources already found. */
const SEARCH_BUDGET_MS = 6_500;

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
const PROVIDERS = [
  { name: "tavily", search: searchTavily },
  { name: "google_news", search: searchGoogleNews },
  { name: "duckduckgo", search: searchDuckDuckGo },
  { name: "brave", search: searchBrave },
  { name: "wikipedia", search: searchWikipediaEn },
  { name: "bing", search: searchBing },
] as const;

export const KEYLESS_PROVIDERS = PROVIDERS.map((provider) => provider.search);

/**
 * Purely key-free web search. No search API keys required.
 * Runs keyless providers in parallel, merges results, and applies quality filters.
 */
export async function searchWeb(
  query: string,
  maxResults = 8,
  options?: { enrichPageExcerpts?: boolean; signal?: AbortSignal },
): Promise<WebSearchApiResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { query: "", results: [] };
  }

  maxResults = Math.min(12, Math.max(1, Math.floor(maxResults) || 8));
  const startedAt = Date.now();
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
  const providers = PROVIDERS.filter(({ search }) => {
    if (search === searchGoogleNews) return isNewsQuery;
    if (search === searchWikipediaEn) return !isFreshOrNews;
    return true;
  });

  const searchController = new AbortController();
  const searchSignal = options?.signal
    ? AbortSignal.any([options.signal, searchController.signal])
    : searchController.signal;
  const deadline = setTimeout(() => searchController.abort(), SEARCH_BUDGET_MS);
  let settled: Awaited<ReturnType<typeof runProviderWithResilience>>[];
  try {
    settled = await Promise.all(
      providers.map(({ name, search }) =>
        runProviderWithResilience(
          name,
          trimmed,
          maxResults,
          search,
          searchSignal,
        ),
      ),
    );
  } finally {
    clearTimeout(deadline);
    if (!searchController.signal.aborted) searchController.abort();
  }
  const batches = settled
    .map((result) => result.batch)
    .filter(
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
        signal: options.signal,
      })
    : candidates;
  const results = finalizeSearchResults(trimmed, enriched, maxResults);

  // One privacy-safe structured event per search; never log the query, URLs,
  // titles, snippets, user messages, or provider response bodies.
  console.info(
    JSON.stringify({
      event: "aibot.web_search.providers",
      durationMs: Date.now() - startedAt,
      candidateCount: merged.length,
      acceptedCount: results.length,
      partial: settled.some(
        (item) =>
          item.observation.outcome !== "results" &&
          item.observation.outcome !== "empty",
      ),
      providers: settled.map((item) => item.observation),
    }),
  );

  const failedProviders = settled.filter(
    (item) =>
      item.observation.outcome !== "results" &&
      item.observation.outcome !== "empty",
  );
  const successfulProviders = settled.length - failedProviders.length;
  const status =
    successfulProviders === 0
      ? "error"
      : failedProviders.length > 0
        ? "partial"
        : "complete";

  return {
    query: trimmed,
    results,
    status,
    ...(status === "error"
      ? { errorMessage: "All web search providers are currently unavailable." }
      : status === "partial"
        ? { errorMessage: "Some web search providers were unavailable." }
        : {}),
  };
}
