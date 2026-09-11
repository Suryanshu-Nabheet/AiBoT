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
  buildChatMessagesForThinkingStage,
  isSubstantiveThinkingContent,
  normalizeThinkingStage1Output,
  parseAssistantThinkingContent,
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
    expect(parsed.thinkingContent).toContain("Plan:");
    expect(parsed.mainResponse).toContain("What Is Artificial Intelligence?");
  });

  it("hides answer panel during thinking-only stream", () => {
    const parsed = parseAssistantThinkingContent(STAGE1_ONLY, {
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

  it("truncates content after closing tag", () => {
    const raw = `${THINKING_OPEN_TAG}trace${THINKING_CLOSE_TAG}\nLeaked answer`;
    const out = normalizeThinkingStage1Output(raw);
    expect(out).not.toContain("Leaked answer");
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
  it("adds combined suffix for arena single-stream thinking", () => {
    const msgs = buildChatMessagesForThinkingStage({
      history: [],
      userContent: "Compare A and B",
      stage: "combined",
    });
    expect(msgs).toHaveLength(1);
    expect(msgs[0].content).toContain("Compare A and B");
    expect(msgs[0].content).toContain(THINKING_OPEN_TAG);
    expect(msgs[0].content).toContain("final answer");
  });
});

describe("plain assistant messages", () => {
  it("does not false-positive thinking tags", () => {
    const parsed = parseAssistantThinkingContent(PLAIN_ASSISTANT);
    expect(parsed.hasThinkingTag).toBe(false);
    expect(parsed.mainResponse).toBe(PLAIN_ASSISTANT);
  });
});
