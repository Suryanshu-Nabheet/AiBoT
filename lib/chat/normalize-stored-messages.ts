import { Role, type Message } from "@/lib/types";
import type { WebSearchTrace } from "@/lib/web-search/types";

function normalizeRole(role: unknown): Role | null {
  if (role === Role.User || role === "user") return Role.User;
  if (role === Role.Assistant || role === "assistant") return Role.Assistant;
  return null;
}

export function normalizeWebSearchTrace(
  trace: unknown,
): WebSearchTrace | undefined {
  if (!trace || typeof trace !== "object") return undefined;

  const raw = trace as Partial<WebSearchTrace>;
  const steps = Array.isArray(raw.steps) ? raw.steps : [];
  if (!steps.length) return undefined;

  let status = raw.status;
  if (status !== "complete" && status !== "error" && status !== "running") {
    status = "complete";
  }

  if (status === "running") {
    const normalizedSteps = steps.map((step) => {
      if (!step || typeof step !== "object") return step;
      if (step.kind === "summary") {
        return {
          ...step,
          label:
            step.label === "Searching the web…"
              ? "Web search (stopped)"
              : step.label,
          meta: step.meta === "In progress" ? undefined : step.meta,
        };
      }
      if (step.kind === "query" && step.meta === "In progress") {
        return { ...step, meta: undefined };
      }
      return step;
    });

    return {
      ...raw,
      status: "complete",
      steps: normalizedSteps.length ? normalizedSteps : steps,
      queriedAt: raw.queriedAt ?? new Date().toISOString(),
    };
  }

  const stepsNormalized = steps.map((step) => {
    if (!step || typeof step !== "object" || step.kind !== "query") return step;
    if (
      step.label === "Searched the web for" ||
      step.label === "Query"
    ) {
      return { ...step, brand: undefined };
    }
    return step;
  });

  return {
    status: status as WebSearchTrace["status"],
    steps: stepsNormalized,
    queriedAt: raw.queriedAt,
    errorMessage: raw.errorMessage,
  };
}

function isEmptyAssistant(message: Message): boolean {
  if (message.role !== Role.Assistant) return false;
  if (message.isError) return false;
  const hasContent = Boolean(message.content?.trim());
  const hasThinking = Boolean(message.thinkingText?.trim());
  const hasTrace = Boolean(message.webSearchTrace);
  return !hasContent && !hasThinking && !hasTrace;
}

export function normalizeStoredMessages(messages: unknown[]): Message[] {
  if (!Array.isArray(messages)) return [];

  const out: Message[] = [];

  for (const item of messages) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Message;
    const role = normalizeRole(raw.role);
    if (!role) continue;

    const content =
      typeof raw.content === "string" ? raw.content : String(raw.content ?? "");

    const message: Message = {
      ...raw,
      role,
      content,
      shouldAnimate: false,
      webSearchTrace: normalizeWebSearchTrace(raw.webSearchTrace),
    };

    if (isEmptyAssistant(message)) continue;
    out.push(message);
  }

  return out;
}
