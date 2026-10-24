import { NextRequest, NextResponse } from "next/server";
import { searchWeb } from "@/lib/server/web-search/search";
import { protectApiRequest } from "@/lib/server/request-security";
import { webSearchRequestSchema } from "@/lib/server/request-schemas";
import {
  evaluateWebSearchIntent,
  normalizeSearchQuery,
} from "@/lib/web-search/intent";
import type { WebSearchApiResult } from "@/lib/web-search/types";

export const maxDuration = 30;
const SEARCH_QUERY_DEADLINE_MS = 24_000;

async function searchWithDeadline(
  query: string,
  maxResults: number,
  externalSignal: AbortSignal,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadlineController = new AbortController();
  const signal = AbortSignal.any([externalSignal, deadlineController.signal]);
  try {
    return await Promise.race([
      searchWeb(query, maxResults, { enrichPageExcerpts: true, signal }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          deadlineController.abort();
          reject(new Error("Search query deadline exceeded"));
        }, SEARCH_QUERY_DEADLINE_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

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

  const maxResults = Math.min(parsed.data.maxResults ?? 8, 8);
  const batches: WebSearchApiResult[] = [];

  let targetQueries: string[] = [];

  if ("queries" in parsed.data) {
    targetQueries = parsed.data.queries;
  } else {
    const intent = evaluateWebSearchIntent(parsed.data.query, {
      recentUserMessages: parsed.data.recentUserMessages,
      force: parsed.data.force,
    });

    if (!intent.shouldSearch) {
      return NextResponse.json({
        batches: [],
        skipped: true,
        reason: intent.reason,
      });
    }

    targetQueries = intent.queries;
  }

  targetQueries = Array.from(
    new Set(targetQueries.map(normalizeSearchQuery).filter(Boolean)),
  ).slice(0, 2);

  if (targetQueries.length === 0) {
    return NextResponse.json({
      batches: [],
      skipped: true,
      reason: "no_searchable_topic",
    });
  }

  const settledBatches = await Promise.all(
    targetQueries.map(async (query) => {
      try {
        return await searchWithDeadline(query, maxResults, req.signal);
      } catch {
        return { query, results: [] };
      }
    }),
  );
  batches.push(...settledBatches);

  return NextResponse.json({ batches });
}
