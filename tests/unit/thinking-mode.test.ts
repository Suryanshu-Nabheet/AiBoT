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
  looksLikeFinalAnswer,
  reconcileTwoStageThinking,
  THINKING_CLOSE_TAG,
  THINKING_OPEN_TAG,
  THINKING_NOTES_ROLE,
  thinkingPanelPreview,
  wrapThinkingForContext,
} from "@/lib/chat/thinking-mode";
import { buildChatSystemPrompt } from "@/lib/prompts";

describe("thinking system prompt stack", () => {
  it("keeps platform + model identity for thinking notes stage", () => {
    const prompt = buildChatSystemPrompt({
      modelId: "ollama/gemma2:2b",
      thinkingStage: "thinking",
    });
    expect(prompt).toContain("Suryanshu Nabheet");
    expect(prompt).toContain("## Active model");
    expect(prompt).toContain("## Thinking");
    expect(prompt).toContain("Private reasoning");
    expect(prompt).not.toContain("## Chat");
    expect(prompt).toContain(THINKING_NOTES_ROLE.slice(0, 20));
  });

  it("keeps chat role and answer addon for final stage", () => {
    const prompt = buildChatSystemPrompt({
      modelId: "ollama/gemma2:2b",
      thinkingStage: "final",
      locale: "en",
    });
    expect(prompt).toContain("## Chat");
    expect(prompt).toContain("## Answer");
    expect(prompt).toContain("## Language");
    expect(prompt).not.toContain("## Thinking");
  });
});

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
      cleanAssistantContent(
        "Hello!\n\nUser Safety: safe\nResponse Safety: safe",
      ),
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

  it("does not promote thinking-only payloads into the answer", () => {
    const raw = `${THINKING_OPEN_TAG}\nonly notes\n${THINKING_CLOSE_TAG}`;
    expect(normalizeAssistantMessageContent(raw)).toBe("");
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

  it("keeps both when stage-2 succeeds with brief notes", () => {
    const result = reconcileTwoStageThinking(
      "The user asked a short question. I will answer clearly.",
      "Final answer.",
    );
    expect(result.thinkingText).toContain("user asked");
    expect(result.content).toBe("Final answer.");
  });

  it("promotes answer-like stage-1 when stage-2 is only a thin coda", () => {
    const essay = [
      "## Unveiling the Magic of Artificial Intelligence",
      "",
      "Artificial intelligence is transforming how we live and work across industries.",
      "",
      "### What is AI?",
      "",
      "AI systems learn from data, reason about problems, and perceive their environment.",
      "Machine learning and deep learning are the core building blocks behind modern systems.",
      "",
      "### Impact",
      "",
      "- Healthcare diagnostics",
      "- Finance fraud detection",
      "- Transportation autonomy",
      "",
      "In conclusion, AI will keep shaping society for decades to come.",
    ].join("\n");
    const coda =
      "Let me know if you want to explore a specific aspect of AI and we can delve deeper.";

    const result = reconcileTwoStageThinking(essay, coda);
    expect(result.thinkingText).toBe("");
    expect(result.content).toContain("Unveiling the Magic");
    expect(result.content).not.toBe(coda);
  });

  it("clears answer-like stage-1 when stage-2 already has a full reply", () => {
    const dumpedNotes = [
      "## Draft outline of a long answer about quantum computing basics",
      "",
      "Quantum computing uses qubits. Superposition and entanglement enable parallel state exploration.",
      "Applications include cryptography, chemistry simulation, and optimization problems at scale.",
      "This draft is long enough to look like a finished article rather than private notes.",
    ].join("\n");
    const realAnswer = [
      "## Quantum Computing",
      "",
      "Quantum computers encode information in qubits that can exist in superposition.",
      "That property lets certain algorithms explore many possibilities at once.",
      "Practical uses today are still early, but research continues in chemistry and cryptography.",
    ].join("\n");

    const result = reconcileTwoStageThinking(dumpedNotes, realAnswer);
    expect(result.thinkingText).toBe("");
    expect(result.content).toContain("Quantum Computing");
  });

  it("strips notes echoed at the start of the answer", () => {
    const notes =
      "The user asked what AI is. I will define it and give everyday examples.";
    const result = reconcileTwoStageThinking(
      notes,
      `${notes}\n\nArtificial intelligence is software that learns from data.`,
    );
    expect(result.thinkingText).toContain("user asked");
    expect(result.content).toContain("Artificial intelligence");
    expect(result.content).not.toContain("I will define");
  });

  it("clears greeting-as-thinking when a real answer exists", () => {
    const result = reconcileTwoStageThinking(
      "Okay, I see you initiated contact. How can I help you today?",
      "Hi there! I'm AiBoT. How can I help?",
    );
    expect(result.thinkingText).toBe("");
    expect(result.content).toContain("AiBoT");
  });

  it("drops thinking when notes and answer are near-duplicates", () => {
    const text =
      "Artificial intelligence is the field of building systems that learn from data.";
    const result = reconcileTwoStageThinking(text, text);
    expect(result.thinkingText).toBe("");
    expect(result.content).toBe(text);
  });
  it("documents weak-model dump repair: Thinking clears, text becomes response", () => {
    // Small models often write the full reply in stage 1. The platform must
    // promote that text to content so the UI does not look "broken".
    const dumpedReply = [
      "## What is Artificial Intelligence?",
      "",
      "AI is the field of building systems that learn from data, reason about problems,",
      "and perceive their environment. Machine learning and deep learning are the main tools.",
      "",
      "### Everyday impact",
      "",
      "- Healthcare imaging",
      "- Fraud detection in finance",
      "- Route planning in transportation",
      "",
      "That overview is the complete user-facing answer the model wrote too early.",
    ].join("\n");

    const result = reconcileTwoStageThinking(
      dumpedReply,
      "Want me to go deeper on any section?",
    );

    expect(result.thinkingText).toBe("");
    expect(result.content).toContain("What is Artificial Intelligence?");
    expect(result.content).not.toBe("Want me to go deeper on any section?");
  });
});

describe("thinkingPanelPreview", () => {
  it("hides answer dumps from the live Thinking panel", () => {
    const essay = [
      "## What is AI?",
      "",
      "A long explanation with enough substance to count as a final reply for the user.",
      "",
      "### Building blocks",
      "",
      "Machine learning and deep learning power most modern systems in production today.",
    ].join("\n");
    expect(thinkingPanelPreview(essay)).toBe("");
  });

  it("keeps real planning notes visible", () => {
    const notes =
      "The user asked what AI is. Cover a plain definition and a few everyday examples.";
    expect(thinkingPanelPreview(notes)).toContain("user asked");
  });
});

describe("looksLikeFinalAnswer", () => {
  it("rejects brief greeting notes", () => {
    expect(
      looksLikeFinalAnswer(
        "Okay, I see you initiated contact. How can I help you today?",
      ),
    ).toBe(false);
  });

  it("detects structured long replies", () => {
    expect(
      looksLikeFinalAnswer(
        [
          "## What is AI?",
          "",
          "A long explanation with enough substance to count as a final reply for the user.",
          "",
          "### Building blocks",
          "",
          "Machine learning and deep learning power most modern systems in production today.",
        ].join("\n"),
      ),
    ).toBe(true);
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
