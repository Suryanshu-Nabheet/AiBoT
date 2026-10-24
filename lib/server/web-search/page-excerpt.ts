import "server-only";

import type { LookupAddress } from "node:dns";
import { lookup } from "node:dns/promises";
import { request as httpRequest, type RequestOptions } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { stripHtml } from "@/lib/server/web-search/common";

const PAGE_TIMEOUT_MS = 8_000;
const DNS_TIMEOUT_MS = 1_500;
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
    if (url.username || url.password) return false;
    if (url.port && url.port !== "80" && url.port !== "443") return false;
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host.endsWith(".internal")
    ) {
      return false;
    }
    return isIP(host) ? isPublicAddress(host) : true;
  } catch {
    return false;
  }
}

function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 0 || b === 168)) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)
    );
  }

  // Only allow globally routable unicast IPv6 (2000::/3). This deliberately
  // excludes mapped IPv4, unique-local, link-local, multicast and special-use.
  const normalized = address.toLowerCase();
  return (
    /^[23][0-9a-f]{3}:/i.test(normalized) && !normalized.startsWith("2001:db8:")
  );
}

async function resolvePublicAddresses(
  hostname: string,
  signal: AbortSignal,
): Promise<LookupAddress[] | null> {
  const literalFamily = isIP(hostname);
  if (literalFamily) {
    return isPublicAddress(hostname)
      ? [{ address: hostname, family: literalFamily }]
      : null;
  }
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  try {
    const addresses = await Promise.race([
      lookup(hostname, { all: true, verbatim: true }),
      new Promise<never>((_, reject) => {
        const rejectLookup = () => reject(new Error("DNS lookup timed out"));
        onAbort = rejectLookup;
        timeout = setTimeout(rejectLookup, DNS_TIMEOUT_MS);
        signal.addEventListener("abort", rejectLookup, { once: true });
      }),
    ]);
    return addresses.length > 0 &&
      addresses.every(({ address }) => isPublicAddress(address))
      ? addresses
      : null;
  } catch {
    return null;
  } finally {
    if (timeout) clearTimeout(timeout);
    if (onAbort) signal.removeEventListener("abort", onAbort);
  }
}

function pinnedLookup(
  addresses: LookupAddress[],
): NonNullable<RequestOptions["lookup"]> {
  return (hostname, options, callback) => {
    const requestedFamily =
      typeof options === "object" && options !== null
        ? options.family
        : typeof options === "number"
          ? options
          : 0;
    const candidates = requestedFamily
      ? addresses.filter((entry) => entry.family === requestedFamily)
      : addresses;

    if (typeof options === "object" && options !== null && options.all) {
      callback(null, candidates);
      return;
    }

    const address = candidates[0] ?? addresses[0];
    if (!address) {
      callback(new Error(`No validated address for ${hostname}`), "", 0);
      return;
    }
    callback(null, address.address, address.family);
  };
}

type PageResponse = {
  status: number;
  headers: import("node:http").IncomingHttpHeaders;
  body: string;
};

function requestPublicPage(
  url: URL,
  addresses: LookupAddress[],
  signal: AbortSignal,
): Promise<PageResponse> {
  return new Promise((resolve, reject) => {
    const requester = url.protocol === "https:" ? httpsRequest : httpRequest;
    const request = requester(
      url,
      {
        method: "GET",
        headers: FETCH_HEADERS,
        lookup: pinnedLookup(addresses),
        signal,
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const contentLength = Number(response.headers["content-length"]);
        const contentType = String(
          response.headers["content-type"] ?? "",
        ).toLowerCase();
        if (
          (Number.isFinite(contentLength) && contentLength > MAX_HTML_BYTES) ||
          (contentType &&
            !contentType.includes("text/html") &&
            !contentType.includes("text/plain") &&
            !contentType.includes("application/xhtml+xml")) ||
          (status >= 300 && status < 400)
        ) {
          response.destroy();
          resolve({ status, headers: response.headers, body: "" });
          return;
        }

        const chunks: Buffer[] = [];
        let bytes = 0;
        response.on("data", (chunk: Buffer | string) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          const remaining = MAX_HTML_BYTES - bytes;
          const bounded = buffer.subarray(0, remaining);
          chunks.push(bounded);
          bytes += bounded.byteLength;
          if (
            bounded.byteLength < buffer.byteLength ||
            bytes >= MAX_HTML_BYTES
          ) {
            response.destroy();
          }
        });
        response.on("end", () =>
          resolve({
            status,
            headers: response.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
        response.on("error", (error) => {
          // A size-limited response is intentionally destroyed after a prefix.
          if (bytes >= MAX_HTML_BYTES) {
            resolve({
              status,
              headers: response.headers,
              body: Buffer.concat(chunks).toString("utf8"),
            });
          } else {
            reject(error);
          }
        });
      },
    );
    request.setTimeout(PAGE_TIMEOUT_MS, () =>
      request.destroy(new Error("Source page request timed out")),
    );
    request.on("error", reject);
    request.end();
  });
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
  externalSignal?: AbortSignal,
): Promise<string | undefined> {
  if (!isSafePublicHttpUrl(href)) return undefined;
  if (externalSignal?.aborted) return undefined;

  const controller = new AbortController();
  const signal = externalSignal
    ? AbortSignal.any([controller.signal, externalSignal])
    : controller.signal;
  const timeout = setTimeout(() => controller.abort(), PAGE_TIMEOUT_MS);

  try {
    let currentUrl = new URL(href);
    let response: PageResponse | undefined;

    for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
      if (!isSafePublicHttpUrl(currentUrl.toString())) return undefined;
      const addresses = await resolvePublicAddresses(
        currentUrl.hostname.replace(/^\[|\]$/g, ""),
        signal,
      );
      if (!addresses) return undefined;

      const pageResponse = await requestPublicPage(
        currentUrl,
        addresses,
        signal,
      );
      if (pageResponse.status < 300 || pageResponse.status >= 400) {
        response = pageResponse;
        break;
      }
      const location = pageResponse.headers.location;
      if (!location || redirectCount === 3) return undefined;
      currentUrl = new URL(location, currentUrl);
    }

    if (!response || response.status < 200 || response.status >= 300) {
      return undefined;
    }
    const html = response.body;

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
