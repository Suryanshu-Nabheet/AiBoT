import "server-only";

import {
  BROWSER_HEADERS,
  FETCH_TIMEOUT_MS,
  isDuckDuckGoBlockedHtml,
  pushUniqueResult,
  sourceFromHref,
  stripHtml,
} from "@/lib/server/web-search/common";
import type {
  WebSearchApiResult,
  WebSearchSource,
} from "@/lib/web-search/types";

const DDG_HTML = "https://html.duckduckgo.com/html/";
const DDG_INSTANT = "https://api.duckduckgo.com/";

const DDG_HEADERS = {
  ...BROWSER_HEADERS,
  "Content-Type": "application/x-www-form-urlencoded",
  Referer: "https://duckduckgo.com/",
  Origin: "https://duckduckgo.com",
};

function decodeDuckDuckGoRedirect(href: string): string {
  const normalized = href.startsWith("//") ? `https:${href}` : href;
  try {
    const url = new URL(normalized);
    if (url.hostname.includes("duckduckgo.com")) {
      const uddg = url.searchParams.get("uddg");
      if (uddg) return decodeURIComponent(uddg);
    }
    return normalized;
  } catch {
    return href;
  }
}

/** Parse DuckDuckGo HTML results (keyless). Tolerates varying attribute order. */
export function parseDuckDuckGoHtml(
  html: string,
  maxResults: number,
): WebSearchSource[] {
  const results: WebSearchSource[] = [];
  const seen = new Set<string>();

  const linkRegex =
    /<a\b[^>]*class="[^"]*\bresult__a\b[^"]*"[^>]*>[\s\S]*?<\/a>/gi;

  let match: RegExpExecArray | null;
  while (
    (match = linkRegex.exec(html)) !== null &&
    results.length < maxResults
  ) {
    const tag = match[0];
    const hrefMatch = tag.match(/\bhref="([^"]+)"/i);
    if (!hrefMatch) continue;

    const href = decodeDuckDuckGoRedirect(hrefMatch[1]);
    const inner = tag.replace(/^<a\b[^>]*>/i, "").replace(/<\/a>$/i, "");
    const title = stripHtml(inner);
    if (!title || !href.startsWith("http")) continue;

    const tail = html.slice(match.index, match.index + 1400);
    const snippetMatch = tail.match(
      /class="[^"]*\bresult__snippet\b[^"]*"[^>]*>([\s\S]*?)<\//i,
    );
    const snippet = snippetMatch ? stripHtml(snippetMatch[1]) : undefined;

    pushUniqueResult(
      results,
      seen,
      sourceFromHref(href, title, snippet),
      maxResults,
    );
  }

  return results;
}

type InstantTopic = {
  FirstURL?: string;
  Text?: string;
  Topics?: InstantTopic[];
};

function flattenInstantTopics(topics: InstantTopic[]): InstantTopic[] {
  const flat: InstantTopic[] = [];
  for (const topic of topics) {
    if (topic.FirstURL && topic.Text) flat.push(topic);
    if (topic.Topics?.length) flat.push(...flattenInstantTopics(topic.Topics));
  }
  return flat;
}

/** Keyless JSON fallback when HTML is empty or blocked. */
export async function searchDuckDuckGoInstant(
  query: string,
  maxResults: number,
  signal?: AbortSignal,
): Promise<WebSearchSource[]> {
  const url = `${DDG_INSTANT}?${new URLSearchParams({
    q: query,
    format: "json",
    no_redirect: "1",
    no_html: "1",
    skip_disambig: "1",
  })}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": BROWSER_HEADERS["User-Agent"],
    },
    signal,
    cache: "no-store",
  });

  if (!response.ok) return [];

  const data = (await response.json()) as {
    AbstractURL?: string;
    AbstractText?: string;
    Heading?: string;
    RelatedTopics?: InstantTopic[];
  };

  const results: WebSearchSource[] = [];
  const seen = new Set<string>();

  if (data.AbstractURL && data.AbstractText) {
    pushUniqueResult(
      results,
      seen,
      sourceFromHref(
        data.AbstractURL,
        data.Heading || data.AbstractText.slice(0, 80),
        data.AbstractText,
      ),
      maxResults,
    );
  }

  const related = flattenInstantTopics(data.RelatedTopics ?? []);
  for (const topic of related) {
    if (!topic.FirstURL || !topic.Text) continue;
    const href = topic.FirstURL;
    const title = topic.Text.split(" - ")[0]?.trim() || topic.Text;
    const snippet = topic.Text;
    pushUniqueResult(
      results,
      seen,
      sourceFromHref(href, title, snippet),
      maxResults,
    );
  }

  return results;
}

export async function searchDuckDuckGo(
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
    const response = await fetch(DDG_HTML, {
      method: "POST",
      headers: DDG_HEADERS,
      body: new URLSearchParams({ q: trimmed, b: "", kl: "us-en" }),
      signal: controller.signal,
      cache: "no-store",
    });

    let results: WebSearchSource[] = [];

    if (response.ok) {
      const html = await response.text();
      if (!isDuckDuckGoBlockedHtml(html)) {
        results = parseDuckDuckGoHtml(html, maxResults);
      }
    }

    if (results.length === 0) {
      const instant = await searchDuckDuckGoInstant(
        trimmed,
        maxResults,
        controller.signal,
      );
      results = instant.slice(0, maxResults);
    }

    return { query: trimmed, results };
  } finally {
    clearTimeout(timeout);
  }
}
