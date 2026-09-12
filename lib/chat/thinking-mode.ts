/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

/**
 * Thinking mode ON: two calls — (1) private notes in Message.thinkingText,
 * (2) normal answer in Message.content. Thinking mode OFF: one call, answer only.
 *
 * Separation is enforced in reconcileTwoStageThinking (autonomous), not by
 * hoping the model follows the prompt.
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

const PRIVATE_NOTES_HEADER =
  "Private planning notes — do not copy into your answer:";

/**
 * Stage-1 role — stacked by buildChatSystemPrompt with platform + model identity.
 * Replaces Chat behavior so the model does not answer yet.
 */
export const THINKING_NOTES_ROLE = `## Thinking
Private reasoning the user may read. Plan first; the answer comes in the next step.

- Write 3–6 short sentences: intent, main points to cover, approach, and any caveats.
- Speak about the user in third person, never as a reply to them.
- Example — user asks "what is AI?": The user asked what AI is. Cover a plain definition, how systems learn from data, and 2–3 everyday examples. Keep it clear and non-technical.
- No greetings, questions back, titles, headings, bullet essays, or the full answer.
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
  text = text
    .replace(new RegExp(`^${escapeRegExp(PRIVATE_NOTES_HEADER)}\\s*`, "i"), "")
    .replace(/<\/?[^>]+>/g, "")
    .trim();
  return stripModelOutputArtifacts(text);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Remove echoed private-notes preamble from an answer body. */
function stripPrivateNotesPreamble(text: string): string {
  return text
    .replace(new RegExp(`^${escapeRegExp(PRIVATE_NOTES_HEADER)}\\s*`, "i"), "")
    .replace(/^Private planning notes[^\n]*\n+/i, "")
    .trim();
}

/**
 * User-facing answer only. Thinking-only payloads become "" so reconcile
 * can promote or error — notes must never become the response by accident.
 */
export function extractUserFacingAnswer(raw: string): string {
  const stripped = stripPrivateNotesPreamble(cleanAssistantContent(raw));
  if (!OPEN_TAG.test(stripped)) return stripped;

  const parsed = parseLegacyThinkingContent(stripped);
  return cleanAssistantContent(parsed.mainResponse);
}

/**
 * Full cleanup for stored/displayed assistant replies (normal + thinking stage 2).
 * Never returns thinking-only text as the answer body.
 */
export function normalizeAssistantMessageContent(raw: string): string {
  return extractUserFacingAnswer(raw);
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
  return extractUserFacingAnswer(raw);
}

/**
 * Detect when stage 1 ignored "notes only" and wrote a user-facing reply
 * (common with small local models like gemma2:2b).
 */
export function looksLikeFinalAnswer(text: string): boolean {
  const t = text.trim();
  if (!t) return false;

  const paragraphs = t
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0).length;
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

/** Stage-1 text that is already speaking to the user (not a plan). */
export function looksLikeUserDirectedReply(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (
    /^(hi|hello|hey|okay|ok|sure|thanks|thank you|good (morning|afternoon|evening))\b/i.test(
      t,
    )
  ) {
    return true;
  }
  if (/\bhow can i help you\b/i.test(t)) return true;
  if (/\bi['’]?m aibot\b/i.test(t)) return true;
  if (/\bas an ai\b/i.test(t) && t.length < 280) return true;
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

function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}

function areNearDuplicates(a: string, b: string): boolean {
  const left = normalizeForCompare(a);
  const right = normalizeForCompare(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const shorter = left.length <= right.length ? left : right;
  const longer = left.length <= right.length ? right : left;
  if (shorter.length < 24) return false;
  return longer.includes(shorter) && shorter.length / longer.length >= 0.72;
}

/** Drop notes that were pasted into the start of the answer. */
function stripNotesEchoFromAnswer(content: string, notes: string): string {
  const c = content.trim();
  const n = notes.trim();
  if (!c || !n) return c;
  if (areNearDuplicates(c, n)) return "";

  if (c.startsWith(n)) {
    return c
      .slice(n.length)
      .replace(/^[\s\n:.\-–—]+/, "")
      .trim();
  }

  const firstSentence = n.split(/(?<=[.!?])\s+/)[0]?.trim() ?? "";
  if (firstSentence.length >= 24 && c.startsWith(firstSentence)) {
    return c
      .slice(firstSentence.length)
      .replace(/^[\s\n:.\-–—]+/, "")
      .trim();
  }

  return c;
}

/**
 * Autonomous split: answer never stays under Thinking; notes never become the
 * response. Prefer a real stage-2 answer; otherwise promote stage-1 text.
 *
 * When a weak model dumps the full reply into stage 1, Thinking is cleared and
 * that text becomes `content`. That is intentional platform repair — not a UI
 * bug — so the user still gets the answer instead of an essay trapped under Thinking.
 */
export function reconcileTwoStageThinking(
  thinkingNotes: string,
  answerRaw: string,
): { thinkingText: string; content: string } {
  const thinking = cleanThinkingText(thinkingNotes);
  let content = extractUserFacingAnswer(answerRaw);
  content = stripNotesEchoFromAnswer(content, thinking);

  // No answer channel → promote whatever stage 1 produced; clear Thinking.
  if (!content && thinking) {
    return { thinkingText: "", content: thinking };
  }

  // Stage 1 wrote a full reply (or spoke to the user). Never leave that under Thinking.
  if (
    thinking &&
    (looksLikeFinalAnswer(thinking) || looksLikeUserDirectedReply(thinking))
  ) {
    if (
      !looksLikeFinalAnswer(content) &&
      isThinRelativeToThinking(content, thinking)
    ) {
      return { thinkingText: "", content: thinking };
    }
    return { thinkingText: "", content };
  }

  // Notes duplicated as the answer → keep answer only.
  if (thinking && content && areNearDuplicates(thinking, content)) {
    return { thinkingText: "", content };
  }

  if (content) {
    return { thinkingText: thinking, content };
  }

  return { thinkingText: "", content: "" };
}

/**
 * Display-time guard for finalized thinking messages. Safe to call on every
 * render after streaming ends — self-heals bad stored splits.
 */
export function displayThinkingFields(
  thinkingNotes: string | undefined,
  answerRaw: string | undefined,
  options?: { streaming?: boolean },
): { thinkingText: string; content: string } {
  const thinking = thinkingNotes ?? "";
  const content = answerRaw ?? "";
  if (options?.streaming) {
    return {
      thinkingText: cleanThinkingText(thinking),
      content: stripModelOutputArtifacts(content),
    };
  }
  return reconcileTwoStageThinking(thinking, content);
}

/**
 * While waiting on stage 2, hide answer-like stage-1 dumps from the Thinking
 * panel (full text is still passed to stage 2 / reconcile).
 */
export function thinkingPanelPreview(stage1Notes: string): string {
  const notes = cleanThinkingText(stage1Notes);
  if (!notes) return "";
  if (looksLikeFinalAnswer(notes) || looksLikeUserDirectedReply(notes)) {
    return "";
  }
  return notes;
}

export function wrapThinkingForContext(notes: string): string {
  const inner = cleanThinkingText(notes);
  if (!inner) return "";
  return `${PRIVATE_NOTES_HEADER}\n${inner}`;
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
