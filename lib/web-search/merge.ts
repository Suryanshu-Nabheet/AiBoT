import type {
  WebSearchApiResult,
  WebSearchSource,
} from "@/lib/web-search/types";

/** Merge multiple search batches, dedupe by URL, keep strongest snippets first. */
export function mergeWebSearchBatches(
  batches: WebSearchApiResult[],
  maxTotal = 10,
): WebSearchSource[] {
  const byHref = new Map<string, WebSearchSource>();

  for (const batch of batches) {
    for (const result of batch.results) {
      const key = result.href.toLowerCase();
      const existing = byHref.get(key);
      if (!existing) {
        byHref.set(key, { ...result });
        continue;
      }
      const mergedSnippet = pickLongerText(existing.snippet, result.snippet);
      const mergedExcerpt = pickLongerText(
        existing.pageExcerpt,
        result.pageExcerpt,
      );
      byHref.set(key, {
        ...existing,
        title:
          existing.title.length >= result.title.length
            ? existing.title
            : result.title,
        snippet: mergedSnippet,
        pageExcerpt: mergedExcerpt,
      });
    }
  }

  const ranked = [...byHref.values()].sort(
    (a, b) => scoreSource(b) - scoreSource(a),
  );
  return ranked.slice(0, maxTotal);
}

function pickLongerText(a?: string, b?: string): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return a.length >= b.length ? a : b;
}

function scoreSource(source: WebSearchSource): number {
  let score = 0;
  if (source.pageExcerpt)
    score += 100 + Math.min(source.pageExcerpt.length, 500);
  if (source.snippet) score += 20 + Math.min(source.snippet.length, 200);
  if (source.brand !== "generic") score += 5;
  return score;
}
