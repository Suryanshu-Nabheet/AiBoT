/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

type LocalNetworkRequestInit = RequestInit & {
  targetAddressSpace?: "local" | "private" | "public";
};

export function normalizeOllamaUrl(raw: string | undefined): string {
  let targetUrl = (raw ?? "").trim();
  if (!targetUrl) {
    targetUrl = "http://localhost:11434";
  }
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = `http://${targetUrl}`;
  }
  return targetUrl.replace(/\/$/, "");
}

/** localhost ↔ 127.0.0.1 — browsers treat them differently on HTTPS. */
export function ollamaBaseCandidates(preferredRaw: string): string[] {
  const preferred = normalizeOllamaUrl(preferredRaw);
  const out: string[] = [preferred];
  try {
    const host = new URL(preferred).hostname;
    if (host === "localhost") {
      out.push(preferred.replace(/localhost/i, "127.0.0.1"));
    } else if (host === "127.0.0.1") {
      out.push(preferred.replace("127.0.0.1", "localhost"));
    }
  } catch {
    /* ignore */
  }
  const seen = new Set<string>();
  return out.filter((u) => {
    const key = u.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Browser fetch to the user's machine (HTTPS may need local address space). */
export function fetchOllama(
  url: string,
  init?: RequestInit,
  useLocalAddressSpace = true,
): Promise<Response> {
  const requestInit: LocalNetworkRequestInit = {
    ...init,
    mode: init?.mode ?? "cors",
    cache: init?.cache ?? "no-store",
  };
  if (
    useLocalAddressSpace &&
    typeof window !== "undefined" &&
    window.isSecureContext
  ) {
    requestInit.targetAddressSpace = "local";
  }
  return fetch(url, requestInit);
}

export type OllamaTagsProbeResult =
  | { ok: true; models: unknown[]; resolvedBase: string }
  | { ok: false; error: string };

export async function probeOllamaTags(
  preferredBase: string,
): Promise<OllamaTagsProbeResult> {
  const errors: string[] = [];
  const secure = typeof window !== "undefined" && window.isSecureContext;
  const localModes = secure ? [true, false] : [false];

  for (const base of ollamaBaseCandidates(preferredBase)) {
    for (const useLocal of localModes) {
      const label = `${base}${useLocal ? " (local)" : ""}`;
      try {
        const res = await fetchOllama(
          `${base}/api/tags`,
          { method: "GET" },
          useLocal,
        );
        if (!res.ok) {
          errors.push(`${label}: HTTP ${res.status}`);
          continue;
        }
        const data = await res.json();
        const models = Array.isArray(data?.models) ? data.models : [];
        return { ok: true, models, resolvedBase: base };
      } catch (err) {
        errors.push(
          `${label}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  return {
    ok: false,
    error:
      errors.length > 0
        ? errors.join(" · ")
        : "Could not reach Ollama on this device.",
  };
}

/** @deprecated Use probeOllamaTags */
export async function fetchOllamaTags(
  preferredBase: string,
): Promise<{ models: unknown[]; resolvedBase: string } | null> {
  const result = await probeOllamaTags(preferredBase);
  if (!result.ok) return null;
  return { models: result.models, resolvedBase: result.resolvedBase };
}

export async function postOllamaChat(
  preferredBase: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<Response> {
  const secure = typeof window !== "undefined" && window.isSecureContext;
  const localModes = secure ? [true, false] : [false];

  let lastError: unknown;
  let lastResponse: Response | null = null;

  for (const base of ollamaBaseCandidates(preferredBase)) {
    for (const useLocal of localModes) {
      try {
        const res = await fetchOllama(
          `${base}/api/chat`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal,
          },
          useLocal,
        );
        if (res.ok) return res;
        lastResponse = res;
      } catch (err) {
        lastError = err;
      }
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError ?? new Error("Ollama unreachable");
}
