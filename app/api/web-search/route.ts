import { NextRequest, NextResponse } from "next/server";
import { searchDuckDuckGo } from "@/lib/server/web-search/duckduckgo";
import { protectApiRequest } from "@/lib/server/request-security";
import { webSearchRequestSchema } from "@/lib/server/request-schemas";

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

  for (const query of parsed.data.queries) {
    try {
      batches.push(await searchDuckDuckGo(query, maxResults));
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

  return NextResponse.json({ batches });
}
