/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { describe, expect, it } from "vitest";
import {
  AIBOT_PLATFORM_CONTEXT,
  buildChatSystemPrompt,
  composeAgentSystemPrompt,
} from "@/lib/prompts";
import {
  composeSystemPromptWithIdentity,
  resolveModelLabel,
  resolveProviderLabel,
} from "@/lib/prompts/identity";

describe("resolveModelLabel", () => {
  it("uses catalog name for platform models", () => {
    expect(resolveModelLabel({ id: "openrouter/free" })).toBe(
      "OpenRouter Free",
    );
  });

  it("derives a title from unknown slugs", () => {
    expect(resolveModelLabel({ id: "vendor/foo-bar:beta" })).toContain("Foo");
  });
});

describe("composeSystemPromptWithIdentity", () => {
  it("separates platform attribution from model vendor", () => {
    const prompt = composeSystemPromptWithIdentity(
      AIBOT_PLATFORM_CONTEXT,
      "## Role\nHelp.",
      { id: "openrouter/free", name: "OpenRouter Free" },
    );
    expect(prompt).toContain("Suryanshu Nabheet");
    expect(prompt).toContain("OpenRouter Free");
    expect(prompt).toContain("from **OpenRouter**");
    expect(prompt).not.toMatch(
      /OpenRouter Free.*developed and built by Suryanshu/i,
    );
  });
});

describe("buildChatSystemPrompt", () => {
  it("includes platform and BYOK model identity", () => {
    const prompt = buildChatSystemPrompt({ modelId: "gpt-4o" });
    expect(prompt).toContain("GPT-4o");
    expect(prompt).toContain("AiBoT");
    expect(prompt).toContain("## Chat");
    expect(resolveProviderLabel("openai/gpt-4o")).toBe("OpenAI");
  });

  it("uses thinking notes role instead of chat for stage thinking", () => {
    const prompt = buildChatSystemPrompt({
      modelId: "gpt-4o",
      thinkingStage: "thinking",
      locale: "hi",
    });
    expect(prompt).toContain("## Thinking");
    expect(prompt).toContain("## Language");
    expect(prompt).toContain("Suryanshu Nabheet");
    expect(prompt).not.toContain("## Chat");
  });
});

describe("composeAgentSystemPrompt", () => {
  it("includes AiBoT platform block for agents", () => {
    const prompt = composeAgentSystemPrompt("## Agent\nDo work.", {
      id: "openrouter/auto",
      name: "OpenRouter Auto",
    });
    expect(prompt).toContain("built by **Suryanshu Nabheet**");
  });
});
