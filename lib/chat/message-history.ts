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
const MAX_RETRIEVED_TURNS = 5;
const MAX_MODEL_HISTORY_TEXT_CHARS = 20_000;
const MAX_MODEL_HISTORY_IMAGE_CHARS = 1_800_000;
const HISTORY_STOPWORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "and",
  "are",
  "because",
  "before",
  "but",
  "can",
  "could",
  "did",
  "does",
  "for",
  "from",
  "have",
  "here",
  "how",
  "into",
  "its",
  "just",
  "like",
  "make",
  "more",
  "please",
  "same",
  "some",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "what",
  "when",
  "where",
  "which",
  "who",
  "will",
  "with",
  "would",
  "you",
  "your",
]);

type ModelHistoryMessage = {
  role: string;
  content: string | OpenAIContentPart[];
};

function terms(value: string): Set<string> {
  return new Set(
    value
      .toLocaleLowerCase()
      .match(/[\p{L}\p{N}]{3,}/gu)
      ?.filter((term) => !HISTORY_STOPWORDS.has(term)) ?? [],
  );
}

function messageText(message: Message): string {
  return [message.content, message.webSearchContext]
    .filter((part): part is string => typeof part === "string")
    .join(" ");
}

function retrieveOlderTurns(
  messages: Message[],
  startIndex: number,
  query: string,
): Message[] {
  if (startIndex <= 0) return [];
  const queryTerms = terms(query);
  const refersToHistory =
    /\b(?:earlier|before|previous|last time|we discussed|we decided|remember|that plan|those details|what did i say|what was the)\b/i.test(
      query,
    );
  const candidates: { start: number; end: number; score: number }[] = [];

  for (let start = 0; start < startIndex; start += 1) {
    if (messages[start]?.role !== Role.User) continue;
    let end = start + 1;
    while (end < startIndex && messages[end]?.role !== Role.User) end += 1;
    const turnText = messages.slice(start, end).map(messageText).join(" ");
    if (!turnText.trim()) continue;
    const turnTerms = terms(turnText);
    let overlap = 0;
    for (const term of queryTerms) if (turnTerms.has(term)) overlap += 1;
    const stableCue =
      /\b(?:remember|important|requirement|constraint|must|always|never|prefer|decided|we chose|deadline|goal|project|working on|my name is|i work)\b/i.test(
        turnText,
      );
    const recency = startIndex ? start / startIndex : 0;
    const score =
      overlap * 3 +
      (stableCue ? 2 : 0) +
      (refersToHistory ? 1 : 0) +
      (start === 0 ? 0.5 : 0) +
      recency * 0.4;
    if (score >= 0.8) candidates.push({ start, end, score });
    start = end - 1;
  }

  const selected = candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RETRIEVED_TURNS)
    .sort((a, b) => a.start - b.start);
  return selected.flatMap(({ start, end }) => messages.slice(start, end));
}

export function messageContentForModelHistory(
  message: Message,
): string | OpenAIContentPart[] {
  if (message.role !== Role.Assistant) {
    const attachments = (message.attachments ?? []).map((a) =>
      normalizeLegacyAttachment(a),
    ) as ChatAttachment[];
    const searchContext = message.webSearchContext?.trim();
    if (attachments.length > 0) {
      const content = buildMultimodalUserContent(
        message.content ?? "",
        attachments,
      );
      if (!searchContext) return content;
      if (typeof content === "string") {
        return `${content}\n\n${searchContext}`;
      }
      return [...content, { type: "text", text: searchContext }];
    }
    return searchContext
      ? `${message.content}\n\n${searchContext}`
      : message.content;
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
  options: { query?: string; maxTextChars?: number } = {},
): ModelHistoryMessage[] {
  const recentStartIndex = Math.max(
    0,
    messages.length - MAX_MODEL_HISTORY_MESSAGES,
  );
  const retrieved = retrieveOlderTurns(
    messages,
    recentStartIndex,
    options.query ?? "",
  );
  const recentMessages = messages.slice(recentStartIndex);
  const selectedMessages = [...retrieved, ...recentMessages];
  const startIndex = Math.max(
    0,
    selectedMessages.length -
      MAX_MODEL_HISTORY_MESSAGES -
      MAX_RETRIEVED_TURNS * 2,
  );
  const selected = selectedMessages.slice(startIndex);
  let latestVisualMessageIndex = -1;
  for (let i = selected.length - 1; i >= 0; i--) {
    if (
      selected[i].role === Role.User &&
      selected[i].attachments?.some(isVisualAttachment)
    ) {
      latestVisualMessageIndex = i;
      break;
    }
  }

  const totalTextBudget = Math.max(
    1_000,
    Math.min(options.maxTextChars ?? MAX_MODEL_HISTORY_TEXT_CHARS, 48_000),
  );
  // Keep a slice for retrieved turns so very long recent messages cannot evict
  // the older facts that were selected specifically for this question.
  let olderTextBudget = retrieved.length
    ? Math.min(4_000, Math.floor(totalTextBudget * 0.25))
    : 0;
  let recentTextBudget = totalTextBudget - olderTextBudget;
  let imageBudget = MAX_MODEL_HISTORY_IMAGE_CHARS;
  const result: { role: string; content: string | OpenAIContentPart[] }[] = [];

  for (let i = selected.length - 1; i >= 0; i--) {
    const message = selected[i];
    const olderTurn = i < retrieved.length;
    const textBudget = olderTurn ? olderTextBudget : recentTextBudget;
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
    if (olderTurn) olderTextBudget -= bounded.textChars;
    else recentTextBudget -= bounded.textChars;
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
  const remaining = budget - marker.length;
  const head = Math.ceil(remaining * 0.65);
  const tail = remaining - head;
  return `${text.slice(0, head)}${marker}${tail > 0 ? text.slice(-tail) : ""}`;
}
