import "server-only";

import type {
  WebSearchApiResult,
  WebSearchSource,
} from "@/lib/web-search/types";
import {
  BROWSER_HEADERS,
  FETCH_TIMEOUT_MS,
  pushUniqueResult,
  sourceFromHref,
  stripHtml,
} from "@/lib/server/web-search/common";

const BING_SEARCH = "https://www.bing.com/search";

/** Decode Bing redirect URLs (`/ck/a?...&u=a1<base64>`). */
export function decodeBingRedirect(href: string): string {
  try {
    const url = new URL(href, "https://www.bing.com");
    const encoded = url.searchParams.get("u");
    if (encoded?.startsWith("a1")) {
      const decoded = Buffer.from(encoded.slice(2), "base64").toString("utf8");
      if (decoded.startsWith("http")) return decoded;
    }
    if (url.hostname.includes("bing.com") && encoded) {
      const decoded = Buffer.from(encoded, "base64").toString("utf8");
      if (decoded.startsWith("http")) return decoded;
    }
    return href;
  } catch {
    return href;
  }
}

/** Parse Bing HTML SERP (keyless; reliable from serverless/datacenter IPs). */
export function parseBingSearchHtml(
  html: string,
  maxResults: number,
): WebSearchSource[] {
  const results: WebSearchSource[] = [];
  const seen = new Set<string>();

  const blocks = html.split(/<li class="b_algo"/i).slice(1);
  for (const block of blocks) {
    if (results.length >= maxResults) break;

    const titleMatch = block.match(
      /<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h2>/i,
    );
    if (!titleMatch) continue;

    const href = decodeBingRedirect(titleMatch[1]);
    const title = stripHtml(titleMatch[2]);
    if (!title || !href.startsWith("http")) continue;
    if (href.includes("bing.com/ck/") && !titleMatch[1].includes("u="))
      continue;

    const snippetMatch = block.match(
      /<div class="b_caption"[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>/i,
    );
    const snippet = snippetMatch ? stripHtml(snippetMatch[1]) : undefined;

    pushUniqueResult(
      results,
      seen,
      sourceFromHref(href, title, snippet || undefined),
      maxResults,
    );
  }

  return results;
}

export async function searchBing(
  query: string,
  maxResults = 8,
): Promise<WebSearchApiResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { query: "", results: [] };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const url = `${BING_SEARCH}?${new URLSearchParams({
      q: trimmed,
      setlang: "en-us",
    })}`;
    const response = await fetch(url, {
      headers: {
        ...BROWSER_HEADERS,
        Referer: "https://www.bing.com/",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      return { query: trimmed, results: [] };
    }

    const html = await response.text();
    const results = parseBingSearchHtml(html, maxResults);
    return { query: trimmed, results };
  } finally {
    clearTimeout(timeout);
  }
}
