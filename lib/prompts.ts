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
import { DOCUMENT_WORK_INSTRUCTION } from "@/lib/chat/document-work";

export {
  composeSystemPromptWithIdentity,
  formatModelIdentityLine,
  resolveModelLabel,
  resolveProviderLabel,
  type ModelRef,
} from "@/lib/prompts/identity";

export { VOICE_SYSTEM_PROMPT } from "@/lib/prompts/voice";

/**
 * Shared stack for chat and Voice requests:
 * Platform → Active model → Role → optional addons → locale
 */

/** AiBoT platform — attribution belongs here, not on the model identity line. */
export const AIBOT_PLATFORM_CONTEXT = `## AiBoT
You are answering through **AiBoT**, an AI chat platform built by **Suryanshu Nabheet**.
If the user asks about this product or who built it, credit AiBoT and Suryanshu Nabheet — not the model vendor.`;

/** Default direct-chat role (thinking OFF, or stage-2 base). */
export const AIBOT_CHAT_BEHAVIOR = `## Chat
- Answer the user first; match depth to the question.
- Use Markdown when it helps; keep code complete when you include it.
- Render equations with standard LaTeX math delimiters (\\(...\\) inline and \\[...\\] for display).
- When a flow, sequence, or system relationship is clearer visually, include a valid Mermaid diagram in a fenced mermaid block. Prefer flowchart TD with at most 15 meaningful nodes and no more than 4 sibling branches; consolidate details or split complex topics into separate diagrams. Use left-to-right layout only when direction represents a real sequence, and omit diagrams when they add no value.
- Before returning Mermaid, check that the diagram parses: put the flowchart declaration and each statement on its own line, use lowercase subgraph and end keywords, and do not use Mermaid keywords as node identifiers. Keep labels simple and avoid HTML tags.
- Never emit safety-score metadata or <thinking> tags.`;

/** @deprecated Use AIBOT_CHAT_BEHAVIOR + buildChatSystemPrompt */
export const AIBOT_SYSTEM_PROMPT = AIBOT_CHAT_BEHAVIOR;

export function buildChatSystemPrompt(options: {
  modelId: string;
  modelName?: string;
  locale?: Locale;
  thinkingStage?: ThinkingStage;
  documentWork?: boolean;
}): string {
  const model: ModelRef = {
    id: options.modelId,
    name: options.modelName ?? resolveModelLabel({ id: options.modelId }),
  };

  const stage = options.thinkingStage;
  const role = stage === "thinking" ? THINKING_NOTES_ROLE : AIBOT_CHAT_BEHAVIOR;

  const extra: string[] = [];
  if (stage === "final") {
    extra.push(THINKING_ANSWER_ADDON);
  }
  if (options.documentWork) {
    extra.push(DOCUMENT_WORK_INSTRUCTION);
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

/** Voice uses the same platform + model + role stacking as chat. */
export function composeVoiceSystemPrompt(
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
