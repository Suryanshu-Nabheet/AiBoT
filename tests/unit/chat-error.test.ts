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

  it("reads keySource from API", () => {
    const raw = JSON.stringify({
      code: "platform_unavailable",
      keySource: "platform",
    });
    expect(parseChatErrorPayload(raw).keySource).toBe("platform");
  });
});

describe("inferChatErrorCode", () => {
  it("maps 429 to rate_limit", () => {
    expect(inferChatErrorCode(429, "")).toBe("rate_limit");
  });

  it("maps missing env key to platform_unavailable for platform models", () => {
    expect(
      inferChatErrorCode(
        401,
        "No API key available. Add OPENROUTER_API_KEY.",
        undefined,
        {
          modelId: "openrouter/free",
          customKeys: {},
        },
      ),
    ).toBe("platform_unavailable");
  });

  it("maps missing key to byok_key_required for BYOK catalog models", () => {
    expect(
      inferChatErrorCode(
        400,
        JSON.stringify({ code: "byok_key_required" }),
        undefined,
        { modelId: "gpt-4o", customKeys: {} },
      ),
    ).toBe("byok_key_required");
  });

  it("maps invalid model text", () => {
    expect(
      inferChatErrorCode(404, "Model not found: foo/bar", undefined, {
        modelId: "openrouter/free",
      }),
    ).toBe("invalid_model");
  });
});

describe("resolveChatError", () => {
  it("returns localized body without raw upstream", () => {
    const raw = JSON.stringify({
      error: { message: '{"type":"internal"}', code: 429 },
    });
    const resolved = resolveChatError("en", 429, raw, undefined, {
      modelId: "openrouter/free",
    });
    expect(resolved.code).toBe("rate_limit");
    expect(resolved.body).not.toContain("internal");
  });
});
