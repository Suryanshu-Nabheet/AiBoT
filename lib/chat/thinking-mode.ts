/**
 * Thinking mode is implemented as a two-stage generation to make it robust across
 * providers:
 *  1) thinking-only: model must emit <thinking>...</thinking> and nothing else
 *  2) final-only: model must emit the final answer and must not include thinking tags
 */

export type ThinkingStage = "thinking" | "final";

export function getThinkingModeUserSuffix(stage: ThinkingStage): string {
  if (stage === "thinking") {
    return [
      "",
      "IMPORTANT: This is STAGE 1 (thinking-only).",
      "Your response MUST contain ONLY the reasoning section in the form:",
      "<thinking>...</thinking>",
      "You MUST NOT output any final answer text outside of </thinking>.",
    ].join("\n");
  }

  return [
    "",
    "IMPORTANT: This is STAGE 2 (final-only).",
    "Your response MUST NOT include any <thinking>...</thinking> or related tags.",
    "Output ONLY the final answer to the user.",
  ].join("\n");
}
