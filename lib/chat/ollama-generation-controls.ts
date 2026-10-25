import type { ThinkingStage } from "@/lib/chat/thinking-mode";

/**
 * Ollama may default thinking-capable models to native reasoning. AiBoT's
 * planning stage only needs a concise progress summary; native reasoning is
 * reserved for the final stage so its result can directly shape the answer.
 */
export function getOllamaGenerationControls(stage: ThinkingStage | null) {
  if (stage === "thinking") {
    return {
      think: false,
      options: { num_ctx: 8_192, num_predict: 512 },
    };
  }

  return {
    think: stage === "final",
    options: { num_ctx: 8_192, num_predict: 4_096 },
  };
}
