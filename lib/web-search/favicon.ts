/** Upstream favicon resolver (server / API route). */
export function faviconUpstreamUrl(domain: string, size = 64): string {
  const host = domain.replace(/^https?:\/\//, "").split("/")[0] ?? domain;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`;
}

/** Same-origin URL safe under COEP (proxied via /api/favicon). */
export function faviconUrlForDomain(domain: string, size = 64): string {
  const host = domain.replace(/^https?:\/\//, "").split("/")[0] ?? domain;
  return `/api/favicon?d=${encodeURIComponent(host)}&sz=${size}`;
}
