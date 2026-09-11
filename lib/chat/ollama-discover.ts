/**
 * Browser-side Ollama model discovery (settings + local LLM).
 * HTTPS deployments require OLLAMA_ORIGINS on the user's machine; we also use
 * Private Network Access hints and loopback fallbacks where supported.
 */

import { ollamaFetch } from "@/lib/chat/ollama-fetch";
import { normalizeOllamaUrl } from "@/lib/chat/ollama-url";

export type OllamaDiscoveredModel = {
  name: string;
  size?: number;
  details?: { parameter_size?: string };
};

export type OllamaDiscoverResult =
  | { ok: true; models: OllamaDiscoveredModel[]; resolvedUrl: string }
  | { ok: false; error: "network" | "empty" | "invalid" };

function parseHostPort(baseUrl: string): { host: string; port: string } {
  try {
    const u = new URL(baseUrl);
    return {
      host: u.hostname,
      port: u.port || "11434",
    };
  } catch {
    return { host: "localhost", port: "11434" };
  }
}

/** Unique candidate base URLs to try (order matters on HTTPS). */
export function buildOllamaScanCandidates(preferredRaw: string): string[] {
  const preferred = normalizeOllamaUrl(preferredRaw);
  const { host, port } = parseHostPort(preferred);
  const withPort = (h: string) => `http://${h}:${port}`;

  const ordered: string[] = [];

  if (typeof window !== "undefined" && window.isSecureContext) {
    ordered.push(withPort("127.0.0.1"), withPort("localhost"));
  }

  ordered.push(preferred);

  if (host === "localhost") {
    ordered.push(withPort("127.0.0.1"));
  } else if (host === "127.0.0.1") {
    ordered.push(withPort("localhost"));
  }

  const seen = new Set<string>();
  return ordered.filter((url) => {
    const key = url.replace(/\/$/, "").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isLocalAppOrigin(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

async function fetchTagsDirect(baseUrl: string): Promise<Response> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/tags`;
  return ollamaFetch(url, { method: "GET", mode: "cors" });
}

async function fetchTagsViaAppProxy(baseUrl: string): Promise<Response | null> {
  if (!isLocalAppOrigin()) return null;
  const q = encodeURIComponent(baseUrl);
  return fetch(`/api/ollama/tags?base=${q}`, { cache: "no-store" });
}

function normalizeModels(payload: unknown): OllamaDiscoveredModel[] {
  if (!payload || typeof payload !== "object") return [];
  const models = (payload as { models?: unknown }).models;
  if (!Array.isArray(models)) return [];
  return models.filter(
    (m): m is OllamaDiscoveredModel =>
      Boolean(m) &&
      typeof m === "object" &&
      typeof (m as OllamaDiscoveredModel).name === "string",
  );
}

/**
 * Discover models from a user's Ollama instance (runs in the browser).
 */
export async function discoverOllamaModels(
  preferredUrl: string,
): Promise<OllamaDiscoverResult> {
  const candidates = buildOllamaScanCandidates(preferredUrl);

  const proxyRes = await fetchTagsViaAppProxy(
    normalizeOllamaUrl(preferredUrl),
  ).catch(() => null);
  if (proxyRes?.ok) {
    const data = await proxyRes.json().catch(() => null);
    const models = normalizeModels(data);
    if (models.length > 0) {
      return {
        ok: true,
        models,
        resolvedUrl: normalizeOllamaUrl(preferredUrl),
      };
    }
  }

  let lastError: unknown;
  for (const base of candidates) {
    try {
      const res = await fetchTagsDirect(base);
      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      const models = normalizeModels(data);
      if (models.length === 0) {
        return { ok: false, error: "empty" };
      }
      return { ok: true, models, resolvedUrl: base };
    } catch (err) {
      lastError = err;
    }
  }

  console.warn("Ollama discovery failed for all candidates", lastError);
  return { ok: false, error: "network" };
}
