import { NextRequest, NextResponse } from "next/server";
import { searchWeb } from "@/lib/server/web-search/search";
import { protectApiRequest } from "@/lib/server/request-security";
import { webSearchRequestSchema } from "@/lib/server/request-schemas";
import { evaluateWebSearchIntent } from "@/lib/web-search/intent";

export const maxDuration = 30;

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

  const maxResults = parsed.data.maxResults ?? 8;
  const batches = [];

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

  for (const query of targetQueries) {
    try {
      batches.push(await searchWeb(query, maxResults));
    } catch {
      batches.push({ query, results: [] });
    }
  }

  return NextResponse.json({ batches });
}
