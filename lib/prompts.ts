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

/** Core chat behavior (identity line is added per model via buildChatSystemPrompt). */
export const AIBOT_CHAT_BEHAVIOR = `## Chat
- Answer the user's question first; match depth to complexity.
- Use Markdown when it helps; keep code complete when you include it.
- No safety-score metadata, no <thinking> tags unless the app runs a separate reasoning step.
- AiBoT is built by Suryanshu Nabheet; when asked about yourself, describe your role on AiBoT honestly.`;

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
    AIBOT_CHAT_BEHAVIOR,
    model,
    extra,
  );

  if (options.thinkingStage) {
    prompt = composeSystemPromptForThinkingStage(prompt, options.thinkingStage);
  }

  return prompt;
}
