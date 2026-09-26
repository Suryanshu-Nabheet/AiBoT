/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import {
  ATTACHMENT_LIMITS,
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

const MAX_MODEL_HISTORY_MESSAGES = 30;
const MAX_MODEL_HISTORY_TEXT_CHARS = 300_000;
const MAX_MODEL_HISTORY_IMAGE_CHARS = 1_800_000;

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
  const startIndex = Math.max(0, messages.length - MAX_MODEL_HISTORY_MESSAGES);
  const recentMessages = messages.slice(startIndex);
  let latestVisualMessageIndex = -1;
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    if (
      recentMessages[i].role === Role.User &&
      recentMessages[i].attachments?.some(isVisualAttachment)
    ) {
      latestVisualMessageIndex = i;
      break;
    }
  }

  let textBudget = MAX_MODEL_HISTORY_TEXT_CHARS;
  let imageBudget = MAX_MODEL_HISTORY_IMAGE_CHARS;
  const result: { role: string; content: string | OpenAIContentPart[] }[] = [];

  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const message = recentMessages[i];
    const attachments = message.attachments ?? [];
    const visualAttachments = attachments.filter(isVisualAttachment);
    const keepVisuals = i === latestVisualMessageIndex;
    const allowedVisualIds = new Set<string>();
    if (keepVisuals) {
      for (const attachment of [...visualAttachments].reverse()) {
        if (
          attachment.content.length <= imageBudget &&
          attachment.content.length <= ATTACHMENT_LIMITS.maxImageDataUrlChars
        ) {
          allowedVisualIds.add(attachment.id ?? attachment.name);
        }
      }
    }

    const droppedVisuals = visualAttachments.filter(
      (attachment) => !allowedVisualIds.has(attachment.id ?? attachment.name),
    );
    const normalizedMessage =
      droppedVisuals.length > 0
        ? {
            ...message,
            attachments: attachments.map((attachment) =>
              droppedVisuals.includes(attachment)
                ? {
                    ...attachment,
                    type: "text/plain",
                    kind: "text" as const,
                    content: `[Visual attachment ${attachment.name} was omitted from this request to keep its size bounded.]`,
                  }
                : attachment,
            ),
          }
        : message;

    const content = messageContentForModelHistory(normalizedMessage);
    const bounded = boundHistoryContent(content, textBudget, imageBudget);
    textBudget -= bounded.textChars;
    imageBudget -= bounded.imageChars;
    result.push({ role: message.role, content: bounded.content });
  }

  return result.reverse();
}

function isVisualAttachment(
  attachment: NonNullable<Message["attachments"]>[number],
) {
  return (
    attachment.kind === "image" ||
    attachment.kind === "video_frame" ||
    attachment.type.startsWith("image/") ||
    attachment.content.startsWith("data:image/")
  );
}

function boundHistoryContent(
  content: string | OpenAIContentPart[],
  textBudget: number,
  imageBudget: number,
): {
  content: string | OpenAIContentPart[];
  textChars: number;
  imageChars: number;
} {
  if (typeof content === "string") {
    const trimmed = textTail(content, textBudget);
    return {
      content: trimmed,
      textChars: Math.min(content.length, textBudget),
      imageChars: 0,
    };
  }

  const reversedParts: OpenAIContentPart[] = [];
  let textChars = 0;
  let imageChars = 0;
  for (const part of [...content].reverse()) {
    if (part.type === "image_url") {
      const length = part.image_url.url.length;
      if (imageChars + length <= imageBudget) {
        imageChars += length;
        reversedParts.push(part);
      }
    } else if (textChars < textBudget) {
      const remaining = textBudget - textChars;
      const text = textTail(part.text, remaining);
      textChars += text.length;
      reversedParts.push({ type: "text", text });
    }
  }
  const bounded = reversedParts.reverse();
  return {
    content:
      bounded.length > 0
        ? bounded
        : [
            {
              type: "text",
              text: "[Earlier message omitted to fit request limits.]",
            },
          ],
    textChars,
    imageChars,
  };
}

function textTail(text: string, budget: number) {
  if (budget <= 0) return "";
  if (text.length <= budget) return text;
  const marker = "[Earlier content trimmed]\n";
  if (budget <= marker.length) return text.slice(-budget);
  return marker + text.slice(-(budget - marker.length));
}
