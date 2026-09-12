/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import {
  assembleThinkingAndAnswer,
  wrapThinkingInner,
} from "@/lib/chat/thinking-mode";
import type { Message } from "@/lib/types";
import { Role } from "@/lib/types";

/** API / model context: merge structured thinking + answer when needed. */
export function messageContentForModelHistory(message: Message): string {
  if (message.role !== Role.Agent) {
    return message.content;
  }
  const answer = message.content?.trim() ?? "";
  const thinking = message.thinkingText?.trim() ?? "";
  if (thinking && answer) {
    return assembleThinkingAndAnswer(wrapThinkingInner(thinking), answer);
  }
  return message.content;
}

export function mapMessagesForModelHistory(
  messages: Message[],
): { role: string; content: string }[] {
  return messages.map((m) => ({
    role: m.role,
    content: messageContentForModelHistory(m),
  }));
}
