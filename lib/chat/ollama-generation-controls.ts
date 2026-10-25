import type { ThinkingStage } from "@/lib/chat/thinking-mode";

/**
 * AiBoT runs a separate planning request before the final answer when
 * Thinking is enabled. Disable Ollama's second native reasoning pass in the
 * final request so the model does not spend its answer budget thinking twice.
 */
export function getOllamaGenerationControls(stage: ThinkingStage | null) {
  if (stage === "thinking") {
    return {
      think: false,
      options: { num_ctx: 8_192, num_predict: 512 },
    };
  }

  return {
    think: false,
    options: { num_ctx: 8_192, num_predict: 4_096 },
  };
}
