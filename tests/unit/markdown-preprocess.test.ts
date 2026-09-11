/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { describe, expect, it } from "vitest";
import { INLINE_HEADING_ANSWER } from "../fixtures/thinking-content";
import { preprocessAssistantMarkdown } from "@/lib/chat/markdown-preprocess";

describe("preprocessAssistantMarkdown", () => {
  it("breaks inline ATX headings onto new lines", () => {
    const out = preprocessAssistantMarkdown(INLINE_HEADING_ANSWER);
    expect(out).toMatch(/\n\n#\s+Definition:/);
    expect(out).toMatch(/\n\n#\s+Key Components:/);
  });

  it("normalizes hash without space", () => {
    const out = preprocessAssistantMarkdown("#Title\nBody");
    expect(out.startsWith("# Title")).toBe(true);
  });

  it("returns empty for blank input", () => {
    expect(preprocessAssistantMarkdown("   ")).toBe("");
  });
});
