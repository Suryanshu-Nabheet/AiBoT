import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resetProviderHealthForTests,
  runProviderWithResilience,
} from "@/lib/server/web-search/provider-resilience";

describe("web-search provider resilience", () => {
  afterEach(() => {
    vi.useRealTimers();
    resetProviderHealthForTests();
  });

  it("retries transient failures and resets the provider circuit after success", async () => {
    vi.useFakeTimers();
    let attempts = 0;
    const search = vi.fn(async (query: string) => {
      attempts += 1;
      if (attempts === 1) throw new Error("transient");
      return { query, results: [] };
    });

    const pending = runProviderWithResilience("fixture", "query", 5, search);
    await vi.advanceTimersByTimeAsync(120);
    const result = await pending;

    expect(result.observation).toMatchObject({ outcome: "empty", attempts: 2 });
    expect(search).toHaveBeenCalledTimes(2);
  });

  it("opens after three failed searches and skips provider calls during cooldown", async () => {
    vi.useFakeTimers();
    const search = vi.fn(async () => {
      throw new Error("provider unavailable");
    });

    for (let index = 0; index < 3; index += 1) {
      const pending = runProviderWithResilience("fixture", "query", 5, search);
      await vi.advanceTimersByTimeAsync(120);
      await pending;
    }

    const result = await runProviderWithResilience(
      "fixture",
      "query",
      5,
      search,
    );
    expect(result.observation.outcome).toBe("circuit_open");
    expect(result.observation.attempts).toBe(0);
    expect(search).toHaveBeenCalledTimes(6);
  });

  it("stops waiting immediately when the shared search budget is aborted", async () => {
    const controller = new AbortController();
    const pending = runProviderWithResilience(
      "slow-fixture",
      "query",
      5,
      () => new Promise(() => {}),
      controller.signal,
    );

    controller.abort();
    const result = await pending;

    expect(result.observation).toMatchObject({
      outcome: "aborted",
      attempts: 1,
      resultCount: 0,
    });
  });
});
