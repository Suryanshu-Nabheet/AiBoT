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
  STAGE1_PLACEHOLDER,
  PLAIN_ASSISTANT,
} from "../fixtures/thinking-content";
import {
  assembleThinkingAndAnswer,
  buildChatMessagesForThinkingStage,
  isSubstantiveThinkingContent,
  looksLikeMetaProcessThinking,
  normalizeThinkingStage1Output,
  parseAssistantThinkingContent,
  polishThinkingDisplayContent,
  repairSwappedThinkingAnswer,
  stripPromptLeakage,
  THINKING_CLOSE_TAG,
  THINKING_OPEN_TAG,
} from "@/lib/chat/thinking-mode";

describe("parseAssistantThinkingContent", () => {
  it("returns user content unchanged", () => {
    const parsed = parseAssistantThinkingContent("hi", { isUser: true });
    expect(parsed.mainResponse).toBe("hi");
    expect(parsed.hasThinkingTag).toBe(false);
  });

  it("splits stage-1 + final answer", () => {
    const parsed = parseAssistantThinkingContent(STAGE1_AND_ANSWER);
    expect(parsed.hasThinkingTag).toBe(true);
    expect(parsed.hasClosingThinkingTag).toBe(true);
    expect(parsed.thinkingContent).toContain("define AI");
    expect(parsed.mainResponse).toContain("What Is Artificial Intelligence?");
  });

  it("hides answer panel during in-progress thinking stream", () => {
    const inProgress = `${THINKING_OPEN_TAG}\nStill reasoning…`;
    const parsed = parseAssistantThinkingContent(inProgress, {
      isThinkingRequested: true,
    });
    expect(parsed.hideAnswerPanel).toBe(true);
    expect(parsed.mainResponse).toBe("");
  });

  it("shows answer when stage-2 content exists", () => {
    const parsed = parseAssistantThinkingContent(STAGE1_AND_ANSWER, {
      isThinkingRequested: true,
    });
    expect(parsed.hideAnswerPanel).toBe(false);
    expect(parsed.mainResponse.length).toBeGreaterThan(20);
  });

  it("shows plain reply when model ignores thinking tags", () => {
    const parsed = parseAssistantThinkingContent(
      "Hello! How can I help you today?",
      { isThinkingRequested: true },
    );
    expect(parsed.hideAnswerPanel).toBe(false);
    expect(parsed.mainResponse).toContain("Hello");
  });

  it("repairs misplaced greeting in thinking block", () => {
    const raw = `${THINKING_OPEN_TAG}Hello! How can I help you today?${THINKING_CLOSE_TAG}The AiBoT platform is a powerful tool that harnesses advanced AI technology.`;
    const parsed = parseAssistantThinkingContent(raw, {
      isThinkingRequested: true,
    });
    expect(parsed.mainResponse).toContain("Hello!");
    expect(parsed.mainResponse).not.toContain("powerful tool");
  });
});

describe("repairSwappedThinkingAnswer", () => {
  it("swaps boilerplate main with conversational thinking", () => {
    const out = repairSwappedThinkingAnswer({
      thinkingContent: "Hi there! What would you like to know?",
      mainResponse:
        "The AiBoT platform is a versatile tool designed to leverage advanced AI.",
      hasClosingThinkingTag: true,
    });
    expect(out.mainResponse).toContain("Hi there");
  });
});

describe("isSubstantiveThinkingContent", () => {
  it("rejects placeholder ellipsis traces", () => {
    const parsed = parseAssistantThinkingContent(STAGE1_PLACEHOLDER);
    expect(isSubstantiveThinkingContent(parsed.thinkingContent)).toBe(false);
  });

  it("accepts real reasoning text", () => {
    const parsed = parseAssistantThinkingContent(STAGE1_AND_ANSWER);
    expect(isSubstantiveThinkingContent(parsed.thinkingContent)).toBe(true);
  });
});

describe("normalizeThinkingStage1Output", () => {
  it("wraps raw text in thinking tags", () => {
    const out = normalizeThinkingStage1Output("Reason step by step.");
    expect(out).toContain(THINKING_OPEN_TAG);
    expect(out).toContain(THINKING_CLOSE_TAG);
  });

  it("uses user hint when stage 1 is empty", () => {
    const out = normalizeThinkingStage1Output("", { userMessageHint: "hi" });
    expect(out).toContain("About: hi");
  });

  it("truncates content after closing tag", () => {
    const raw = `${THINKING_OPEN_TAG}trace${THINKING_CLOSE_TAG}\nLeaked answer`;
    const out = normalizeThinkingStage1Output(raw);
    expect(out).not.toContain("Leaked answer");
  });
});

describe("assembleThinkingAndAnswer", () => {
  it("leaves room after thinking for streamed answer", () => {
    const think = `${THINKING_OPEN_TAG}\nnote\n${THINKING_CLOSE_TAG}`;
    expect(assembleThinkingAndAnswer(think, "")).toBe(`${think}\n\n`);
    expect(assembleThinkingAndAnswer(think, "Hello")).toBe(`${think}\n\nHello`);
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

describe("buildChatMessagesForThinkingStage", () => {
  it("passes user content unchanged (no reasoning suffix)", () => {
    const msgs = buildChatMessagesForThinkingStage({
      history: [],
      userContent: "Compare A and B",
      stage: "combined",
    });
    expect(msgs).toHaveLength(1);
    expect(msgs[0].content).toBe("Compare A and B");
  });
});

describe("polishThinkingDisplayContent", () => {
  it("replaces meta process monologue with topic hint", () => {
    const meta =
      "Okay, I need to understand what the user wants me to do. Then I'll process and respond to their request.";
    expect(looksLikeMetaProcessThinking(meta)).toBe(true);
    const polished = polishThinkingDisplayContent(meta, {
      userMessageHint: "hi",
    });
    expect(polished).toBe("About: hi");
    expect(polished).not.toContain("private reasoning");
  });
});

describe("plain assistant messages", () => {
  it("does not false-positive thinking tags", () => {
    const parsed = parseAssistantThinkingContent(PLAIN_ASSISTANT);
    expect(parsed.hasThinkingTag).toBe(false);
    expect(parsed.mainResponse).toBe(PLAIN_ASSISTANT);
  });
});
