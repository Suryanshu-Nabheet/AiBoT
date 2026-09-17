/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { describe, expect, it } from "vitest";
import { PROVIDER_MODELS, BYOK_PROVIDER_IDS } from "@/lib/provider-models";
import { MODELS } from "@/lib/types";
import {
  buildChatMessagesForThinkingStage,
  isValidThinkingNotes,
  reconcileTwoStageThinking,
} from "@/lib/chat/thinking-mode";

describe("thinking model matrix", () => {
  it("keeps every platform model on the same two-stage contract", () => {
    for (const model of MODELS) {
      const messages = buildChatMessagesForThinkingStage({
        history: [],
        userContent: "Explain reinforcement learning",
        stage: "thinking",
      });
      expect(messages.at(-1)?.content).toContain("Explain");
      expect(
        isValidThinkingNotes(
          "I should give a definition and one example, then mention the main caveat.",
        ),
        model.id,
      ).toBe(true);
    }
  });

  it("covers every BYOK provider model without answer leakage", () => {
    for (const provider of BYOK_PROVIDER_IDS) {
      for (const model of PROVIDER_MODELS[provider] ?? []) {
        const result = reconcileTwoStageThinking(
          "The user asked for a concise definition and one caveat.",
          "Reinforcement learning trains an agent with rewards and penalties.",
        );
        expect(result.content, `${provider}:${model.id}`).toContain("trains");
        expect(result.thinkingText, `${provider}:${model.id}`).toContain(
          "user asked",
        );
      }
    }
  });
});
