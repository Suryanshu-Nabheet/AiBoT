import { describe, expect, it } from "vitest";
import { getOllamaGenerationControls } from "@/lib/chat/ollama-generation-controls";

describe("getOllamaGenerationControls", () => {
  it("keeps the planning summary bounded and fast", () => {
    expect(getOllamaGenerationControls("thinking")).toEqual({
      think: false,
      options: { num_ctx: 8_192, num_predict: 512 },
    });
  });

  it("uses native reasoning for the final answer with a bounded token budget", () => {
    expect(getOllamaGenerationControls("final")).toEqual({
      think: true,
      options: { num_ctx: 8_192, num_predict: 4_096 },
    });
  });

  it("keeps Ollama's normal response on the fast path when Thinking is off", () => {
    expect(getOllamaGenerationControls(null)).toEqual({
      think: false,
      options: { num_ctx: 8_192, num_predict: 4_096 },
    });
  });
});
