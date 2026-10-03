import { formatWebSearchContextForModel } from "@/lib/web-search/context";
import { planWebSearchQueries } from "@/lib/web-search/query";
import { buildWebSearchTraceFromResults } from "@/lib/web-search/trace";
import type {
  WebSearchApiResult,
  WebSearchTrace,
} from "@/lib/web-search/types";

export type WebSearchTurnResult = {
  trace: WebSearchTrace;
  context: string;
  batches: WebSearchApiResult[];
};

export async function runWebSearchForTurn(
  userQuery: string,
  options?: { signal?: AbortSignal; locale?: "en" | "hi" },
): Promise<WebSearchTurnResult> {
  const queries = planWebSearchQueries(userQuery);
  const response = await fetch("/api/web-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ queries, maxResults: 6 }),
    signal: options?.signal,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(payload.message ?? "Web search failed");
  }

  const data = (await response.json()) as { batches: WebSearchApiResult[] };
  const batches = data.batches ?? [];

  return {
    batches,
    trace: buildWebSearchTraceFromResults(batches, "complete"),
    context: formatWebSearchContextForModel(batches, {
      locale: options?.locale ?? "en",
      userQuestion: userQuery,
    }),
  };
}
