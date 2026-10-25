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
    body: JSON.stringify({
      query: userQuery,
      recentUserMessages: options?.recentUserMessages,
      force: options?.force,
      maxResults: 8,
    }),
    signal: options?.signal,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(payload.message ?? "Web search failed");
  }

  const data = (await response.json()) as {
    batches?: WebSearchApiResult[];
    skipped?: boolean;
    reason?: string;
  };
  const batches = data.batches ?? [];
  if (data.skipped) {
    return {
      skipped: true,
      reason: data.reason,
      batches,
      trace: buildWebSearchTraceFromResults([], "complete"),
      context: "",
    };
  }
  const errors = batches.filter((batch) => batch.status === "error");
  const usable = batches.filter((batch) => batch.status !== "error");
  const status =
    errors.length === batches.length && batches.length > 0
      ? "error"
      : errors.length > 0 || batches.some((batch) => batch.status === "partial")
        ? "partial"
        : "complete";
  const errorMessage =
    status === "error"
      ? (errors[0]?.errorMessage ?? "Web search providers are unavailable.")
      : status === "partial"
        ? "Some search providers were unavailable."
        : undefined;

  return {
    batches,
    trace: buildWebSearchTraceFromResults(batches, status, errorMessage),
    context:
      status === "error"
        ? `[WEB SEARCH FAILED — ${errorMessage} Do not fabricate current facts or imply that sources were found. Be transparent about the search failure.]`
        : `${formatWebSearchContextForModel(usable, options?.locale ?? "en")}${status === "partial" ? `\n\n[WEB SEARCH NOTICE — ${errorMessage} Treat available sources as incomplete and mention this limitation when it affects the answer.]` : ""}`,
  };
}
