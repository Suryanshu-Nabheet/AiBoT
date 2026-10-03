import "server-only";

import type { WebSearchSource } from "@/lib/web-search/types";

const GENERIC_NEWS_DOMAINS = [
  "foxnews.com",
  "cnn.com",
  "bbc.com",
  "bbc.co.uk",
  "apnews.com",
  "ndtv.com",
  "reuters.com",
];

const GENERIC_NEWS_TITLE =
  /\b(breaking news|latest news|today'?s news|news updates?)\b/i;

/** Drop homepage-style news hits when the user did not ask for news. */
export function filterIrrelevantNewsHomepages(
  results: WebSearchSource[],
  query: string,
): WebSearchSource[] {
  if (/\bnews\b/i.test(query)) return results;

  const filtered = results.filter((result) => {
    const domain = result.domain.toLowerCase();
    const onNewsDomain = GENERIC_NEWS_DOMAINS.some((d) => domain.includes(d));
    if (!onNewsDomain) return true;
    return !GENERIC_NEWS_TITLE.test(result.title);
  });

  return filtered.length > 0 ? filtered : results;
}
