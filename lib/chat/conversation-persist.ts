/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

/** Sidebar / execution id stays shared; message history is stored per arena lane. */
export function getConversationPersistId(
  conversationId: string | null | undefined,
  options?: { sessionId?: string; executionType?: string },
): string | undefined {
  if (!conversationId) return undefined;
  if (options?.executionType === "ARENA" && options.sessionId) {
    return `${conversationId}::${options.sessionId}`;
  }
  return conversationId;
}

export function shouldRegisterExecutionForSession(sessionId?: string) {
  return sessionId !== "arena-b";
}
