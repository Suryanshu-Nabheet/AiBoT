import "server-only";

import {
  FETCH_TIMEOUT_MS,
  pushUniqueResult,
  stripHtml,
  decodeHtmlEntities,
} from "@/lib/server/web-search/common";
import { brandFromDomain, domainFromUrl } from "@/lib/web-search/brand";
import type {
  WebSearchApiResult,
  WebSearchSource,
} from "@/lib/web-search/types";

const GOOGLE_NEWS_RSS = "https://news.google.com/rss/search";

const GOOGLE_NEWS_HEADERS = {
  Accept: "application/rss+xml, application/xml, text/xml, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

function hasDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

/**
 * Parses Google News RSS XML feed into WebSearchSource items.
 * Public, keyless, and reliable from datacenter/Vercel serverless IPs.
 */
export function parseGoogleNewsRss(
  xml: string,
  maxResults: number,
): WebSearchSource[] {
  const results: WebSearchSource[] = [];
  const seen = new Set<string>();

  const items = xml.split(/<item\b[^>]*>/i).slice(1);

  for (const item of items) {
    if (results.length >= maxResults) break;

    const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/i);
    const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/i);
    const descMatch = item.match(/<description>([\s\S]*?)<\/description>/i);
    const sourceMatch = item.match(
      /<source\s+url="([^"]+)"[^>]*>([\s\S]*?)<\/source>/i,
    );

    let rawTitle = titleMatch ? titleMatch[1] : "";
    const sourceName = sourceMatch ? sourceMatch[2].trim() : "";

    // Strip trailing " - Publisher Name" if present
    if (sourceName && rawTitle.endsWith(` - ${sourceName}`)) {
      rawTitle = rawTitle.slice(0, -(sourceName.length + 3)).trim();
    }

    const title = decodeHtmlEntities(stripHtml(rawTitle));
    if (!title) continue;

    const href = linkMatch ? linkMatch[1].trim() : "";
    if (!href || !href.startsWith("http")) continue;

    // Use publisher website URL for domain if available, otherwise fallback to link
    const publisherUrl = sourceMatch ? sourceMatch[1].trim() : href;
    const domain = domainFromUrl(publisherUrl);

    let snippet: string | undefined;
    if (descMatch) {
      const cleanDesc = stripHtml(decodeHtmlEntities(descMatch[1]));
      if (cleanDesc && cleanDesc !== title) {
        snippet = cleanDesc;
      }
    }

    const source: WebSearchSource = {
      title,
      href,
      domain,
      brand: brandFromDomain(domain),
      snippet,
    };

    pushUniqueResult(results, seen, source, maxResults);
  }

  return results;
}

export async function searchGoogleNews(
  query: string,
  maxResults = 8,
  externalSignal?: AbortSignal,
): Promise<WebSearchApiResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { query: "", results: [] };
  }

  const isHindi = hasDevanagari(trimmed);
  const params = isHindi
    ? {
        q: trimmed,
        hl: "hi",
        gl: "IN",
        ceid: "IN:hi",
      }
    : {
        q: trimmed,
        hl: "en-US",
        gl: "US",
        ceid: "US:en",
      };

  const controller = new AbortController();
  const signal = externalSignal
    ? AbortSignal.any([controller.signal, externalSignal])
    : controller.signal;
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const url = `${GOOGLE_NEWS_RSS}?${new URLSearchParams(params)}`;
    const response = await fetch(url, {
      headers: GOOGLE_NEWS_HEADERS,
      signal,
      cache: "no-store",
    });

    if (!response.ok) {
      return { query: trimmed, results: [] };
    }

    const xml = await response.text();
    const results = parseGoogleNewsRss(xml, maxResults);
    return { query: trimmed, results };
  } catch {
    return { query: trimmed, results: [] };
  } finally {
    clearTimeout(timeout);
  }
}
