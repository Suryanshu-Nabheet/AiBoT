import { formatWebSearchContextForModel } from "@/lib/web-search/context";
import { planWebSearchQueries } from "@/lib/web-search/query";
import {
  evaluateWebSearchIntent,
  type HistoryMessage,
} from "@/lib/web-search/intent";
import { buildWebSearchTraceFromResults } from "@/lib/web-search/trace";
import type {
  WebSearchApiResult,
  WebSearchTrace,
} from "@/lib/web-search/types";

export type WebSearchTurnResult = {
  trace: WebSearchTrace;
  context: string;
  batches: WebSearchApiResult[];
  skipped?: boolean;
  reason?: string;
};

export async function runWebSearchForTurn(
  userQuery: string,
  options?: {
    signal?: AbortSignal;
    locale?: "en" | "hi";
    conversationHistory?: HistoryMessage[];
    recentUserMessages?: string[];
    force?: boolean;
    queriesOverride?: string[];
  },
): Promise<WebSearchTurnResult> {
  let targetQueries: string[] = options?.queriesOverride ?? [];

  if (targetQueries.length === 0) {
    const intent = evaluateWebSearchIntent(userQuery, {
      conversationHistory: options?.conversationHistory,
      recentUserMessages: options?.recentUserMessages,
      force: options?.force,
    });

    if (!intent.shouldSearch) {
      return {
        skipped: true,
        reason: intent.reason,
        batches: [],
        trace: buildWebSearchTraceFromResults([], "complete"),
        context: "",
      };
    }

    targetQueries =
      intent.queries.length > 0
        ? intent.queries
        : planWebSearchQueries(
            userQuery,
            options?.conversationHistory ?? options?.recentUserMessages ?? [],
          );
  }

  if (targetQueries.length === 0) {
    return {
      batches: [],
      trace: buildWebSearchTraceFromResults([], "complete"),
      context: "",
    };
  }

  const response = await fetch("/api/web-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ queries: targetQueries, maxResults: 8 }),
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
    context: formatWebSearchContextForModel(batches, options?.locale ?? "en"),
  };
}
