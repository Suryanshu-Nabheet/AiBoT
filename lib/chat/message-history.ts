/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import {
  buildMultimodalUserContent,
  normalizeLegacyAttachment,
  type ChatAttachment,
  type OpenAIContentPart,
} from "@/lib/chat/attachments";
import {
  mergeThinkingAndAnswerForHistory,
  normalizeAssistantMessageContent,
} from "@/lib/chat/thinking-mode";
import type { Message } from "@/lib/types";
import { Role } from "@/lib/types";

export function messageContentForModelHistory(
  message: Message,
): string | OpenAIContentPart[] {
  if (message.role !== Role.Agent) {
    const attachments = (message.attachments ?? []).map((a) =>
      normalizeLegacyAttachment(a),
    ) as ChatAttachment[];
    if (attachments.length > 0) {
      return buildMultimodalUserContent(message.content ?? "", attachments);
    }
    return message.content;
  }
  const thinking = message.thinkingText?.trim() ?? "";
  const answer = normalizeAssistantMessageContent(message.content ?? "");
  if (thinking && answer) {
    return mergeThinkingAndAnswerForHistory(thinking, answer);
  }
  return answer;
}

export function mapMessagesForModelHistory(
  messages: Message[],
): { role: string; content: string | OpenAIContentPart[] }[] {
  return messages.map((m) => ({
    role: m.role,
    content: messageContentForModelHistory(m),
  }));
}
