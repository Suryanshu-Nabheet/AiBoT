import "server-only";

import type { WebSearchApiResult } from "@/lib/web-search/types";

const PROVIDER_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 120;
const MAX_ATTEMPTS = 2;
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 60_000;

type ProviderOutcome =
  | "results"
  | "empty"
  | "timeout"
  | "error"
  | "aborted"
  | "circuit_open";

type ProviderHealth = {
  consecutiveFailures: number;
  openUntil: number;
};

export type ProviderObservation = {
  provider: string;
  outcome: ProviderOutcome;
  durationMs: number;
  attempts: number;
  resultCount: number;
  circuitOpenForMs?: number;
};

export type ResilientProviderResult = {
  batch: WebSearchApiResult;
  observation: ProviderObservation;
};

const providerHealth = new Map<string, ProviderHealth>();

function getHealth(name: string): ProviderHealth {
  return providerHealth.get(name) ?? { consecutiveFailures: 0, openUntil: 0 };
}

function recordFailure(name: string, now: number): ProviderHealth {
  const previous = getHealth(name);
  const consecutiveFailures = previous.consecutiveFailures + 1;
  const state = {
    consecutiveFailures,
    openUntil:
      consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD
        ? now + CIRCUIT_COOLDOWN_MS
        : 0,
  };
  providerHealth.set(name, state);
  return state;
}

export async function runProviderWithResilience(
  providerName: string,
  query: string,
  maxResults: number,
  search: (
    query: string,
    maxResults: number,
    signal: AbortSignal,
  ) => Promise<WebSearchApiResult>,
  externalSignal?: AbortSignal,
): Promise<ResilientProviderResult> {
  const startedAt = Date.now();
  const currentHealth = getHealth(providerName);
  if (currentHealth.openUntil > startedAt) {
    return {
      batch: { query, results: [] },
      observation: {
        provider: providerName,
        outcome: "circuit_open",
        durationMs: 0,
        attempts: 0,
        resultCount: 0,
        circuitOpenForMs: currentHealth.openUntil - startedAt,
      },
    };
  }

  if (currentHealth.openUntil > 0) {
    providerHealth.set(providerName, { consecutiveFailures: 0, openUntil: 0 });
  }

  const providerController = new AbortController();
  const signal = externalSignal
    ? AbortSignal.any([externalSignal, providerController.signal])
    : providerController.signal;
  let attempts = 0;
  let finalOutcome: ProviderOutcome = "error";
  let batch: WebSearchApiResult = { query, results: [] };

  try {
    while (attempts < MAX_ATTEMPTS) {
      if (externalSignal?.aborted) {
        finalOutcome = "aborted";
        break;
      }

      const elapsed = Date.now() - startedAt;
      const remaining = PROVIDER_TIMEOUT_MS - elapsed;
      if (remaining <= 0) {
        finalOutcome = "timeout";
        providerController.abort();
        break;
      }

      attempts += 1;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const result = await Promise.race([
        Promise.resolve()
          .then(() => search(query, maxResults, signal))
          .then(
            (value) => ({ kind: "result" as const, value }),
            () => ({ kind: "error" as const }),
          ),
        new Promise<{ kind: "timeout" }>((resolve) => {
          timer = setTimeout(() => {
            providerController.abort();
            resolve({ kind: "timeout" });
          }, remaining);
        }),
      ]);
      if (timer) clearTimeout(timer);

      if (externalSignal?.aborted) {
        finalOutcome = "aborted";
        break;
      }

      if (result.kind === "result") {
        if (!result.value || !Array.isArray(result.value.results)) {
          finalOutcome = "error";
        } else {
          batch = { query, results: result.value.results };
          finalOutcome = batch.results.length > 0 ? "results" : "empty";
          providerHealth.set(providerName, {
            consecutiveFailures: 0,
            openUntil: 0,
          });
          break;
        }
      } else if (result.kind === "timeout") {
        finalOutcome = "timeout";
        break;
      } else {
        finalOutcome = "error";
      }

      if (
        finalOutcome !== "error" ||
        attempts >= MAX_ATTEMPTS ||
        Date.now() - startedAt + RETRY_DELAY_MS >= PROVIDER_TIMEOUT_MS
      ) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  } finally {
    if (!providerController.signal.aborted && finalOutcome !== "aborted") {
      providerController.abort();
    }
  }

  if (finalOutcome === "timeout" || finalOutcome === "error") {
    recordFailure(providerName, Date.now());
  }

  return {
    batch,
    observation: {
      provider: providerName,
      outcome: externalSignal?.aborted ? "aborted" : finalOutcome,
      durationMs: Date.now() - startedAt,
      attempts,
      resultCount: batch.results.length,
    },
  };
}

export function resetProviderHealthForTests(): void {
  providerHealth.clear();
}
