import "server-only";

import { searchBing } from "@/lib/server/web-search/bing";
import { searchBrave } from "@/lib/server/web-search/brave";
import { searchDuckDuckGo } from "@/lib/server/web-search/duckduckgo";
import { filterIrrelevantNewsHomepages } from "@/lib/server/web-search/quality";
import type { WebSearchApiResult } from "@/lib/web-search/types";

/**
 * DuckDuckGo first (best relevance, original behavior). Brave/Bing only when
 * DDG is empty (e.g. Vercel bot challenge). Bing is last and filtered.
 */
export async function searchWeb(
  query: string,
  maxResults = 8,
): Promise<WebSearchApiResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { query: "", results: [] };
  }

  try {
    const ddg = await searchDuckDuckGo(trimmed, maxResults);
    if (ddg.results.length > 0) return ddg;
  } catch {
    // fall through
  }

  try {
    const brave = await searchBrave(trimmed, maxResults);
    if (brave.results.length > 0) return brave;
  } catch {
    // fall through
  }

  try {
    const bing = await searchBing(trimmed, maxResults);
    const results = filterIrrelevantNewsHomepages(bing.results, trimmed);
    if (results.length > 0) {
      return { query: trimmed, results };
    }
  } catch {
    // fall through
  }

  return { query: trimmed, results: [] };
}
