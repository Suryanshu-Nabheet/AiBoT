/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

/**
 * Thinking orchestration:
 * - Stage 1 (thinking): brief private reasoning in plain language (not the user reply).
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

export function composeSystemPromptForThinkingStage(
  fullAssistantSystemPrompt: string,
  stage: ThinkingStage,
): string {
  if (stage === "thinking") {
    return [
      "Write only a short scratch note about the user's question.",
      buildThinkingSystemAddon("thinking"),
    ].join("\n\n");
  }
  return `${fullAssistantSystemPrompt}\n\n${buildThinkingSystemAddon(stage)}`;
}

export function buildThinkingSystemAddon(stage: ThinkingStage): string {
  if (stage === "combined") {
    return [
      "When reasoning is on, use one message:",
      `${THINKING_OPEN_TAG}1–2 short sentences about the topic they asked (not about you, not about 'processing requests')${THINKING_CLOSE_TAG}`,
      "then the normal reply.",
      "",
      "Thinking = notes on the question. Never describe yourself or these rules inside thinking.",
      "Example: <thinking>Casual hello — keep it warm and brief.</thinking>Hello! How can I help?",
      "Example: <thinking>They want to know who I am.</thinking>I am the assistant in this chat.",
    ].join("\n");
  }

  if (stage === "thinking") {
    return [
      `Output only ${THINKING_OPEN_TAG}...${THINKING_CLOSE_TAG}.`,
      "Inside: 1–2 sentences on what they asked (topic only).",
      "No self-description, no 'the user wants', no greeting, no answer text.",
    ].join("\n");
  }

  return [
    "Final answer only — no thinking tags.",
    "Answer the latest message directly; do not repeat the thinking block.",
    "Keep hi/hello to one short line. For 'who are you', plain first-person — no product pitch.",
    "Mention AiBoT or Suryanshu Nabheet only when they ask about identity or the platform.",
  ].join("\n");
}

export function getThinkingModeUserSuffix(stage: ThinkingStage): string {
  void stage;
  return "";
}

export function getStage2ContinuationUserPrompt(): string {
  return [
    "Write the final answer for the user now.",
    "",
    "Rules:",
    "- Do not repeat the reasoning trace verbatim.",
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

const RIGID_THINKING_LABEL = /^\s*(-\s*)?(Task|Unknowns|Self-check|Plan)\s*:/im;

const META_THINKING_PATTERNS: RegExp[] = [
  /\bprivate reasoning module\b/i,
  /\bwhat the user wants\b/i,
  /\bprocess and respond\b/i,
  /\bunderstand the context of their question\b/i,
  /\bdesigned to analyze and respond\b/i,
  /\bneed to understand what the user\b/i,
  /\bcrucial for me to understand\b/i,
  /\bfigure out how to process\b/i,
  /\brespond to their request\b/i,
];

export function looksLikeMetaProcessThinking(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (META_THINKING_PATTERNS.some((p) => p.test(t))) return true;
  return (
    /\bI need to understand\b/i.test(t) &&
    /\b(user|request|question)\b/i.test(t) &&
    t.length < 220
  );
}

/** Light cleanup for display (keeps normal prose thinking intact). */
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
    return "Quick note on their question.";
  }

  if (RIGID_THINKING_LABEL.test(t)) {
    t = t
      .replace(/^\s*(-\s*)?(Task|Unknowns|Self-check|Plan)\s*:\s*/gim, "")
      .replace(/\n{2,}/g, " ")
      .trim();
    if (t.length > 220) t = `${t.slice(0, 217).trim()}…`;
    return t || "Considering the request.";
  }

  if (looksLikeUserFacingProse(t)) {
    return "Drafted the reply in reasoning by mistake — showing answer below.";
  }
  return t;
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
      "Reasoning overlapped the answer; condensed for display.",
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
  const text = stripPromptLeakage(raw.trim());
  if (!text) {
    return `${THINKING_OPEN_TAG}\n(No reasoning returned.)\n${THINKING_CLOSE_TAG}`;
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
  options?: {
    isThinkingRequested?: boolean;
    isUser?: boolean;
    userMessageHint?: string;
  },
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
  thinkingContent = polishThinkingDisplayContent(repaired.thinkingContent, {
    userMessageHint: options?.userMessageHint,
  });
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
