/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

/**
 * Thinking mode ON (two-stage, client-driven):
 * 1. Reasoning — plain-text notes from the model; app stores them in `Message.thinkingText`.
 * 2. Answer — normal reply in `Message.content`.
 *
 * Thinking mode OFF: single request, answer only in `content`.
 *
 * Legacy chats may still store one string with <thinking> tags; use parseLegacyThinkingContent.
 */

export type ThinkingStage = "thinking" | "final";

export const THINKING_OPEN_TAG = "<thinking>";
export const THINKING_CLOSE_TAG = "</thinking>";

const PROMPT_LEAKAGE_PATTERNS: RegExp[] = [
  /\[CRITICAL SYSTEM OVERRIDE.*?\]/gi,
  /NUCLEAR REASONING LOCK/gi,
  /STAGE \d+ \(thinking-only\)/gi,
  /STAGE \d+ \(final-only\)/gi,
  /When you respond, your first characters MUST be <thinking>\.?/gi,
];

const META_THINKING_PATTERNS: RegExp[] = [
  /\bprivate reasoning\b/i,
  /\bprivate reasoning module\b/i,
  /\buser-facing reply\b/i,
  /\bnot shown to the user\b/i,
  /\bthe question asks\b/i,
  /\bposing as a question\b/i,
  /\breasoning step\b/i,
  /\bdoes not require\b/i,
  /\bwhat the user wants\b/i,
  /\bprocess and respond\b/i,
  /\bneed to understand what the user\b/i,
  /\bfigure out how to process\b/i,
  /\bthese instructions\b/i,
  /\bthis is (a|an) (instruction|meta)/i,
];

const RIGID_THINKING_LABEL = /^\s*(-\s*)?(Task|Unknowns|Self-check|Plan)\s*:/im;

const CLOSING_THINKING_REGEX =
  /<\/thinking>|<\/thought>|<\/reasoning>|<\/\|thinking\|>/i;
const OPEN_THINKING_REGEX =
  /<thinking>|<thought>|<reasoning>|<begin_of_thinking>|<\|thinking\|>|\[THOUGHT\]/i;

export function composeSystemPromptForThinkingStage(
  fullAssistantSystemPrompt: string,
  stage: ThinkingStage,
): string {
  if (stage === "thinking") {
    return buildThinkingSystemAddon("thinking");
  }
  return `${fullAssistantSystemPrompt}\n\n${buildThinkingSystemAddon("final")}`;
}

export function briefThinkingNoteFromUserMessage(userMessage: string): string {
  const q = userMessage.trim().toLowerCase();
  if (!q) return "Analyzing the question.";
  if (/^(hi|hey|hello|yo)\b/.test(q))
    return "Casual greeting — keep the reply brief.";
  if (/who are you|what are you|your name/.test(q)) {
    return "They want to know who I am — answer plainly.";
  }
  if (q.length <= 48) return `Topic: ${userMessage.trim()}`;
  return `Topic: ${userMessage.trim().slice(0, 45)}…`;
}

export function buildThinkingSystemAddon(stage: ThinkingStage): string {
  if (stage === "thinking") {
    return [
      "Write 2–4 short sentences of notes about the user's message (topic, facts to use, how you'll answer).",
      "Write like margin notes about the subject — never about prompts, steps, hidden text, or 'the question asks…'.",
      "No greeting, no final answer, no XML/tags.",
      'Example for "what is AI": AI = systems that learn from data; I\'ll define it simply then give examples.',
    ].join("\n");
  }

  return [
    "Write the final answer for the user.",
    "Do not repeat your notes verbatim.",
    "Match depth to the question; keep greetings short.",
    "Mention AiBoT or Suryanshu Nabheet only when they ask about identity or the platform.",
  ].join("\n");
}

export function getStage2ContinuationUserPrompt(): string {
  return "Provide your final answer to the user now.";
}

export function stripPromptLeakage(text: string): string {
  let out = text;
  for (const pattern of PROMPT_LEAKAGE_PATTERNS) {
    out = out.replace(pattern, "").trim();
  }
  return out;
}

export function looksLikeMetaProcessThinking(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return META_THINKING_PATTERNS.some((p) => p.test(t));
}

export function polishThinkingDisplayContent(
  raw: string,
  options?: { userMessageHint?: string },
): string {
  let t = stripPromptLeakage(raw.trim());
  if (!t) return t;

  if (looksLikeMetaProcessThinking(t)) {
    const hint = options?.userMessageHint?.trim();
    return hint
      ? briefThinkingNoteFromUserMessage(hint)
      : "Analyzing the question.";
  }

  if (RIGID_THINKING_LABEL.test(t)) {
    t = t
      .replace(/^\s*(-\s*)?(Task|Unknowns|Self-check|Plan)\s*:\s*/gim, "")
      .replace(/\n{2,}/g, " ")
      .trim();
    if (t.length > 480) t = `${t.slice(0, 477).trim()}…`;
  }

  return t;
}

export function wrapThinkingInner(inner: string): string {
  const body = inner.trim();
  return `${THINKING_OPEN_TAG}\n${body}\n${THINKING_CLOSE_TAG}`;
}

export function extractThinkingInner(wrappedOrPlain: string): string {
  const text = wrappedOrPlain.trim();
  const match = text.match(
    new RegExp(
      `${THINKING_OPEN_TAG}\\s*([\\s\\S]*?)\\s*${THINKING_CLOSE_TAG}`,
      "i",
    ),
  );
  if (match?.[1]) return match[1].trim();
  return text
    .replace(OPEN_THINKING_REGEX, "")
    .replace(CLOSING_THINKING_REGEX, "")
    .trim();
}

export function normalizeThinkingStage1Output(
  raw: string,
  options?: { userMessageHint?: string },
): string {
  const stripped = stripPromptLeakage(raw.trim());
  let inner = stripped ? extractThinkingInner(stripped) : "";

  inner = polishThinkingDisplayContent(inner, {
    userMessageHint: options?.userMessageHint,
  });

  if (!inner.trim()) {
    const hint = options?.userMessageHint?.trim();
    inner = hint
      ? briefThinkingNoteFromUserMessage(hint)
      : "Analyzing the question.";
  }

  return wrapThinkingInner(inner);
}

export function assembleThinkingAndAnswer(
  thinkingWrapped: string,
  answer: string,
): string {
  const think = thinkingWrapped.trim();
  const body = answer.trim();
  if (!think) return body;
  if (!body) return `${think}\n\n`;
  return `${think}\n\n${body}`;
}

export function isSubstantiveThinkingContent(text: string): boolean {
  const cleaned = text
    .replace(OPEN_THINKING_REGEX, "")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .trim();
  if (!cleaned) return false;
  if (/^\.{1,8}$/.test(cleaned)) return false;
  return cleaned.length >= 8;
}

export type ParsedThinkingContent = {
  thinkingContent: string;
  mainResponse: string;
  hasClosingThinkingTag: boolean;
};

/** Legacy single-string messages that embed <thinking> tags in content. */
export function parseLegacyThinkingContent(
  rawContent: string,
  options?: { userMessageHint?: string },
): ParsedThinkingContent {
  const hasClosingThinkingTag = CLOSING_THINKING_REGEX.test(rawContent);
  const hasOpen = OPEN_THINKING_REGEX.test(rawContent);

  if (!hasOpen) {
    return {
      thinkingContent: "",
      mainResponse: stripPromptLeakage(rawContent),
      hasClosingThinkingTag: false,
    };
  }

  const closeMatch = rawContent.match(CLOSING_THINKING_REGEX);
  if (!closeMatch) {
    const inner = rawContent.split(OPEN_THINKING_REGEX)[1]?.trim() ?? "";
    return {
      thinkingContent: polishThinkingDisplayContent(inner, options),
      mainResponse: "",
      hasClosingThinkingTag: false,
    };
  }

  const parts = rawContent.split(closeMatch[0]);
  const thinkingContent = polishThinkingDisplayContent(
    (parts[0] ?? "").replace(OPEN_THINKING_REGEX, "").trim(),
    options,
  );
  const mainResponse = stripPromptLeakage(
    parts
      .slice(1)
      .join(closeMatch[0])
      .replace(/<\/?[^>]+(>|$)/g, "")
      .trim(),
  );

  return {
    thinkingContent,
    mainResponse,
    hasClosingThinkingTag,
  };
}

export function buildChatMessagesForThinkingStage(params: {
  history: { role: string; content: string }[];
  userContent: string;
  stage: ThinkingStage;
  priorReasoning?: string;
}): { role: string; content: string }[] {
  const { history, userContent, stage, priorReasoning } = params;
  const prior = priorReasoning?.trim();

  if (stage === "thinking") {
    return [...history, { role: "user", content: userContent }];
  }

  if (prior) {
    const wrapped = prior.includes(THINKING_OPEN_TAG)
      ? prior
      : normalizeThinkingStage1Output(prior);
    return [
      ...history,
      { role: "user", content: userContent },
      { role: "assistant", content: wrapped },
      { role: "user", content: getStage2ContinuationUserPrompt() },
    ];
  }

  return [...history, { role: "user", content: userContent }];
}
