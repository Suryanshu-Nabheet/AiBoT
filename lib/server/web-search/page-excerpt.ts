import "server-only";

import { stripHtml } from "@/lib/server/web-search/common";

const PAGE_TIMEOUT_MS = 8_000;
const MAX_HTML_BYTES = 120_000;
const MAX_EXCERPT_CHARS = 2_200;

const FETCH_HEADERS = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (compatible; AiBoT/1.0; +https://github.com/Suryanshu-Nabheet/AiBoT)",
};

export function isSafePublicHttpUrl(href: string): boolean {
  try {
    const url = new URL(href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".internal")
    ) {
      return false;
    }
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      const parts = host.split(".").map(Number);
      if (parts[0] === 10) return false;
      if (parts[0] === 127) return false;
      if (parts[0] === 192 && parts[1] === 168) return false;
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function metaDescription(html: string): string | undefined {
  const match = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
  );
  if (match?.[1]) return decodeEntities(match[1].trim());
  const og = html.match(
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
  );
  return og?.[1] ? decodeEntities(og[1].trim()) : undefined;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function htmlToReadableText(html: string): string {
  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const articleMatch = withoutNoise.match(/<article[\s\S]*?<\/article>/i);
  const mainMatch = withoutNoise.match(/<main[\s\S]*?<\/main>/i);
  const chunk = articleMatch?.[0] ?? mainMatch?.[0] ?? withoutNoise;

  return stripHtml(chunk);
}

function trimExcerpt(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= MAX_EXCERPT_CHARS) return normalized;
  return `${normalized.slice(0, MAX_EXCERPT_CHARS).trim()}…`;
}

export async function fetchPageExcerpt(
  href: string,
): Promise<string | undefined> {
  if (!isSafePublicHttpUrl(href)) return undefined;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PAGE_TIMEOUT_MS);

  try {
    const response = await fetch(href, {
      headers: FETCH_HEADERS,
      signal: controller.signal,
      cache: "no-store",
      redirect: "follow",
    });

    if (!response.ok) return undefined;

    const reader = response.body?.getReader();
    if (!reader) return undefined;

    let html = "";
    let bytes = 0;
    const decoder = new TextDecoder("utf-8", { fatal: false });

    while (bytes < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      html += decoder.decode(value, { stream: true });
    }
    reader.cancel().catch(() => undefined);

    const meta = metaDescription(html);
    const body = htmlToReadableText(html);
    const combined = [meta, body].filter(Boolean).join(" ");
    if (!combined.trim()) return undefined;
    return trimExcerpt(combined);
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}
