/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import {
  THINKING_ANSWER_ADDON,
  THINKING_NOTES_ROLE,
  type ThinkingStage,
} from "@/lib/chat/thinking-mode";
import { localeReplyDirective, type Locale } from "@/lib/i18n";
import {
  composeSystemPromptWithIdentity,
  resolveModelLabel,
  type ModelRef,
} from "@/lib/prompts/identity";

export {
  composeSystemPromptWithIdentity,
  formatModelIdentityLine,
  resolveModelLabel,
  resolveProviderLabel,
  type ModelRef,
} from "@/lib/prompts/identity";

export {
  COACH_VOICE_ROLE,
  CODER_AGENT_ROLE,
  PROMPT_ENHANCE_ROLE,
  SUMMARIZER_AGENT_ROLE,
} from "@/lib/prompts/agents";

/**
 * Shared stack for every chat/agent call:
 * Platform → Active model → Role (chat / thinking notes / agent) → optional addons → locale
 */

/** AiBoT platform — attribution belongs here, not on the model identity line. */
export const AIBOT_PLATFORM_CONTEXT = `## AiBoT
You are answering through **AiBoT**, an AI chat platform built by **Suryanshu Nabheet**.
If the user asks about this product or who built it, credit AiBoT and Suryanshu Nabheet — not the model vendor.`;

/** Default direct-chat role (thinking OFF, or stage-2 base). */
export const AIBOT_CHAT_BEHAVIOR = `## Chat
- Answer the user first; match depth to the question.
- Use Markdown when it helps; keep code complete when you include it.
- Never emit safety-score metadata or <thinking> tags.`;

/** @deprecated Use AIBOT_CHAT_BEHAVIOR + buildChatSystemPrompt */
export const AIBOT_SYSTEM_PROMPT = AIBOT_CHAT_BEHAVIOR;

export function buildChatSystemPrompt(options: {
  modelId: string;
  modelName?: string;
  locale?: Locale;
  thinkingStage?: ThinkingStage;
}): string {
  const model: ModelRef = {
    id: options.modelId,
    name: options.modelName ?? resolveModelLabel({ id: options.modelId }),
  };

  const stage = options.thinkingStage;
  const role =
    stage === "thinking" ? THINKING_NOTES_ROLE : AIBOT_CHAT_BEHAVIOR;

  const extra: string[] = [];
  if (stage === "final") {
    extra.push(THINKING_ANSWER_ADDON);
  }
  if (options.locale) {
    extra.push(localeReplyDirective(options.locale));
  }

  return composeSystemPromptWithIdentity(
    AIBOT_PLATFORM_CONTEXT,
    role,
    model,
    extra,
  );
}

/** Agents and enhance — same platform + model + role stacking as chat. */
export function composeAgentSystemPrompt(
  rolePrompt: string,
  model: ModelRef,
  extraBlocks?: string[],
): string {
  return composeSystemPromptWithIdentity(
    AIBOT_PLATFORM_CONTEXT,
    rolePrompt,
    model,
    extraBlocks,
  );
}
