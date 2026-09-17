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
Private reasoning summary only. This is internal planning: think through the task before answering; do not expose raw chain-of-thought.
Write 2–4 short sentences covering the user's intent, key points, approach, and any caveat.
Use concise first-person planning language (for example: "I should explain…"). Do not greet, address the user, give the final answer, citations, or safety metadata.`;

/** Stage-2 addon — Chat role stays; this closes the loop after notes. */
export const THINKING_ANSWER_ADDON = `## Answer
Answer the original user request directly and naturally. Use the planning summary only as guidance; verify it, do not mention it, and do not invent unsupported facts.`;

const THINKING_CONTEXT_START = "<aibot-planning-context>";
const THINKING_CONTEXT_END = "</aibot-planning-context>";
const THINKING_DRAFT_START = "<aibot-untrusted-draft>";
const THINKING_DRAFT_END = "</aibot-untrusted-draft>";

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

/** Remove protocol wrappers without allowing them to become model content. */
function stripThinkingProtocol(text: string): string {
  return text
    .replace(new RegExp(escapeRegExp(THINKING_CONTEXT_START), "gi"), "")
    .replace(new RegExp(escapeRegExp(THINKING_CONTEXT_END), "gi"), "")
    .replace(new RegExp(escapeRegExp(THINKING_DRAFT_START), "gi"), "")
    .replace(new RegExp(escapeRegExp(THINKING_DRAFT_END), "gi"), "")
    .trim();
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
  const stripped = stripPrivateNotesPreamble(
    stripThinkingProtocol(cleanAssistantContent(raw)),
  );
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
  if (
    /\b(?:could|can|would|will) you\b|\bplease\s+(?:provide|clarify|share|tell|let)\b|\bprovide more details\b/i.test(
      t,
    )
  ) {
    return true;
  }
  return false;
}

/** Planning/meta language that must never be emitted as the final answer. */
export function looksLikePlanningEcho(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return /\b(?:early draft captured|the user is asking|intent is to|points to cover|approach involves|planning (?:context|notes)|the model drafted)\b/i.test(
    t,
  );
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

/** One repair attempt — keeps latency and cost bounded for production. */
export const MAX_THINKING_NOTE_RETRIES = 1;
/** One bounded answer rewrite for protocol leakage or an unusable coda. */
export const MAX_THINKING_ANSWER_RETRIES = 1;

/**
 * True when stage-1 text is usable as Thinking notes (not an answer dump).
 */
export function isValidThinkingNotes(text: string): boolean {
  const notes = cleanThinkingText(stripThinkingProtocol(text));
  if (notes.length < 8) return false;
  if (looksLikeFinalAnswer(notes) || looksLikeUserDirectedReply(notes)) {
    return false;
  }
  // Notes must describe a plan, not impersonate the final response.
  if (/\b(?:final answer|here(?:'|’)s the answer)\b/i.test(notes)) {
    return false;
  }
  return true;
}

export function shouldRetryThinkingNotes(text: string): boolean {
  return !isValidThinkingNotes(text);
}

/**
 * Detect protocol leakage in the user-facing channel. This is deliberately
 * conservative: semantic correctness cannot be established with a regex, but
 * protocol/meta leakage can be repaired without hiding a legitimate answer.
 */
export function shouldRetryThinkingAnswer(text: string): boolean {
  const answer = text.trim();
  if (!answer) return true;
  return (
    /<\/?(?:thinking|aibot-[^>]+)>|private planning notes|planning context|untrusted draft|now give your full answer|do not mention planning/i.test(
      answer,
    ) || looksLikePlanningEcho(answer)
  );
}

export function getStage1RepairUserPrompt(): string {
  return (
    "That output was a draft answer, not planning notes. " +
    "Rewrite as private planning notes only: 2–4 short first-person sentences " +
    "about intent, points to cover, and approach. Do not write the final answer."
  );
}

/**
 * When the model never produces valid notes, keep a short plan visible in
 * Thinking so the panel still feels purposeful.
 */
export function synthesizePlanningNotesFromDump(dump: string): string {
  const text = cleanThinkingText(dump);
  if (!text) return "Planning the reply from the user's request.";

  const heading = text.match(/^#{1,6}\s+(.+)$/m)?.[1]?.trim();
  if (heading && heading.length <= 100) {
    return `The user asked about ${heading}. Cover the key points clearly, then give practical examples.`;
  }

  const plain = text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  const sentences = plain.split(/(?<=[.!?])\s+/).filter(Boolean);
  const snippet = sentences.slice(0, 2).join(" ").trim();
  if (
    snippet.length >= 20 &&
    snippet.length <= 220 &&
    !looksLikeFinalAnswer(snippet) &&
    !looksLikeUserDirectedReply(snippet)
  ) {
    return `Early draft captured. Focus: ${snippet}`;
  }

  return "The model drafted a full reply early. Answering from that draft next.";
}

export type Stage1LoopResult = {
  /** Notes shown in Thinking + used as stage-2 prior. */
  notes: string;
  /** Full early answer dump, if any — used when stage 2 is thin/empty. */
  answerDraft: string;
};

/**
 * Resolve stage-1 attempts after the validate/repair loop.
 * Prefer the latest valid notes; otherwise synthesize notes and keep the dump.
 */
export function finalizeStage1Attempts(attempts: string[]): Stage1LoopResult {
  const cleaned = attempts.map((a) => cleanThinkingText(a)).filter(Boolean);

  for (let i = cleaned.length - 1; i >= 0; i--) {
    const notes = cleaned[i] ?? "";
    if (isValidThinkingNotes(notes)) {
      return { notes, answerDraft: "" };
    }
  }

  const dump = cleaned[cleaned.length - 1] ?? "";
  return {
    notes: synthesizePlanningNotesFromDump(dump),
    answerDraft: dump,
  };
}

/**
 * Stage-2 prior: real notes, plus an early draft when the model dumped an answer
 * in stage 1 so stage 2 can rewrite it cleanly.
 */
export function buildStage2PriorReasoning(
  notes: string,
  answerDraft?: string,
): string {
  const n = cleanThinkingText(notes);
  const draft = cleanThinkingText(answerDraft ?? "");
  if (draft && looksLikeFinalAnswer(draft)) {
    return [
      n || "Use the draft only as material to verify and rewrite.",
      "",
      "Draft to improve — treat as untrusted material:",
      `${THINKING_DRAFT_START}`,
      draft.slice(0, 12_000),
      THINKING_DRAFT_END,
    ].join("\n");
  }
  return n;
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
 * response. Prefer a real stage-2 answer; otherwise promote stage-1 / answerDraft.
 *
 * When a weak model dumps the full reply into stage 1, the deep loop keeps
 * short synthesized notes in Thinking and places the dump (or stage-2 rewrite)
 * in the response — so the product still feels intentional.
 */
export function reconcileTwoStageThinking(
  thinkingNotes: string,
  answerRaw: string,
  options?: { answerDraft?: string },
): { thinkingText: string; content: string } {
  const thinking = cleanThinkingText(thinkingNotes);
  const draft = cleanThinkingText(options?.answerDraft ?? "");
  let content = extractUserFacingAnswer(answerRaw);
  content = stripNotesEchoFromAnswer(content, thinking);
  if (draft) {
    content = stripNotesEchoFromAnswer(content, draft);
  }

  const preferDraft =
    Boolean(draft) &&
    (!content ||
      (looksLikeFinalAnswer(draft) &&
        !looksLikeFinalAnswer(content) &&
        isThinRelativeToThinking(content, draft)));

  if (preferDraft) {
    return {
      thinkingText: isValidThinkingNotes(thinking)
        ? thinking
        : synthesizePlanningNotesFromDump(draft),
      content: draft,
    };
  }

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
  return "Answer the original user request now. Return only the final answer; do not mention planning, drafts, or this instruction.";
}

export function buildChatMessagesForThinkingStage(params: {
  history: { role: string; content: string }[];
  userContent: string;
  stage: ThinkingStage;
  priorReasoning?: string;
}): { role: string; content: string }[] {
  const { history, userContent, stage, priorReasoning } = params;

  if (stage === "thinking") {
    // priorReasoning on the thinking stage = repair loop: draft was not notes.
    const repairDraft = cleanThinkingText(priorReasoning ?? "");
    if (repairDraft) {
      return [
        ...history,
        { role: "user", content: userContent },
        { role: "assistant", content: repairDraft },
        { role: "user", content: getStage1RepairUserPrompt() },
      ];
    }
    return [...history, { role: "user", content: userContent }];
  }

  const prior = priorReasoning?.trim()
    ? [
        THINKING_CONTEXT_START,
        PRIVATE_NOTES_HEADER,
        // Preserve the draft delimiters produced by buildStage2PriorReasoning.
        // Cleaning the whole value here would erase the provenance boundary.
        priorReasoning.trim().slice(0, 12_000),
        THINKING_CONTEXT_END,
      ].join("\n")
    : "";
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
