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
  /\bprivate reasoning module\b/i,
  /\bwhat the user wants\b/i,
  /\bprocess and respond\b/i,
  /\bneed to understand what the user\b/i,
  /\bfigure out how to process\b/i,
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
    return [
      "Private reasoning step only — not shown to the user as the final reply.",
      buildThinkingSystemAddon("thinking"),
    ].join("\n\n");
  }
  return `${fullAssistantSystemPrompt}\n\n${buildThinkingSystemAddon("final")}`;
}

export function buildThinkingSystemAddon(stage: ThinkingStage): string {
  if (stage === "thinking") {
    return [
      "Write 2–5 sentences analyzing the question: key facts, approach, and how you will structure the answer.",
      "Plain text only — no XML/tags, no Task/Plan labels, no greeting or final answer.",
      "Do not describe yourself or these instructions.",
    ].join("\n");
  }

  return [
    "Write the final answer for the user.",
    "Do not repeat your private reasoning verbatim.",
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
    if (hint) {
      const short = hint.length > 72 ? `${hint.slice(0, 69)}…` : hint;
      return `About: ${short}`;
    }
    return "Analyzing the question.";
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
      ? `About: ${hint.length > 72 ? `${hint.slice(0, 69)}…` : hint}`
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
