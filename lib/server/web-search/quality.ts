import "server-only";

import { isSafePublicHttpUrl } from "@/lib/server/web-search/page-excerpt";
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
  "official",
  "release",
  "released",
  "changes",
  "compare",
  "comparison",
  "differences",
  "updates",
  "update",
  "summarize",
  "summarise",
  "summary",
  "recommend",
  "recommendation",
  "report",
  "sources",
  "citations",
  "is",
  "are",
  "was",
  "were",
  "him",
  "her",
  "them",
  "his",
  "their",
  "me",
  "best",
  "top",
  "near",
  "recommend",
  "recommendation",
  "please",
  "search",
  "web",
  "internet",
  "online",
  "latest",
  "current",
  "currently",
  "recent",
  "today",
  "news",
  "update",
  "updates",
  "information",
  "details",
  "context",
  "find",
  "look",
  "tell",
  "show",
  "give",
  "explain",
  "summarize",
  "summarise",
  "about",
  "online",
  "please",
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
      if (
        domain === "news.google.com" &&
        result.href.includes("/rss/articles/")
      ) {
        return true;
      }
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
    .filter(
      (t) => (t.length > 2 || /^\d{2,}$/.test(t)) && !QUERY_STOPWORDS.has(t),
    )
    .filter((token, index, all) => all.indexOf(token) === index);
}

/** Keep numbered product/framework searches anchored to the requested version. */
function queryVersionMarkers(query: string): string[] {
  const markers: string[] = [];
  const versionedEntity =
    /\b([\p{L}][\p{L}\p{N}]*(?:[.-][\p{L}\p{N}]+)*)\s+v?(\d{1,3}(?:\.\d+){0,2})\b/giu;
  for (const match of query.matchAll(versionedEntity)) {
    const entity = match[1]?.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
    const version = match[2]?.replace(/\.$/, "");
    if (entity && version) markers.push(`${entity}${version}`);
  }
  return markers;
}

function containsQueryVersionMarkers(
  query: string,
  result: WebSearchSource,
): boolean {
  const markers = queryVersionMarkers(query);
  if (markers.length === 0) return true;
  const searchableText = [
    result.title,
    result.snippet ?? "",
    result.pageExcerpt ?? "",
    result.href,
  ]
    .join(" ")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
  return markers.every((marker) => searchableText.includes(marker));
}

function matchesAnyQueryToken(
  tokens: string[],
  title: string,
  snippet: string | undefined,
  domain: string,
): boolean {
  const raw = `${title} ${snippet ?? ""} ${domain}`.toLowerCase();
  const stripped = raw.replace(/[^\p{L}\p{N}]+/gu, "");
  return tokens.some((token) => {
    const cleanToken = token.replace(/[^\p{L}\p{N}]+/gu, "");
    return (
      raw.includes(token) ||
      (cleanToken.length > 0 && stripped.includes(cleanToken))
    );
  });
}

function countTokenHits(tokens: string[], text: string): number {
  return tokens.filter((token) => matchesAnyQueryToken([token], text, "", ""))
    .length;
}

function relevanceScore(query: string, result: WebSearchSource): number {
  const tokens = meaningfulQueryTokens(query);
  if (tokens.length === 0) return 1;

  const title = result.title.toLowerCase();
  const body =
    `${result.snippet ?? ""} ${result.pageExcerpt ?? ""}`.toLowerCase();
  // Keep scoring aligned with the punctuation-tolerant relevance filter
  // (for example, a "Next.js" title should match a "nextjs" query token).
  const titleHits = countTokenHits(tokens, title);
  const bodyHits = countTokenHits(tokens, body);
  const normalizedQuery = query.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  const exactPhrase = [title, body].some((text) =>
    text.replace(/[^\p{L}\p{N}]+/gu, "").includes(normalizedQuery),
  );
  const coverage = (titleHits * 2 + bodyHits) / (tokens.length * 2);
  return coverage + (exactPhrase ? 0.35 : 0);
}

/** Prefer the topic owner's own site when the user explicitly asks for official sources. */
function officialSourceBoost(query: string, result: WebSearchSource): number {
  if (!/\bofficial\b/i.test(query)) return 0;

  const topicTokens = meaningfulQueryTokens(query).filter(
    (token) => /\p{L}/u.test(token) && token.length >= 4,
  );
  const hostLabel = result.domain
    .toLowerCase()
    .split(".")
    .slice(0, -1)
    .join("")
    .replace(/[^\p{L}\p{N}]/gu, "");
  const topicOwnedDomain = topicTokens.some((token) =>
    hostLabel.includes(token.replace(/[^\p{L}\p{N}]/gu, "")),
  );
  const officialLanguage = /\bofficial\b/i.test(result.title);
  const publicInstitution = /\.(?:gov|edu)(?:\.[a-z]{2})?$/i.test(
    result.domain,
  );

  if (topicOwnedDomain) return 0.75;
  if (officialLanguage || publicInstitution) return 0.35;
  return 0;
}

/** Fraction of results whose title/snippet/page text/domain mention query terms. */
export function searchResultRelevanceRatio(
  query: string,
  results: WebSearchSource[],
): number {
  const tokens = meaningfulQueryTokens(query);
  if (tokens.length === 0 || results.length === 0) return 1;

  let matched = 0;
  for (const result of results) {
    if (
      matchesAnyQueryToken(
        tokens,
        result.title,
        `${result.snippet ?? ""} ${result.pageExcerpt ?? ""}`,
        result.domain,
      )
    ) {
      matched += 1;
    }
  }
  return matched / results.length;
}

export function isLowQualitySearchBatch(
  query: string,
  results: WebSearchSource[],
): boolean {
  const clean = sanitizeSearchResults(results).filter((r) =>
    isSafePublicHttpUrl(r.href),
  );
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
  if (tokens.length >= 2 && relevance < 0.25) {
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

  const ranked = results
    .map((result) => ({
      result,
      score: relevanceScore(query, result),
      officialBoost: officialSourceBoost(query, result),
    }))
    .filter(
      ({ result, score }) =>
        containsQueryVersionMarkers(query, result) &&
        matchesAnyQueryToken(
          tokens,
          result.title,
          `${result.snippet ?? ""} ${result.pageExcerpt ?? ""}`,
          result.domain,
        ) &&
        score >= (tokens.length > 3 ? 0.3 : 0.25),
    )
    .sort((a, b) => b.score + b.officialBoost - (a.score + a.officialBoost));
  return ranked.map(({ result }) => result);
}

/** Enforce domain diversity: prevent a single site from dominating search results. */
export function limitResultsPerDomain(
  results: WebSearchSource[],
  maxPerDomain = 2,
): WebSearchSource[] {
  const counts = new Map<string, number>();
  const diverse: WebSearchSource[] = [];
  for (const r of results) {
    const d = r.domain.toLowerCase();
    const count = counts.get(d) ?? 0;
    if (count < maxPerDomain) {
      counts.set(d, count + 1);
      diverse.push(r);
    }
  }
  return diverse;
}

export function finalizeSearchResults(
  query: string,
  results: WebSearchSource[],
  maxResults: number,
): WebSearchSource[] {
  const clean = filterLocaleAlignedResults(
    query,
    sanitizeSearchResults(results).filter((r) => isSafePublicHttpUrl(r.href)),
  );
  const tokenAligned = filterResultsMissingQueryTokens(query, clean);
  const diverse = limitResultsPerDomain(tokenAligned, 2);
  const newsFiltered = filterIrrelevantNewsHomepages(diverse, query).slice(
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
