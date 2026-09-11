/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { describe, expect, it } from "vitest";
import {
  getConversationPersistId,
  shouldRegisterExecutionForSession,
} from "@/lib/chat/conversation-persist";

describe("conversation-persist", () => {
  it("isolates arena lane storage ids", () => {
    expect(
      getConversationPersistId("abc", {
        executionType: "ARENA",
        sessionId: "arena-a",
      }),
    ).toBe("abc::arena-a");
    expect(
      getConversationPersistId("abc", {
        executionType: "ARENA",
        sessionId: "arena-b",
      }),
    ).toBe("abc::arena-b");
  });

  it("uses base id for direct chat", () => {
    expect(
      getConversationPersistId("abc", { executionType: "CONVERSATION" }),
    ).toBe("abc");
  });

  it("registers execution once for arena pair", () => {
    expect(shouldRegisterExecutionForSession("arena-a")).toBe(true);
    expect(shouldRegisterExecutionForSession("arena-b")).toBe(false);
    expect(shouldRegisterExecutionForSession(undefined)).toBe(true);
  });
});
