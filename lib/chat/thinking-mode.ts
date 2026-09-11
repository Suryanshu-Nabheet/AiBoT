/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

/**
 * Thinking orchestration:
 * - Stage 1 (thinking): private bullets only — task, unknowns, self-checks, plan.
 * - Stage 2 (final): user-facing answer (Ollama + optional API two-stage).
 * - Combined: one stream for cloud/arena (thinking tags + answer).
 */

export type ThinkingStage = "thinking" | "final" | "combined";

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
  /\[Deep reasoning[^\]]*\]/gi,
];

const THINKING_BULLET_TEMPLATE = [
  "- Task: (what the user wants, in your own words)",
  "- Unknowns: (what is missing or ambiguous)",
  "- Self-check: (1–2 questions you must answer before replying)",
  "- Plan: (steps for the final answer; no draft wording)",
].join("\n");

/** Stage 1 uses a minimal system prompt so small models do not paste marketing copy into thinking. */
export function composeSystemPromptForThinkingStage(
  fullAssistantSystemPrompt: string,
  stage: ThinkingStage,
): string {
  if (stage === "thinking") {
    return [
      "You are a private reasoning module. The user must NEVER see this output.",
      "Follow the output contract exactly.",
      "",
      buildThinkingSystemAddon("thinking"),
    ].join("\n");
  }
  return `${fullAssistantSystemPrompt}\n\n${buildThinkingSystemAddon(stage)}`;
}

export function buildThinkingSystemAddon(stage: ThinkingStage): string {
  if (stage === "combined") {
    return [
      "## Deep reasoning (single stream)",
      "",
      "Output contract:",
      `1. Start with ${THINKING_OPEN_TAG} (no preamble).`,
      `2. Inside the tags: bullet-only private reasoning (see template).`,
      `3. After ${THINKING_CLOSE_TAG}: the complete user-facing answer only.`,
      "",
      "Thinking template (mandatory shape):",
      THINKING_BULLET_TEMPLATE,
      "",
      "Rules:",
      "- Thinking is NOT the answer — no greetings, no paragraphs to the user, no AiBoT marketing.",
      '- Example "hi": <thinking>\\n- Task: greet\\n- Plan: one friendly line\\n</thinking>\\nHello! How can I help?',
      "",
      "Accuracy: do not invent facts; mark uncertainty inside thinking bullets.",
    ].join("\n");
  }

  if (stage === "thinking") {
    return [
      "## Stage 1 — private reasoning only",
      "",
      "Output contract:",
      `1. Reply MUST be only ${THINKING_OPEN_TAG}...${THINKING_CLOSE_TAG}.`,
      `2. After ${THINKING_CLOSE_TAG} output nothing.`,
      "",
      "Thinking template (mandatory — short bullets, not prose):",
      THINKING_BULLET_TEMPLATE,
      "",
      "Forbidden inside thinking:",
      "- Any sentence you would send to the user (greetings, apologies, full answers).",
      "- Platform marketing or 'I am an AI assistant…' identity scripts.",
      "- Repeating stage 2 wording; only plan and checks.",
      "",
      "Accuracy: separate facts vs assumptions in bullets; note what you still need to verify.",
    ].join("\n");
  }

  return [
    "## Stage 2 — user-facing answer",
    "",
    "Output contract:",
    `- No ${THINKING_OPEN_TAG} or reasoning tags.`,
    "- Answer the user's latest message directly; do not recap the reasoning trace.",
    "- Match depth to the question (one line for hi; detail when they ask for detail).",
    "- Mention AiBoT or Suryanshu Nabheet only when the user asks about identity or the platform.",
    "",
    "Accuracy: no fabricated citations; say when information is uncertain.",
  ].join("\n");
}

export function getThinkingModeUserSuffix(stage: ThinkingStage): string {
  if (stage === "combined") {
    return `\n\n[Reasoning mode] Use thinking bullets then your answer in one message.`;
  }
  if (stage === "thinking") {
    return `\n\n[Reasoning mode — stage 1] Bullets only inside ${THINKING_OPEN_TAG}...${THINKING_CLOSE_TAG}.`;
  }
  return `\n\n[Reasoning mode — stage 2] Final answer only.`;
}

export function getStage2ContinuationUserPrompt(): string {
  return [
    "Write the final answer for the user now.",
    "",
    "Rules:",
    "- Do not repeat the reasoning bullets or paste the stage-1 trace.",
    "- Do not open with a platform pitch unless they asked who you are.",
    "- Use markdown when it helps (lists, code blocks).",
  ].join("\n");
}

export function stripPromptLeakage(text: string): string {
  let out = text;
  for (const pattern of PROMPT_LEAKAGE_PATTERNS) {
    out = out.replace(pattern, "").trim();
  }
  return out;
}

export function looksLikeUserFacingProse(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (
    /\b(I am an AI|I'm an AI|How can I assist|How can I help you today|Let me know how I can help)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  if (/\bintegrated within the AiBoT platform\b/i.test(t)) return true;
  if (/^(hello|hi|hey)[!,.]?\s/i.test(t) && t.length > 35) return true;
  const sentences = t.split(/[.!?]+/).filter((s) => s.trim().length > 8);
  const firstPerson = sentences.filter((s) => /^\s*I\b/i.test(s)).length;
  return firstPerson >= 2 && t.length > 70;
}

/** Replace draft answers smuggled into the thinking panel with a short plan stub. */
export function polishThinkingDisplayContent(raw: string): string {
  const t = stripPromptLeakage(raw.trim());
  if (!t) return t;
  if (!looksLikeUserFacingProse(t)) return t;
  return [
    "- Task: interpret the user's message",
    "- Self-check: what do they actually need?",
    "- Plan: reply concisely in stage 2 (no identity script unless asked)",
  ].join("\n");
}

function wordJaccardSimilarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2),
    );
  const A = tokenize(a);
  const B = tokenize(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  const union = A.size + B.size - inter;
  return inter / union;
}

export function repairDuplicateThinkingAndAnswer(parts: {
  thinkingContent: string;
  mainResponse: string;
  hasClosingThinkingTag: boolean;
}): { thinkingContent: string; mainResponse: string } {
  const { thinkingContent, mainResponse, hasClosingThinkingTag } = parts;
  if (!hasClosingThinkingTag) return { thinkingContent, mainResponse };
  const think = thinkingContent.trim();
  const main = mainResponse.trim();
  if (!think || !main || think.length < 40 || main.length < 40) {
    return { thinkingContent, mainResponse };
  }
  if (wordJaccardSimilarity(think, main) < 0.42) {
    return { thinkingContent, mainResponse };
  }
  const betterMain = main.length >= think.length ? main : think;
  return {
    thinkingContent: polishThinkingDisplayContent(
      "- Task: answered above\n- Note: reasoning overlapped the reply; showing plan only.",
    ),
    mainResponse: betterMain,
  };
}

const PLATFORM_ANSWER_BOILERPLATE =
  /\bthe aibot platform is\b|\baibot platform is a\b|\bleverage(s)? advanced ai\b/i;
const CONVERSATIONAL_ANSWER =
  /\b(how can i help|what would you like|hello!|hi there|hey there)\b/i;

export function repairSwappedThinkingAnswer(parts: {
  thinkingContent: string;
  mainResponse: string;
  hasClosingThinkingTag: boolean;
}): { thinkingContent: string; mainResponse: string } {
  const { thinkingContent, mainResponse, hasClosingThinkingTag } = parts;
  if (!hasClosingThinkingTag) {
    return { thinkingContent, mainResponse };
  }
  const think = thinkingContent.trim();
  const main = mainResponse.trim();
  if (!think || !main) return { thinkingContent, mainResponse };

  const mainLooksLikeBoilerplate =
    PLATFORM_ANSWER_BOILERPLATE.test(main) ||
    (main.length > 60 && /\baibot\b/i.test(main) && !/\baibot\b/i.test(think));
  const thinkLooksLikeReply =
    CONVERSATIONAL_ANSWER.test(think) || looksLikeUserFacingProse(think);

  if (mainLooksLikeBoilerplate && thinkLooksLikeReply) {
    return {
      thinkingContent: think,
      mainResponse: think,
    };
  }
  return { thinkingContent, mainResponse };
}

export function normalizeThinkingStage1Output(raw: string): string {
  let text = stripPromptLeakage(raw.trim());
  if (!text) {
    return `${THINKING_OPEN_TAG}\n- Task: (missing)\n- Plan: respond carefully\n${THINKING_CLOSE_TAG}`;
  }

  const openMatch = text.match(
    /<thinking>|<thought>|<reasoning>|<begin_of_thinking>|<\|thinking\|>|\[THOUGHT\]/i,
  );
  const closeMatch = text.match(
    /<\/thinking>|<\/thought>|<\/reasoning>|<\/\|thinking\|>/i,
  );

  let inner = text;
  if (!openMatch) {
    inner = text;
  } else {
    const openTag = openMatch[0];
    const afterOpen = text.split(openTag)[1] ?? "";
    inner = closeMatch
      ? (afterOpen.split(closeMatch[0])[0] ?? afterOpen)
      : afterOpen;
  }

  inner = polishThinkingDisplayContent(inner.trim());
  return `${THINKING_OPEN_TAG}\n${inner}\n${THINKING_CLOSE_TAG}`;
}

export type ParsedThinkingContent = {
  thinkingContent: string;
  mainResponse: string;
  hasThinkingTag: boolean;
  hasClosingThinkingTag: boolean;
  hideAnswerPanel: boolean;
};

const TRANSITION_REGEX =
  /<\/thinking>|<\/thought>|<\/reasoning>|<final_response>|<\/\|thinking\|>|\[ANSWER\]|【Answer】|---ANSWER---/i;
const GENERIC_CLOSE_REGEX = /<\/[a-zA-Z0-9_|]+>|<final_[a-zA-Z0-9_]+>/i;
const CLOSING_THINKING_REGEX =
  /<\/thinking>|<\/thought>|<\/reasoning>|<\/\|thinking\|>/i;
const OPEN_THINKING_REGEX =
  /<thinking>|<thought>|<reasoning>|<begin_of_thinking>|<\|thinking\|>|\[THOUGHT\]/i;

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

  const hasOpenThinking = OPEN_THINKING_REGEX.test(rawContent);
  const transitionMatch =
    rawContent.match(TRANSITION_REGEX) ||
    (hasOpenThinking ? rawContent.match(GENERIC_CLOSE_REGEX) : null);

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

  let repaired = repairSwappedThinkingAnswer({
    thinkingContent,
    mainResponse,
    hasClosingThinkingTag,
  });
  repaired = repairDuplicateThinkingAndAnswer({
    ...repaired,
    hasClosingThinkingTag,
  });
  thinkingContent = polishThinkingDisplayContent(repaired.thinkingContent);
  mainResponse = repaired.mainResponse;

  const hideAnswerPanel =
    !!options?.isThinkingRequested &&
    (!hasClosingThinkingTag || !mainResponse.trim());

  return {
    thinkingContent,
    mainResponse,
    hasThinkingTag,
    hasClosingThinkingTag,
    hideAnswerPanel,
  };
}

export function isSubstantiveThinkingContent(text: string): boolean {
  const cleaned = text
    .replace(OPEN_THINKING_REGEX, "")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .trim();
  if (!cleaned) return false;
  if (/^\.{1,8}$/.test(cleaned)) return false;
  if (cleaned === "…" || cleaned === "...") return false;
  return cleaned.length >= 8;
}

export function buildChatMessagesForThinkingStage(params: {
  history: { role: string; content: string }[];
  userContent: string;
  stage: ThinkingStage;
  priorReasoning?: string;
}): { role: string; content: string }[] {
  const { history, userContent, stage, priorReasoning } = params;
  const prior = priorReasoning?.trim();

  if (stage === "thinking" || stage === "combined") {
    return [
      ...history,
      {
        role: "user",
        content: `${userContent}${getThinkingModeUserSuffix(stage)}`,
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
