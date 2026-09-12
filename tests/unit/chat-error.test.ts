/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { describe, expect, it } from "vitest";
import {
  inferChatErrorCode,
  parseChatErrorPayload,
  resolveChatError,
} from "@/lib/chat/chat-error";

describe("parseChatErrorPayload", () => {
  it("reads OpenRouter nested error", () => {
    const raw = JSON.stringify({
      error: { message: "Rate limit exceeded", code: 429 },
    });
    expect(parseChatErrorPayload(raw).message).toContain("Rate limit");
  });

  it("reads code field from API", () => {
    const raw = JSON.stringify({ code: "missing_api_key", message: "ignored" });
    expect(parseChatErrorPayload(raw).code).toBe("missing_api_key");
  });
});

describe("inferChatErrorCode", () => {
  it("maps 429 to rate_limit", () => {
    expect(inferChatErrorCode(429, "")).toBe("rate_limit");
  });

  it("maps provider key messages", () => {
    expect(
      inferChatErrorCode(
        400,
        JSON.stringify({
          code: "missing_api_key",
        }),
      ),
    ).toBe("missing_api_key");
  });

  it("maps missing env key text", () => {
    expect(
      inferChatErrorCode(401, "No API key available. Add OPENROUTER_API_KEY."),
    ).toBe("missing_api_key");
  });
});

describe("resolveChatError", () => {
  it("returns localized title and body without raw upstream", () => {
    const raw = JSON.stringify({
      error: { message: '{"type":"internal"}', code: 429 },
    });
    const resolved = resolveChatError("en", 429, raw);
    expect(resolved.code).toBe("rate_limit");
    expect(resolved.title).toContain("Slow down");
    expect(resolved.body).not.toContain("internal");
  });
});
