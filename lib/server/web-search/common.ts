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

export function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
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
    title,
    href,
    domain,
    brand: brandFromDomain(domain),
    snippet,
  };
}

export function isDuckDuckGoBlockedHtml(html: string): boolean {
  return (
    html.includes("anomaly-modal") ||
    /bots use DuckDuckGo/i.test(html) ||
    html.includes("challenge-form")
  );
}
