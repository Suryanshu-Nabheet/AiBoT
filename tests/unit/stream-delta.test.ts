/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { describe, expect, it } from "vitest";
import { ollamaBaseCandidates, probeOllamaTags } from "@/lib/chat/ollama-url";
import { deltaFromOllamaLine, deltaFromSseLine } from "@/lib/chat/stream-delta";

describe("stream-delta", () => {
  it("parses Ollama NDJSON content", () => {
    expect(deltaFromOllamaLine('{"message":{"content":"hi"}}')).toBe("hi");
  });

  it("parses OpenAI SSE deltas", () => {
    expect(
      deltaFromSseLine('data: {"choices":[{"delta":{"content":"yo"}}]}'),
    ).toBe("yo");
  });

  it("lists loopback Ollama URL candidates", () => {
    expect(ollamaBaseCandidates("http://127.0.0.1:11434")).toEqual([
      "http://127.0.0.1:11434",
      "http://localhost:11434",
    ]);
  });

  it("reports probe errors when Ollama is unreachable", async () => {
    const result = await probeOllamaTags("http://127.0.0.1:59999");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  });
});
