import "server-only";

import { searchBing } from "@/lib/server/web-search/bing";
import { searchBrave } from "@/lib/server/web-search/brave";
import { searchDuckDuckGo } from "@/lib/server/web-search/duckduckgo";
import type { WebSearchApiResult } from "@/lib/web-search/types";

type ProviderSearch = (
  query: string,
  maxResults: number,
) => Promise<WebSearchApiResult>;

const KEYLESS_PROVIDERS: ProviderSearch[] = [
  searchBing,
  searchBrave,
  searchDuckDuckGo,
];

/**
 * Keyless web search for serverless (Vercel). Tries Bing, then Brave, then
 * DuckDuckGo so datacenter IPs still get results when one provider blocks.
 */
export async function searchWeb(
  query: string,
  maxResults = 8,
): Promise<WebSearchApiResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { query: "", results: [] };
  }

  for (const provider of KEYLESS_PROVIDERS) {
    try {
      const batch = await provider(trimmed, maxResults);
      if (batch.results.length > 0) {
        return batch;
      }
    } catch {
      // Try the next keyless provider.
    }
  }

  return { query: trimmed, results: [] };
}
