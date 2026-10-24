import "server-only";

import { fetchPageExcerpt } from "@/lib/server/web-search/page-excerpt";
import type { WebSearchSource } from "@/lib/web-search/types";

const DEFAULT_MAX_PAGES = 4;
const EXCERPT_DEADLINE_MS = 5_000;

async function fetchExcerptWithDeadline(
  href: string,
  signal?: AbortSignal,
): Promise<string | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fetchPageExcerpt(href, signal),
      new Promise<undefined>((resolve) => {
        timer = setTimeout(() => resolve(undefined), EXCERPT_DEADLINE_MS);
      }),
    ]);
  } catch {
    return undefined;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function enrichSourcesWithPageExcerpts(
  sources: WebSearchSource[],
  options?: { maxPages?: number; signal?: AbortSignal },
): Promise<WebSearchSource[]> {
  const maxPages = options?.maxPages ?? DEFAULT_MAX_PAGES;
  const targets = sources.slice(0, maxPages);

  const excerpts = await Promise.all(
    targets.map((source) =>
      fetchExcerptWithDeadline(source.href, options?.signal),
    ),
  );

  return sources.map((source, index) => {
    if (index >= maxPages) return source;
    const pageExcerpt = excerpts[index];
    if (!pageExcerpt) return source;
    return { ...source, pageExcerpt };
  });
}
