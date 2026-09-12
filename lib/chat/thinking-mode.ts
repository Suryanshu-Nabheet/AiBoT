/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

/**
 * Thinking mode ON: two calls — (1) private notes in Message.thinkingText,
 * (2) normal answer in Message.content. Thinking mode OFF: one call, answer only.
 */

import {
  cleanAssistantContent,
  stripModelOutputArtifacts,
} from "@/lib/chat/assistant-output";

export type ThinkingStage = "thinking" | "final";

export {
  cleanAssistantContent,
  stripModelOutputArtifacts,
} from "@/lib/chat/assistant-output";

export const THINKING_OPEN_TAG = "<thinking>";
export const THINKING_CLOSE_TAG = "</thinking>";

const OPEN_TAG = /<thinking>/i;
const CLOSE_TAG = /<\/thinking>/i;

const REASONING_SYSTEM = [
  "Thinking mode: take extra time to process, analyze, and structure your reply.",
  "Output only a few sentences of private notes about the user's message.",
  "Do not write the final answer they will read.",
  "Do not output safety ratings, metadata labels, or a different model identity.",
].join(" ");

const ANSWER_HINT =
  "Provide the final answer for the user. Do not repeat your notes verbatim.";

export function composeSystemPromptForThinkingStage(
  fullAssistantSystemPrompt: string,
  stage: ThinkingStage,
): string {
  if (stage === "thinking") {
    return REASONING_SYSTEM;
  }
  return `${fullAssistantSystemPrompt}\n\n${ANSWER_HINT}`;
}

/** Strip optional <thinking> wrappers; store plain notes in the UI. */
export function cleanThinkingText(raw: string): string {
  let text = raw.trim();
  if (!text) return "";
  if (OPEN_TAG.test(text)) {
    const afterOpen = text.split(OPEN_TAG)[1] ?? "";
    text = CLOSE_TAG.test(afterOpen)
      ? (afterOpen.split(CLOSE_TAG)[0] ?? afterOpen)
      : afterOpen;
  }
  text = text.replace(/<\/?[^>]+>/g, "").trim();
  return stripModelOutputArtifacts(text);
}

/**
 * Full cleanup for stored/displayed assistant replies (normal + thinking stage 2).
 * Unwraps accidental <thinking> blocks when models leak them into a single shot.
 */
export function normalizeAssistantMessageContent(raw: string): string {
  const stripped = cleanAssistantContent(raw);
  if (!OPEN_TAG.test(stripped)) return stripped;

  const parsed = parseLegacyThinkingContent(stripped);
  if (parsed.mainResponse.trim()) {
    return cleanAssistantContent(parsed.mainResponse);
  }
  const notesOnly = cleanThinkingText(parsed.thinkingContent);
  return notesOnly || stripped;
}

/** Live stream updates: artifact strip only; full normalize on stream end. */
export function sanitizeAssistantStreamField(
  field: "content" | "thinkingText",
  raw: string,
  finalize: boolean,
): string {
  if (field === "thinkingText") {
    return finalize
      ? cleanThinkingText(raw)
      : stripModelOutputArtifacts(raw.trim());
  }
  if (!finalize) return stripModelOutputArtifacts(raw);
  return normalizeAssistantMessageContent(raw);
}

/**
 * Small models sometimes skip stage 2 or only answer in stage 1.
 * Prefer a real stage-2 answer; otherwise show stage-1 text as the reply.
 */
export function reconcileTwoStageThinking(
  thinkingNotes: string,
  answerRaw: string,
): { thinkingText: string; content: string } {
  const thinking = cleanThinkingText(thinkingNotes);
  const content = normalizeAssistantMessageContent(answerRaw);
  if (content) {
    return { thinkingText: thinking, content };
  }
  if (thinking) {
    return { thinkingText: "", content: thinking };
  }
  return { thinkingText: "", content: "" };
}

export function wrapThinkingForContext(notes: string): string {
  const inner = cleanThinkingText(notes);
  if (!inner) return "";
  return `${THINKING_OPEN_TAG}\n${inner}\n${THINKING_CLOSE_TAG}`;
}

export function getStage2ContinuationUserPrompt(): string {
  return "Write your final answer now.";
}

export function buildChatMessagesForThinkingStage(params: {
  history: { role: string; content: string }[];
  userContent: string;
  stage: ThinkingStage;
  priorReasoning?: string;
}): { role: string; content: string }[] {
  const { history, userContent, stage, priorReasoning } = params;

  if (stage === "thinking") {
    return [...history, { role: "user", content: userContent }];
  }

  const prior = wrapThinkingForContext(priorReasoning ?? "");
  if (prior) {
    return [
      ...history,
      { role: "user", content: userContent },
      { role: "assistant", content: prior },
      { role: "user", content: getStage2ContinuationUserPrompt() },
    ];
  }

  return [...history, { role: "user", content: userContent }];
}

export function isSubstantiveThinkingContent(text: string): boolean {
  return cleanThinkingText(text).length >= 8;
}

/** Old messages that stored thinking + answer in one string. */
export function parseLegacyThinkingContent(rawContent: string): {
  thinkingContent: string;
  mainResponse: string;
} {
  if (!OPEN_TAG.test(rawContent)) {
    return { thinkingContent: "", mainResponse: rawContent.trim() };
  }

  const parts = rawContent.split(/<\/thinking>/i);
  const thinkingContent = cleanThinkingText(parts[0] ?? "");
  const mainResponse = cleanAssistantContent(
    (parts.slice(1).join("</thinking>") ?? "").replace(/<\/?[^>]+>/g, ""),
  );

  return { thinkingContent, mainResponse };
}

export function mergeThinkingAndAnswerForHistory(
  thinking: string,
  answer: string,
): string {
  const notes = cleanThinkingText(thinking);
  const body = cleanAssistantContent(answer);
  if (!notes) return body;
  if (!body) return wrapThinkingForContext(notes);
  return `${wrapThinkingForContext(notes)}\n\n${body}`;
}
