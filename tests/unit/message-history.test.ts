/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { describe, expect, it } from "vitest";
import { messageContentForModelHistory } from "@/lib/chat/message-history";
import {
  THINKING_CLOSE_TAG,
  THINKING_OPEN_TAG,
} from "@/lib/chat/thinking-mode";
import { Role } from "@/lib/types";

describe("messageContentForModelHistory", () => {
  it("merges structured thinking and answer for the model", () => {
    const merged = messageContentForModelHistory({
      role: Role.Agent,
      content: "Hello!",
      thinkingText: "Casual greeting.",
    });
    expect(merged).toContain(THINKING_OPEN_TAG);
    expect(merged).toContain("Casual greeting.");
    expect(merged).toContain("Hello!");
    expect(merged).toContain(THINKING_CLOSE_TAG);
  });
});
