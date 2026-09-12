/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { describe, expect, it } from "vitest";
import { inferChatKeySource } from "@/lib/chat/chat-key-context";

describe("inferChatKeySource", () => {
  it("uses platform for curated OpenRouter models without BYOK", () => {
    expect(inferChatKeySource("openrouter/free", {})).toBe("platform");
  });

  it("uses byok when user saved openrouter key", () => {
    expect(
      inferChatKeySource("openrouter/free", { openrouter: "sk-test" }),
    ).toBe("byok");
  });

  it("uses byok for provider catalog models without keys", () => {
    expect(inferChatKeySource("gpt-4o", {})).toBe("byok");
  });
});
