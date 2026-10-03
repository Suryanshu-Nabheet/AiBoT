import "server-only";

import { fetchPageExcerpt } from "@/lib/server/web-search/page-excerpt";
import type { WebSearchSource } from "@/lib/web-search/types";

const DEFAULT_MAX_PAGES = 4;

export async function enrichSourcesWithPageExcerpts(
  sources: WebSearchSource[],
  options?: { maxPages?: number },
): Promise<WebSearchSource[]> {
  const maxPages = options?.maxPages ?? DEFAULT_MAX_PAGES;
  const targets = sources.slice(0, maxPages);

  const excerpts = await Promise.all(
    targets.map((source) => fetchPageExcerpt(source.href)),
  );

  return sources.map((source, index) => {
    if (index >= maxPages) return source;
    const pageExcerpt = excerpts[index];
    if (!pageExcerpt) return source;
    return { ...source, pageExcerpt };
  });
}
