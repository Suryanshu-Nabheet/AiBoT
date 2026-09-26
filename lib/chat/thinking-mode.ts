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
  "High-level planning summary — use as guidance, do not copy into your answer:";

/**
 * Stage-1 role — stacked by buildChatSystemPrompt with platform + model identity.
 * Replaces Chat behavior so the model does not answer yet.
 */
export const THINKING_NOTES_ROLE = `## Thinking (internal — not the user reply)
You are in the **planning** phase only. Write **internal self-talk** that analyzes the user's request. The user will never see this text as your answer.

Follow this flow in 4–8 short sentences or numbered steps:
1. Restate what the user is asking (name the topic—e.g. "The user asked what WebRTC is").
2. Note constraints, ambiguity, or what you may need to assume.
3. List the sections or angles you will cover in the reply (definitions, how it works, components, examples, caveats)—by title only, not the facts themselves.
4. Stop before delivering definitions, conclusions, chosen options, code, markdown headings, or bullet lists meant for the user.

Example (planning only): "The user asked what WebRTC is. I should explain the problem it solves, the main browser APIs, how a peer connection is set up at a high level, and typical apps—without stating technical details here."

Rules:
- Use planning language ("The user asked…", "I should…", "I need to verify…").
- Do **not** greet the user, say "here is…", state the final answer, pick a number, define terms, or paste encyclopedia-style explanations.
- Do **not** invent specific facts during planning—only analyze the task.
- Return **only** this internal monologue.`;

/** Stage-2 addon — Chat role stays; this closes the loop after notes. */
export const THINKING_ANSWER_ADDON = `## Answer (user-facing)
You are in the **response** phase. Write the complete answer for the user now.

- Treat internal planning as a private checklist—do **not** quote, paraphrase, or mention it.
- Put all facts, numbers, code, definitions, and choices **here**, not in planning.
- Answer directly and naturally; verify claims; do not invent unsupported facts.`;

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

/** Stage-1 text that already contains answer payload (facts, picks, code). */
export function looksLikeAnswerLeakInNotes(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/```/.test(t)) return true;
  if (
    /\b(?:the answer is|here(?:'|’)s (?:the|my) answer|I (?:pick|choose|select|went with)\b|my (?:choice|pick) is)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  if (/\b(?:in conclusion|therefore|thus),?\s/i.test(t) && t.length > 100) {
    return true;
  }
  const sentences = t.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  if (sentences.length >= 3) {
    const planningish = sentences.filter((s) =>
      /^(?:I (?:should|need|will|must|plan to|'ll)|The user|The request|My (?:goal|plan)|First,?\s+I|Next,?\s+I)/i.test(
        s.trim(),
      ),
    ).length;
    if (planningish / sentences.length < 0.34) return true;
  }
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

/** No second thinking API call — repair caused visible flicker and duplicate work. */
export const MAX_THINKING_NOTE_RETRIES = 0;
/** One bounded answer rewrite for protocol leakage or an unusable coda. */
export const MAX_THINKING_ANSWER_RETRIES = 1;

/**
 * True when stage-1 text is usable as Thinking notes (not an answer dump).
 */
export function isValidThinkingNotes(text: string): boolean {
  const notes = cleanThinkingText(stripThinkingProtocol(text));
  if (notes.length < 8) return false;
  if (
    looksLikeFinalAnswer(notes) ||
    looksLikeUserDirectedReply(notes) ||
    looksLikeAnswerLeakInNotes(notes)
  ) {
    return false;
  }
  if (
    /(?:can(?:not|'t|’t)|cannot|won't|will not)\s+(?:provide|share|reveal|discuss)|(?:private|hidden|internal)\s+(?:planning|reasoning|chain[- ]of[- ]thought)|high[- ]level summary instead/i.test(
      notes,
    )
  ) {
    return false;
  }
  // Concise answer prose can otherwise pass as notes. Thinking summaries
  // must contain a first-person planning signal, not a third-person recap.
  if (
    !/\bI(?:'|’)?(?:ll| will| should| need to| can| plan to| want to| must)\b/i.test(
      notes,
    )
  ) {
    return false;
  }
  // Notes must describe a plan, not impersonate the final response.
  if (/\b(?:final answer|here(?:'|’)s the answer)\b/i.test(notes)) {
    return false;
  }
  return true;
}

/** Validators miss good plans with section lists; accept them without a repair pass. */
export function isGoodEnoughThinkingNotes(text: string): boolean {
  const notes = cleanThinkingText(stripThinkingProtocol(text));
  if (notes.length < 32) return false;
  if (looksLikeFinalAnswer(notes) || looksLikeUserDirectedReply(notes)) {
    return false;
  }
  if (
    !/\bI(?:'|’)?(?:ll| will| should| need to| must)\b/i.test(notes) &&
    !/\bthe user\b/i.test(notes)
  ) {
    return false;
  }
  if (looksLikeAnswerLeakInNotes(notes) && !/\bI should\b/i.test(notes)) {
    return false;
  }
  return true;
}

/** One bounded repair when stage 1 was not usable planning (including answer dumps). */
export function shouldRetryThinkingNotes(text: string): boolean {
  if (isValidThinkingNotes(text) || isGoodEnoughThinkingNotes(text)) {
    return false;
  }
  return MAX_THINKING_NOTE_RETRIES > 0;
}

/** Stage-2 body that is planning monologue, not a delivered answer. */
export function looksLikePlanningOnlyReply(text: string): boolean {
  const t = cleanThinkingText(text);
  if (!isValidThinkingNotes(t)) return false;
  if (looksLikeFinalAnswer(t)) return false;
  if (t.length > 360) return false;

  const sentences = t
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const planningOpener =
    /^(?:I (?:should|need|will|must|plan to|'ll)|The user|The request|My (?:goal|plan))/i;

  if (sentences.length <= 2) {
    return sentences.every((s) => planningOpener.test(s));
  }

  const expository = sentences.filter(
    (s) => s.length > 20 && !planningOpener.test(s),
  ).length;
  return expository === 0;
}

/**
 * Detect protocol leakage in the user-facing channel. This is deliberately
 * conservative: semantic correctness cannot be established with a regex, but
 * protocol/meta leakage can be repaired without hiding a legitimate answer.
 */
export function shouldRetryThinkingAnswer(text: string): boolean {
  const answer = text.trim();
  if (!answer) return true;
  if (looksLikePlanningOnlyReply(answer)) return true;
  return (
    /<\/?(?:thinking|aibot-[^>]+)>|private planning notes|planning context|untrusted draft|now give your full answer|do not mention planning/i.test(
      answer,
    ) ||
    /^(?:as an ai(?: chat)? assistant|i am an ai(?: chat)? assistant|my purpose is to|i am designed to|i'm designed to|i can provide assistance by)\b/i.test(
      answer,
    ) ||
    /\b(?:cutting-edge language models|respond to user inquiries accurately and efficiently)\b/i.test(
      answer,
    ) ||
    looksLikePlanningEcho(answer)
  );
}

/**
 * Very short social turns do not benefit from a multi-call planning loop.
 * Bypassing it prevents greetings from becoming retries, refusals, or model
 * identity dumps while preserving thinking mode for substantive requests.
 */
export function shouldSkipThinkingForQuery(query: string): boolean {
  const normalized = query
    .trim()
    .toLowerCase()
    .replace(/[.!?,。！？]+$/u, "")
    .trim();
  if (!normalized || normalized.length > 32) return false;
  return /^(?:hi|hello|hey|yo|hiya|good morning|good afternoon|good evening|thanks|thank you|bye|goodbye|how are you)$/i.test(
    normalized,
  );
}

/**
 * Skip planning only for a genuinely standalone social turn. Attachments and
 * caller-supplied instructions can carry substantive intent even when the
 * visible caption is just "hi".
 */
export function shouldSkipThinkingForTurn({
  query,
  hasAttachments,
  hasSystemInstruction,
}: {
  query: string;
  hasAttachments: boolean;
  hasSystemInstruction: boolean;
}): boolean {
  return (
    !hasAttachments &&
    !hasSystemInstruction &&
    shouldSkipThinkingForQuery(query)
  );
}

export function getStage1RepairUserPrompt(): string {
  return (
    "That output was a user-facing answer (or facts), not internal planning. " +
    "Rewrite as internal self-talk only: what the user wants, constraints, and how you will answer—" +
    "without stating the answer, picking a number, or defining terms. " +
    'Example: "The user asked me to pick a number. I should choose one and state it clearly in my reply—but I must not reveal the number here."'
  );
}

export function formatUserRequestForPlanning(userQuery: string): string {
  const q = userQuery.trim().replace(/\s+/g, " ");
  if (!q) return "the user's question";
  if (q.length <= 140) return `"${q}"`;
  return `"${q.slice(0, 137)}..."`;
}

function planningIntentFromUserQuery(userQuery: string): string | null {
  const q = userQuery.trim().toLowerCase();
  if (
    /\b(?:go\s+(?:even\s+)?(?:more\s+)?deep|deeper|in\s+depth|more\s+detail|elaborate|expand on)\b/.test(
      q,
    )
  ) {
    return `The user wants more depth on the current topic (${formatUserRequestForPlanning(userQuery)}). I should add technical detail, clearer structure, and concrete examples in the reply—not restate the shallow overview.`;
  }
  if (/\b(?:what is|what's|define|explain)\b/.test(q)) {
    return `The user asked ${formatUserRequestForPlanning(userQuery)}. I should cover definition, how it works, main components, and practical examples in the reply.`;
  }
  if (q.length > 48 || /\b(?:want you to|can you|please)\b/.test(q)) {
    return `The user said ${formatUserRequestForPlanning(userQuery)}. I should infer their goal, match depth to the request, and organize an accurate reply with clear sections.`;
  }
  return null;
}

/** Section titles from an early answer dump — used to build readable planning notes. */
export function extractOutlineLabelsFromDraft(draft: string): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  const push = (raw: string) => {
    const label = raw.trim();
    const key = label.toLowerCase();
    if (label.length < 2 || label.length > 80 || seen.has(key)) return;
    seen.add(key);
    labels.push(label);
  };

  for (const match of draft.matchAll(/^#{1,6}\s+(.+)$/gm)) {
    push(match[1] ?? "");
  }
  for (const line of draft.split("\n")) {
    const bold = line.match(/^\*\*([^*]{2,80})\*\*\s*$/);
    if (bold) push(bold[1] ?? "");
  }
  return labels.slice(0, 6);
}

/**
 * When stage 1 never produced valid notes, derive a topic-specific plan from the
 * user question and any outline visible in an early answer dump.
 */
export function synthesizePlanningNotesFromDump(
  dump: string,
  userQuery = "",
): string {
  const text = cleanThinkingText(dump);
  const ask = formatUserRequestForPlanning(userQuery);
  const intent = planningIntentFromUserQuery(userQuery);
  const outline = extractOutlineLabelsFromDraft(text);

  if (outline.length >= 2) {
    const lead = intent ?? `The user asked ${ask}.`;
    return `${lead} I should structure the reply around ${outline.join(", ")}, stay accurate, and keep the explanation practical.`;
  }
  if (outline.length === 1) {
    const lead = intent ?? `The user asked ${ask}.`;
    return `${lead} I should lead with "${outline[0]}", then cover how it works, key parts, and one real-world use case in the reply.`;
  }

  const heading = text.match(/^#{1,6}\s+(.+)$/m)?.[1]?.trim();
  if (heading && heading.length <= 100) {
    const lead = intent ?? `The user asked ${ask}.`;
    return `${lead} I should center the reply on ${heading}, with a clear definition, how it works, and examples.`;
  }

  if (intent) return intent;

  return `The user asked ${ask}. I should answer with a clear structure, verified facts, and depth matched to what they asked for—all in the final reply, not here.`;
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
export function finalizeStage1Attempts(
  attempts: string[],
  options?: { userQuery?: string },
): Stage1LoopResult {
  const cleaned = attempts.map((a) => cleanThinkingText(a)).filter(Boolean);
  const userQuery = options?.userQuery ?? "";

  for (let i = cleaned.length - 1; i >= 0; i--) {
    const notes = cleaned[i] ?? "";
    if (isValidThinkingNotes(notes) || isGoodEnoughThinkingNotes(notes)) {
      return { notes, answerDraft: "" };
    }
  }

  const dump = cleaned[cleaned.length - 1] ?? "";
  return {
    notes: synthesizePlanningNotesFromDump(dump, userQuery),
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

  // No answer channel — never promote valid planning notes as the user reply.
  if (!content && thinking) {
    if (draft) {
      return {
        thinkingText: isValidThinkingNotes(thinking)
          ? thinking
          : synthesizePlanningNotesFromDump(draft),
        content: draft,
      };
    }
    if (
      looksLikeFinalAnswer(thinking) ||
      looksLikeUserDirectedReply(thinking) ||
      looksLikeAnswerLeakInNotes(thinking)
    ) {
      return { thinkingText: "", content: thinking };
    }
    if (isValidThinkingNotes(thinking)) {
      return { thinkingText: thinking, content: "" };
    }
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
  if (isValidThinkingNotes(notes) || isGoodEnoughThinkingNotes(notes)) {
    return notes;
  }
  if (
    looksLikeFinalAnswer(notes) ||
    looksLikeUserDirectedReply(notes) ||
    looksLikeAnswerLeakInNotes(notes)
  ) {
    return "";
  }
  return notes;
}

/** Stable Thinking panel text after stage 1 (never blank when we can derive a plan). */
export function resolveThinkingPanelNotes(raw: string, userQuery = ""): string {
  const cleaned = cleanThinkingText(raw);
  const preview = thinkingPanelPreview(cleaned);
  if (preview) return preview;
  if (cleaned) {
    return synthesizePlanningNotesFromDump(cleaned, userQuery);
  }
  return synthesizePlanningNotesFromDump("", userQuery);
}

export function wrapThinkingForContext(notes: string): string {
  const inner = cleanThinkingText(notes);
  if (!inner) return "";
  return `${PRIVATE_NOTES_HEADER}\n${inner}`;
}

export function getStage2ContinuationUserPrompt(): string {
  return (
    "Write your complete user-facing answer now. Include every fact, number, definition, " +
    "and choice the user asked for. Do not mention planning, thinking, drafts, or this instruction."
  );
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
