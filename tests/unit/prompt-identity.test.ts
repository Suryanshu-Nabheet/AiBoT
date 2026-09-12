/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { describe, expect, it } from "vitest";
import { buildChatSystemPrompt } from "@/lib/prompts";
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
  it("injects the active model name", () => {
    const prompt = composeSystemPromptWithIdentity("## Role\nHelp.", {
      id: "openrouter/free",
      name: "OpenRouter Free",
    });
    expect(prompt).toContain("OpenRouter Free");
    expect(prompt).toContain("OpenRouter");
    expect(prompt).not.toContain("OpenRouter Free model (provided by");
  });
});

describe("buildChatSystemPrompt", () => {
  it("includes model identity for chat", () => {
    const prompt = buildChatSystemPrompt({ modelId: "gpt-4o" }); // BYOK catalog id
    expect(prompt).toContain("GPT-4o");
    expect(resolveProviderLabel("openai/gpt-4o")).toBe("OpenAI");
  });
});
