import "server-only";

import type { WebSearchSource } from "@/lib/web-search/types";

const SEARCH_ENGINE_DOMAINS = [
  "bing.com",
  "microsoft.com",
  "duckduckgo.com",
  "brave.com",
  "google.com",
  "yandex.com",
];

const DICTIONARY_NOISE =
  /dictionary|merriam-webster|cambridge\.org|definitions?\.net|meaning of|vocabulary\.com/i;

const TRANSLATION_NOISE =
  /translate\.(com|google)|google\.[a-z.]+\/translate|\/translate\b/i;

const QUERY_STOPWORDS = new Set([
  "who",
  "what",
  "when",
  "where",
  "why",
  "how",
  "the",
  "and",
  "for",
  "about",
  "with",
  "from",
  "that",
  "this",
  "your",
  "more",
  "info",
  "information",
  "details",
  "give",
  "tell",
  "latest",
  "news",
  "is",
  "are",
  "was",
  "were",
  "him",
  "her",
  "them",
  "his",
  "their",
]);

function isLikelyEnglishQuery(query: string): boolean {
  const q = query.trim();
  return q.length > 0 && /^[\x20-\x7E]+$/.test(q) && /[a-z]/i.test(q);
}

function isLikelyForeignLanguageTitle(title: string): boolean {
  const letters = title.match(/\p{L}/gu) ?? [];
  if (letters.length < 6) return false;
  const nonLatin = letters.filter((ch) => !/\p{Script=Latin}/u.test(ch)).length;
  const latinExtended = letters.filter((ch) => {
    const cp = ch.codePointAt(0) ?? 0;
    return cp > 0x024f && cp < 0x1e00;
  }).length;
  return (nonLatin + latinExtended) / letters.length > 0.12;
}

/** Drop search-engine redirect URLs and other non-destination links. */
export function sanitizeSearchResults(
  results: WebSearchSource[],
): WebSearchSource[] {
  return results.filter((result) => {
    const domain = result.domain.toLowerCase();
    if (
      SEARCH_ENGINE_DOMAINS.some(
        (d) => domain === d || domain.endsWith(`.${d}`),
      )
    ) {
      return false;
    }
    if (/bing\.com|duckduckgo\.com|search\.brave\.com/i.test(result.href)) {
      return false;
    }
    if (
      TRANSLATION_NOISE.test(result.href) ||
      TRANSLATION_NOISE.test(result.domain)
    ) {
      return false;
    }
    if (/^translate\b/i.test(result.title)) {
      return false;
    }
    return true;
  });
}

export function filterLocaleAlignedResults(
  query: string,
  results: WebSearchSource[],
): WebSearchSource[] {
  if (!isLikelyEnglishQuery(query)) return results;
  const aligned = results.filter((r) => !isLikelyForeignLanguageTitle(r.title));
  return aligned.length > 0 ? aligned : results;
}

function meaningfulQueryTokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !QUERY_STOPWORDS.has(t));
}

/** Fraction of results whose title/snippet/domain mention at least one query token. */
export function searchResultRelevanceRatio(
  query: string,
  results: WebSearchSource[],
): number {
  const tokens = meaningfulQueryTokens(query);
  if (tokens.length === 0 || results.length === 0) return 1;

  let matched = 0;
  for (const result of results) {
    const blob =
      `${result.title} ${result.snippet ?? ""} ${result.domain}`.toLowerCase();
    if (tokens.some((token) => blob.includes(token))) matched += 1;
  }
  return matched / results.length;
}

export function isLowQualitySearchBatch(
  query: string,
  results: WebSearchSource[],
): boolean {
  const clean = sanitizeSearchResults(results);
  if (clean.length === 0) return true;

  const dictHits = clean.filter((r) =>
    DICTIONARY_NOISE.test(`${r.title} ${r.domain}`),
  );
  if (dictHits.length >= Math.ceil(clean.length * 0.5)) return true;

  const tokens = meaningfulQueryTokens(query);
  const relevance = searchResultRelevanceRatio(query, clean);
  if (tokens.length === 1 && relevance === 0) {
    return true;
  }
  if (tokens.length >= 2 && relevance < 0.2) {
    return true;
  }

  return false;
}

function filterResultsMissingQueryTokens(
  query: string,
  results: WebSearchSource[],
): WebSearchSource[] {
  const tokens = meaningfulQueryTokens(query);
  if (tokens.length === 0) return results;

  const matched = results.filter((result) => {
    const blob =
      `${result.title} ${result.snippet ?? ""} ${result.domain}`.toLowerCase();
    return tokens.some((token) => blob.includes(token));
  });

  return matched.length > 0 ? matched : results;
}

export function finalizeSearchResults(
  query: string,
  results: WebSearchSource[],
  maxResults: number,
): WebSearchSource[] {
  const clean = filterLocaleAlignedResults(
    query,
    sanitizeSearchResults(results),
  );
  const tokenAligned = filterResultsMissingQueryTokens(query, clean);
  const newsFiltered = filterIrrelevantNewsHomepages(tokenAligned, query).slice(
    0,
    maxResults,
  );
  if (isLowQualitySearchBatch(query, newsFiltered)) return [];
  return newsFiltered;
}

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
