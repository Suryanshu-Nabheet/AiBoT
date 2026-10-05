import "server-only";

import { brandFromDomain, domainFromUrl } from "@/lib/web-search/brand";
import type { WebSearchSource } from "@/lib/web-search/types";

export const FETCH_TIMEOUT_MS = 14_000;

export const BROWSER_HEADERS = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

/** Decode numeric and named HTML entities (Bing/Brave SERPs often ship &#214; in titles). */
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

export function stripHtml(text: string): string {
  return decodeHtmlEntities(
    text
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

export function pushUniqueResult(
  results: WebSearchSource[],
  seen: Set<string>,
  candidate: WebSearchSource,
  maxResults: number,
) {
  if (results.length >= maxResults) return;
  const key = candidate.href.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  results.push(candidate);
}

export function sourceFromHref(
  href: string,
  title: string,
  snippet?: string,
): WebSearchSource {
  const domain = domainFromUrl(href);
  return {
    title: decodeHtmlEntities(stripHtml(title)),
    href,
    domain,
    brand: brandFromDomain(domain),
    snippet: snippet ? decodeHtmlEntities(stripHtml(snippet)) : undefined,
  };
}

export function isDuckDuckGoBlockedHtml(html: string): boolean {
  return (
    html.includes("anomaly-modal") ||
    /bots use DuckDuckGo/i.test(html) ||
    html.includes("challenge-form")
  );
}
