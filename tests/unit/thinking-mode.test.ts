/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { describe, expect, it } from "vitest";
import {
  STAGE1_AND_ANSWER,
  STAGE1_ONLY,
  PLAIN_ASSISTANT,
} from "../fixtures/thinking-content";
import {
  buildChatMessagesForThinkingStage,
  cleanAssistantContent,
  cleanThinkingText,
  normalizeAssistantMessageContent,
  isSubstantiveThinkingContent,
  mergeThinkingAndAnswerForHistory,
  parseLegacyThinkingContent,
  reconcileTwoStageThinking,
  THINKING_CLOSE_TAG,
  THINKING_OPEN_TAG,
  wrapThinkingForContext,
} from "@/lib/chat/thinking-mode";

describe("cleanThinkingText", () => {
  it("returns plain notes unchanged", () => {
    expect(cleanThinkingText("Outline definition and examples.")).toBe(
      "Outline definition and examples.",
    );
  });

  it("unwraps thinking tags", () => {
    expect(cleanThinkingText(wrapThinkingForContext("notes"))).toBe("notes");
  });

  it("removes model safety metadata lines", () => {
    const raw = [
      "Notes about the question.",
      "User Safety: safe",
      "Response Safety: safe",
    ].join("\n");
    expect(cleanThinkingText(raw)).toBe("Notes about the question.");
  });
});

describe("cleanAssistantContent", () => {
  it("strips trailing safety labels from answers", () => {
    expect(
      cleanAssistantContent("Hello!\n\nUser Safety: safe\nResponse Safety: safe"),
    ).toBe("Hello!");
  });
});

describe("normalizeAssistantMessageContent", () => {
  it("returns plain answers unchanged", () => {
    expect(normalizeAssistantMessageContent("Direct answer.")).toBe(
      "Direct answer.",
    );
  });

  it("unwraps thinking tags leaked into a normal reply", () => {
    const raw = `${THINKING_OPEN_TAG}\nnotes\n${THINKING_CLOSE_TAG}\n\nUser-facing answer.`;
    expect(normalizeAssistantMessageContent(raw)).toBe("User-facing answer.");
  });
});

describe("reconcileTwoStageThinking", () => {
  it("uses stage-1 text when stage-2 is empty", () => {
    const result = reconcileTwoStageThinking(
      "Full reply the small model wrote in stage 1 only.",
      "",
    );
    expect(result.thinkingText).toBe("");
    expect(result.content).toContain("stage 1");
  });

  it("keeps both when stage-2 succeeds", () => {
    const result = reconcileTwoStageThinking("Brief notes.", "Final answer.");
    expect(result.thinkingText).toBe("Brief notes.");
    expect(result.content).toBe("Final answer.");
  });
});

describe("parseLegacyThinkingContent", () => {
  it("splits tagged legacy content", () => {
    const parsed = parseLegacyThinkingContent(STAGE1_AND_ANSWER);
    expect(parsed.mainResponse).toContain("What Is Artificial Intelligence?");
    expect(parsed.thinkingContent).toContain("define AI");
  });

  it("returns plain text as main response", () => {
    const parsed = parseLegacyThinkingContent(PLAIN_ASSISTANT);
    expect(parsed.mainResponse).toBe(PLAIN_ASSISTANT);
  });

  it("handles thinking-only block", () => {
    const parsed = parseLegacyThinkingContent(STAGE1_ONLY);
    expect(parsed.thinkingContent.length).toBeGreaterThan(10);
    expect(parsed.mainResponse).toBe("");
  });
});

describe("buildChatMessagesForThinkingStage", () => {
  it("passes user content for thinking stage", () => {
    const msgs = buildChatMessagesForThinkingStage({
      history: [],
      userContent: "Compare A and B",
      stage: "thinking",
    });
    expect(msgs).toHaveLength(1);
    expect(msgs[0].content).toBe("Compare A and B");
  });

  it("injects prior notes for final stage", () => {
    const msgs = buildChatMessagesForThinkingStage({
      history: [],
      userContent: "hi",
      stage: "final",
      priorReasoning: "Short greeting.",
    });
    expect(msgs.some((m) => m.role === "assistant")).toBe(true);
  });
});

describe("mergeThinkingAndAnswerForHistory", () => {
  it("joins notes and answer for model context", () => {
    const merged = mergeThinkingAndAnswerForHistory("notes", "Hello");
    expect(merged).toContain("notes");
    expect(merged).toContain("Hello");
  });
});

describe("isSubstantiveThinkingContent", () => {
  it("accepts real reasoning text", () => {
    expect(isSubstantiveThinkingContent("User wants an overview of AI.")).toBe(
      true,
    );
  });
});
