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
  assembleThinkingAndAnswer,
  buildChatMessagesForThinkingStage,
  extractThinkingInner,
  isSubstantiveThinkingContent,
  looksLikeMetaProcessThinking,
  normalizeThinkingStage1Output,
  parseLegacyThinkingContent,
  polishThinkingDisplayContent,
  stripPromptLeakage,
  THINKING_CLOSE_TAG,
  THINKING_OPEN_TAG,
  wrapThinkingInner,
} from "@/lib/chat/thinking-mode";

describe("parseLegacyThinkingContent", () => {
  it("splits tagged legacy content", () => {
    const parsed = parseLegacyThinkingContent(STAGE1_AND_ANSWER);
    expect(parsed.mainResponse).toContain("What Is Artificial Intelligence?");
    expect(parsed.thinkingContent).toContain("define AI");
  });

  it("returns plain text as main response", () => {
    const parsed = parseLegacyThinkingContent(PLAIN_ASSISTANT);
    expect(parsed.mainResponse).toBe(PLAIN_ASSISTANT);
    expect(parsed.thinkingContent).toBe("");
  });

  it("handles thinking-only legacy block", () => {
    const parsed = parseLegacyThinkingContent(STAGE1_ONLY);
    expect(parsed.thinkingContent.length).toBeGreaterThan(10);
    expect(parsed.mainResponse).toBe("");
  });
});

describe("normalizeThinkingStage1Output", () => {
  it("wraps plain reasoning", () => {
    const out = normalizeThinkingStage1Output(
      "Outline definition then examples.",
    );
    expect(out).toContain(THINKING_OPEN_TAG);
    expect(extractThinkingInner(out)).toContain("Outline");
  });

  it("uses user hint when empty", () => {
    const out = normalizeThinkingStage1Output("", { userMessageHint: "hi" });
    expect(extractThinkingInner(out)).toContain("About: hi");
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

  it("injects prior reasoning for final stage", () => {
    const prior = wrapThinkingInner("notes");
    const msgs = buildChatMessagesForThinkingStage({
      history: [],
      userContent: "hi",
      stage: "final",
      priorReasoning: prior,
    });
    expect(msgs.some((m) => m.role === "assistant")).toBe(true);
    expect(msgs[msgs.length - 1].role).toBe("user");
  });
});

describe("polishThinkingDisplayContent", () => {
  it("replaces meta process monologue", () => {
    const meta =
      "Okay, I need to understand what the user wants me to do. Then I'll process and respond.";
    expect(looksLikeMetaProcessThinking(meta)).toBe(true);
    expect(polishThinkingDisplayContent(meta, { userMessageHint: "hi" })).toBe(
      "About: hi",
    );
  });
});

describe("assembleThinkingAndAnswer", () => {
  it("joins wrapped thinking and answer", () => {
    const think = wrapThinkingInner("note");
    expect(assembleThinkingAndAnswer(think, "Hello")).toBe(`${think}\n\nHello`);
  });
});

describe("isSubstantiveThinkingContent", () => {
  it("accepts real reasoning text", () => {
    expect(isSubstantiveThinkingContent("User wants an overview of AI.")).toBe(
      true,
    );
  });
});

describe("stripPromptLeakage", () => {
  it("removes nuclear lock style leakage", () => {
    const cleaned = stripPromptLeakage(
      "NUCLEAR REASONING LOCK\nReal content here.",
    );
    expect(cleaned).not.toContain("NUCLEAR");
    expect(cleaned).toContain("Real content");
  });
});
