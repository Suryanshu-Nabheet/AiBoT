/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { describe, expect, it } from "vitest";
import { sanitizeCustomKeysForRequest } from "@/lib/chat/sanitize-custom-keys";

describe("sanitizeCustomKeysForRequest", () => {
  it("removes empty and short keys", () => {
    expect(
      sanitizeCustomKeysForRequest({
        openai: "",
        openrouter: "short",
        anthropic: "sk-ant-valid-key-12345",
      }),
    ).toEqual({ anthropic: "sk-ant-valid-key-12345" });
  });

  it("returns undefined when no valid keys", () => {
    expect(sanitizeCustomKeysForRequest({ openai: "" })).toBeUndefined();
  });
});
