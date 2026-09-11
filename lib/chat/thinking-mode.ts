/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

/**
 * Production two-stage "deep thinking" orchestration.
 *
 * Stage 1 (thinking): model emits reasoning inside <thinking>...</thinking> only.
 * Stage 2 (final): model produces the user-facing answer, grounded on stage 1.
 */

export type ThinkingStage = "thinking" | "final";

export const THINKING_OPEN_TAG = "<thinking>";
export const THINKING_CLOSE_TAG = "</thinking>";

const PROMPT_LEAKAGE_PATTERNS: RegExp[] = [
  /\[CRITICAL SYSTEM OVERRIDE.*?\]/gi,
  /NUCLEAR REASONING LOCK/gi,
  /FAILURE TO COMPLY.*?DO NOT IGNORE THIS\.?/gi,
  /\[MANDATORY: START WITH.*?\]/gi,
  /STAGE \d+ \(thinking-only\)/gi,
  /STAGE \d+ \(final-only\)/gi,
  /IMPORTANT: This is STAGE \d+/gi,
  /IMPORTANT: STAGE \d+/gi,
  /When you respond, your first characters MUST be <thinking>\.?/gi,
  /All reasoning MUST be inside <thinking>\.\.\.<\/thinking>\.?/gi,
  /After <\/thinking>, provide the final answer[^\n]*/gi,
  /After <\/thinking>, output NOTHING[^\n]*/gi,
  /Do NOT output any <thinking>.*?tags\.?/gi,
];

/** System-prompt extension for each thinking stage (no hostile / "nuclear" wording). */
export function buildThinkingSystemAddon(stage: ThinkingStage): string {
  if (stage === "thinking") {
    return [
      "## Deep reasoning (stage 1 of 2)",
      "You are in the reasoning-only phase. Think carefully before the user sees an answer.",
      "",
      "Output contract:",
      `1. The first characters of your reply MUST be ${THINKING_OPEN_TAG} (no preamble).`,
      `2. Put all analysis, plans, checks, and intermediate conclusions inside ${THINKING_OPEN_TAG}...${THINKING_CLOSE_TAG}.`,
      `3. After ${THINKING_CLOSE_TAG}, output nothing—no final answer and no extra text.`,
      "",
      "Quality bar:",
      "- Restate the user's goal and constraints.",
      "- Note unknowns and state explicit assumptions.",
      "- For non-trivial tasks, compare approaches briefly, then commit to one.",
      "- For math/code, sanity-check before closing the thinking block.",
      "",
      "Accuracy (mandatory):",
      "- Do not invent facts, statistics, quotes, URLs, paper titles, or product names.",
      '- If you are unsure, write "uncertain" and what evidence would resolve it.',
      "- Separate verified facts from hypotheses inside the thinking block.",
    ].join("\n");
  }

  return [
    "## Deep reasoning (stage 2 of 2)",
    "You are in the final-answer phase.",
    "",
    "Output contract:",
    `1. Do NOT use ${THINKING_OPEN_TAG}, ${THINKING_CLOSE_TAG}, <thought>, or <reasoning> tags.`,
    "2. Deliver the complete user-facing answer only.",
    "3. Be accurate, well-structured, and appropriately detailed.",
    "",
    "Accuracy (mandatory):",
    "- Only include claims that follow from the prior reasoning or the user's message.",
    "- If information is missing, say what is unknown instead of guessing.",
    "- Never fabricate citations, links, or sources. Prefer precise, hedged language when needed.",
  ].join("\n");
}

/** Short user-message suffix (stage 1) — complements the system addon. */
export function getThinkingModeUserSuffix(stage: ThinkingStage): string {
  if (stage === "thinking") {
    return [
      "",
      "[Deep reasoning — stage 1]",
      `Respond with ${THINKING_OPEN_TAG}...${THINKING_CLOSE_TAG} only.`,
    ].join("\n");
  }

  return [
    "",
    "[Deep reasoning — stage 2]",
    "Provide the final answer only (no thinking tags).",
  ].join("\n");
}

/** User turn after stage-1 assistant reasoning is in context. */
export function getStage2ContinuationUserPrompt(): string {
  return [
    "Using the reasoning in your previous assistant message, write the final answer for the user now.",
    "",
    "Rules:",
    `- Do not include ${THINKING_OPEN_TAG} or repeat the full reasoning trace.`,
    "- You may use at most one short bridging sentence if it improves clarity.",
    "- Use markdown formatting suited to the question (lists, headings, code blocks when needed).",
  ].join("\n");
}

export function stripPromptLeakage(text: string): string {
  let out = text;
  for (const pattern of PROMPT_LEAKAGE_PATTERNS) {
    out = out.replace(pattern, "").trim();
  }
  return out;
}

/**
 * Ensures stage-1 output is a single well-formed thinking block (drops leaked answer tail).
 */
export function normalizeThinkingStage1Output(raw: string): string {
  let text = stripPromptLeakage(raw.trim());
  if (!text) {
    return `${THINKING_OPEN_TAG}\n(No structured reasoning was returned.)\n${THINKING_CLOSE_TAG}`;
  }

  const openMatch = text.match(
    /<thinking>|<thought>|<reasoning>|<begin_of_thinking>|<\|thinking\|>|\[THOUGHT\]/i,
  );
  const closeMatch = text.match(
    /<\/thinking>|<\/thought>|<\/reasoning>|<\/\|thinking\|>/i,
  );

  if (!openMatch) {
    text = `${THINKING_OPEN_TAG}\n${text}\n${THINKING_CLOSE_TAG}`;
  } else {
    const openTag = openMatch[0];
    const normalizedOpen =
      openTag.toLowerCase() === "<thinking>" ? THINKING_OPEN_TAG : openTag;
    if (openTag !== normalizedOpen && text.startsWith(openTag)) {
      text = normalizedOpen + text.slice(openTag.length);
    }
    if (!closeMatch) {
      text = `${text}\n${THINKING_CLOSE_TAG}`;
    }
  }

  const closeIdx = text.search(/<\/thinking>/i);
  if (closeIdx !== -1) {
    text = text.slice(0, closeIdx + THINKING_CLOSE_TAG.length);
  }

  return text.trim();
}

export type ParsedThinkingContent = {
  thinkingContent: string;
  mainResponse: string;
  hasThinkingTag: boolean;
  hasClosingThinkingTag: boolean;
  /** Stage-1-only stream: hide answer panel until stage 2 arrives */
  hideAnswerPanel: boolean;
};

const TRANSITION_REGEX =
  /<\/thinking>|<\/thought>|<\/reasoning>|<final_response>|<\/\|thinking\|>|\[ANSWER\]|【Answer】|---ANSWER---/i;
const GENERIC_CLOSE_REGEX = /<\/[a-zA-Z0-9_|]+>|<final_[a-zA-Z0-9_]+>/i;
const CLOSING_THINKING_REGEX =
  /<\/thinking>|<\/thought>|<\/reasoning>|<\/\|thinking\|>/i;
const OPEN_THINKING_REGEX =
  /<thinking>|<thought>|<reasoning>|<begin_of_thinking>|<\|thinking\|>|\[THOUGHT\]/i;

/** Shared parser for chat UI (streaming-safe). */
export function parseAssistantThinkingContent(
  rawContent: string,
  options?: { isThinkingRequested?: boolean; isUser?: boolean },
): ParsedThinkingContent {
  const isUser = options?.isUser ?? false;
  if (isUser) {
    return {
      thinkingContent: "",
      mainResponse: rawContent,
      hasThinkingTag: false,
      hasClosingThinkingTag: false,
      hideAnswerPanel: false,
    };
  }

  let thinkingContent = "";
  let mainResponse = rawContent;
  let hasThinkingTag = false;
  const hasClosingThinkingTag = CLOSING_THINKING_REGEX.test(rawContent);

  const transitionMatch =
    rawContent.match(TRANSITION_REGEX) || rawContent.match(GENERIC_CLOSE_REGEX);

  if (transitionMatch) {
    hasThinkingTag = true;
    const splitMarker = transitionMatch[0];
    const parts = rawContent.split(splitMarker);
    thinkingContent = parts[0].replace(OPEN_THINKING_REGEX, "").trim();
    mainResponse = parts
      .slice(1)
      .join(splitMarker)
      .replace(/<\/?[^>]+(>|$)/g, "")
      .trim();
  } else {
    const openMatch = rawContent.match(OPEN_THINKING_REGEX);
    if (openMatch) {
      hasThinkingTag = true;
      thinkingContent = rawContent.split(openMatch[0])[1]?.trim() || "";
      mainResponse = "";
    }
  }

  thinkingContent = stripPromptLeakage(thinkingContent);
  mainResponse = stripPromptLeakage(mainResponse);

  const hideAnswerPanel =
    !!options?.isThinkingRequested && !mainResponse.trim();

  return {
    thinkingContent,
    mainResponse,
    hasThinkingTag,
    hasClosingThinkingTag,
    hideAnswerPanel,
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
    return [
      ...history,
      {
        role: "user",
        content: `${userContent}${getThinkingModeUserSuffix("thinking")}`,
      },
    ];
  }

  if (prior) {
    return [
      ...history,
      { role: "user", content: userContent },
      { role: "assistant", content: normalizeThinkingStage1Output(prior) },
      { role: "user", content: getStage2ContinuationUserPrompt() },
    ];
  }

  return [
    ...history,
    {
      role: "user",
      content: `${userContent}${getThinkingModeUserSuffix("final")}`,
    },
  ];
}
