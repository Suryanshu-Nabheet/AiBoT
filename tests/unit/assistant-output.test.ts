/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { describe, expect, it } from "vitest";
import {
  cleanAssistantContent,
  stripModelOutputArtifacts,
} from "@/lib/chat/assistant-output";

describe("assistant-output", () => {
  it("stripModelOutputArtifacts removes safety lines", () => {
    expect(
      stripModelOutputArtifacts("Hi\nUser Safety: safe\nResponse Safety: safe"),
    ).toBe("Hi");
  });

  it("cleanAssistantContent trims and strips", () => {
    expect(cleanAssistantContent("  answer  ")).toBe("answer");
  });
});
