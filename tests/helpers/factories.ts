/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import type { Message } from "@/lib/types";
import { Role } from "@/lib/types";

export function createUserMessage(
  content: string,
  overrides: Partial<Message> = {},
): Message {
  return {
    id: overrides.id ?? "msg-user-1",
    role: Role.User,
    content,
    ...overrides,
  };
}

export function createAssistantMessage(
  content: string,
  overrides: Partial<Message> = {},
): Message {
  return {
    id: overrides.id ?? "msg-assistant-1",
    role: Role.Agent,
    content,
    ...overrides,
  };
}

export function createChatRequestBody(overrides: Record<string, unknown> = {}) {
  return {
    messages: [{ role: "user", content: "Hello" }],
    model: "openrouter/free",
    ...overrides,
  };
}
