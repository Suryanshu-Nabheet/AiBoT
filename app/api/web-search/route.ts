import { NextRequest, NextResponse } from "next/server";
import { enrichSourcesWithPageExcerpts } from "@/lib/server/web-search/enrich";
import { searchWeb } from "@/lib/server/web-search/search";
import { protectApiRequest } from "@/lib/server/request-security";
import { webSearchRequestSchema } from "@/lib/server/request-schemas";
import { mergeWebSearchBatches } from "@/lib/web-search/merge";
import type {
  WebSearchApiResult,
  WebSearchSource,
} from "@/lib/web-search/types";

function applyEnrichedSources(
  batches: WebSearchApiResult[],
  enriched: WebSearchSource[],
): WebSearchApiResult[] {
  const byHref = new Map(
    enriched.map((source) => [source.href.toLowerCase(), source]),
  );
  return batches.map((batch) => ({
    ...batch,
    results: batch.results.map(
      (source) => byHref.get(source.href.toLowerCase()) ?? source,
    ),
  }));
}

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const blocked = protectApiRequest(req, {
    scope: "web-search",
    limit: 30,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = webSearchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid web search request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const maxResults = parsed.data.maxResults ?? 6;
  const batches: WebSearchApiResult[] = [];

  for (const query of parsed.data.queries) {
    try {
      batches.push(await searchWeb(query, maxResults));
    } catch {
      batches.push({ query, results: [] });
    }
  }

  if (batches.every((batch) => batch.results.length === 0)) {
    return NextResponse.json(
      { message: "Web search failed", batches },
      { status: 502 },
    );
  }

  const merged = mergeWebSearchBatches(batches, 10);
  const enriched = await enrichSourcesWithPageExcerpts(merged, { maxPages: 4 });
  const enrichedBatches = applyEnrichedSources(batches, enriched);

  return NextResponse.json({ batches: enrichedBatches });
}
