/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { resolveChatError } from "@/lib/chat/chat-error";

/** @deprecated Prefer resolveChatError — kept for callers that need a plain string. */
export function formatChatApiErrorMessage(raw: string, status = 500): string {
  const { title, body } = resolveChatError("en", status, raw);
  return `${title} ${body}`;
}
