/**
 * Browser / server fetch helpers for Ollama HTTP API.
 */

type LocalNetworkRequestInit = RequestInit & {
  targetAddressSpace?: "local" | "private" | "public";
};

export function ollamaFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const requestInit: LocalNetworkRequestInit = {
    ...init,
    cache: init?.cache ?? "no-store",
  };

  if (typeof window !== "undefined" && window.isSecureContext) {
    requestInit.targetAddressSpace = "local";
  }

  return fetch(url, requestInit);
}
