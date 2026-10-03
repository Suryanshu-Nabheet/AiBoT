import type { WebSearchBrand } from "@/lib/web-search/types";

export function domainFromUrl(href: string): string {
  try {
    const host = new URL(href).hostname.replace(/^www\./, "");
    return host;
  } catch {
    return href;
  }
}

export function brandFromDomain(domain: string): WebSearchBrand {
  const d = domain.toLowerCase();
  if (d.includes("reddit.com")) return "reddit";
  if (d === "x.com" || d.includes("twitter.com")) return "x";
  if (d.includes("github.com")) return "github";
  if (d.includes("youtube.com") || d === "youtu.be") return "youtube";
  if (d.includes("wikipedia.org")) return "wikipedia";
  if (d.includes("stackoverflow.com") || d.includes("stackexchange.com")) {
    return "stackoverflow";
  }
  return "generic";
}
