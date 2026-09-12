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

/**
 * Stage-1 role — stacked by buildChatSystemPrompt with platform + model identity.
 * Replaces Chat behavior so the model does not answer yet.
 */
export const THINKING_NOTES_ROLE = `## Thinking
Private scratchpad only — think silently first; the user-facing answer comes next.

- Write 1–3 short sentences: what the user wants, then how you will answer.
- Speak about the user in third person, never as a reply to them.
- Example — user asks "what is AI?": The user asked what AI is. I will give a plain definition, then a few everyday examples.
- No greetings, questions back, titles, headings, lists, or the final answer.
- No safety-score metadata.`;

/** Stage-2 addon — Chat role stays; this closes the loop after notes. */
export const THINKING_ANSWER_ADDON = `## Answer
Your notes are done. Reply to the user directly now — clear, complete, and natural.
Do not repeat the notes or mention that you were thinking.`;

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
 * Detect when stage 1 ignored "notes only" and wrote a user-facing reply
 * (common with small local models like gemma2:2b).
 */
export function looksLikeFinalAnswer(text: string): boolean {
  const t = text.trim();
  if (!t) return false;

  const paragraphs = t.split(/\n\s*\n/).filter((p) => p.trim().length > 0)
    .length;
  const hasHeading = /^#{1,6}\s+\S/m.test(t);
  const hasList = /^[-*•]\s+\S/m.test(t);
  const hasTitleLine = /^\*\*[^*]{12,}\*\*\s*$/m.test(t);

  if (t.length >= 400) return true;
  if (t.length >= 220 && (hasHeading || hasTitleLine || paragraphs >= 3)) {
    return true;
  }
  if ((hasHeading || hasTitleLine) && (paragraphs >= 2 || hasList)) return true;
  return false;
}

/** Stage-2 text too thin to be the real reply when stage 1 already wrote one. */
function isThinRelativeToThinking(content: string, thinking: string): boolean {
  const c = content.trim();
  const t = thinking.trim();
  if (!c) return true;
  if (c.length < 220 && t.length > c.length * 2.5) return true;
  if (c.length < t.length * 0.35 && t.length >= 280) return true;
  return false;
}

/**
 * Small models sometimes dump the full reply in stage 1 and only a short coda
 * in stage 2. Prefer a real stage-2 answer when it is substantive; otherwise
 * promote stage-1 text and never leave an essay trapped under Thinking.
 */
export function reconcileTwoStageThinking(
  thinkingNotes: string,
  answerRaw: string,
): { thinkingText: string; content: string } {
  const thinking = cleanThinkingText(thinkingNotes);
  const content = normalizeAssistantMessageContent(answerRaw);

  if (!content && thinking) {
    return { thinkingText: "", content: thinking };
  }

  if (content && thinking && looksLikeFinalAnswer(thinking)) {
    // Stage 1 ignored "notes only". If stage 2 is only a thin coda, promote
    // the stage-1 essay; otherwise keep stage 2 and hide the dump.
    if (
      !looksLikeFinalAnswer(content) &&
      isThinRelativeToThinking(content, thinking)
    ) {
      return { thinkingText: "", content: thinking };
    }
    return { thinkingText: "", content };
  }

  if (content) {
    return { thinkingText: thinking, content };
  }

  return { thinkingText: "", content: "" };
}

export function wrapThinkingForContext(notes: string): string {
  const inner = cleanThinkingText(notes);
  if (!inner) return "";
  return `${THINKING_OPEN_TAG}\n${inner}\n${THINKING_CLOSE_TAG}`;
}

export function getStage2ContinuationUserPrompt(): string {
  return "Now give your full answer to the user.";
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
