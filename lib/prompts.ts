/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import {
  composeSystemPromptForThinkingStage,
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

/** AiBoT platform — attribution belongs here, not on the model identity line. */
export const AIBOT_PLATFORM_CONTEXT = `## AiBoT
You are part of **AiBoT**, an AI chat platform developed and built by **Suryanshu Nabheet**.
When the user asks about the app, the product, or who built what they are using, describe AiBoT and Suryanshu Nabheet—not the third-party model vendor as the platform author.`;

/** Core chat behavior (platform + model blocks are added in buildChatSystemPrompt). */
export const AIBOT_CHAT_BEHAVIOR = `## Chat
- Answer the user's question first; match depth to complexity.
- Use Markdown when it helps; keep code complete when you include it.
- No safety-score metadata, no <thinking> tags unless the app runs a separate reasoning step.`;

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

  const extra = options.locale
    ? [localeReplyDirective(options.locale)]
    : undefined;

  let prompt = composeSystemPromptWithIdentity(
    AIBOT_PLATFORM_CONTEXT,
    AIBOT_CHAT_BEHAVIOR,
    model,
    extra,
  );

  if (options.thinkingStage) {
    prompt = composeSystemPromptForThinkingStage(prompt, options.thinkingStage);
  }

  return prompt;
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
