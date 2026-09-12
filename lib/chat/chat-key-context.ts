/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import {
  findProviderForModel,
  isPlatformModel,
  type CustomKeys,
} from "@/lib/chat/resolve-provider";

export type ChatKeySource = "platform" | "byok";

/** Whether this request uses the user's BYOK key or the host's platform env key. */
export function inferChatKeySource(
  modelId: string,
  customKeys?: CustomKeys,
): ChatKeySource {
  const keys = customKeys ?? {};
  const provider = findProviderForModel(modelId);

  if (provider === "openai" && keys.openai) return "byok";
  if (provider === "anthropic" && keys.anthropic) return "byok";
  if (provider === "google" && keys.google) return "byok";
  if (provider === "deepseek" && keys.deepseek) return "byok";
  if (provider === "openrouter" && keys.openrouter) return "byok";

  if (keys.openrouter) return "byok";

  if (provider && !isPlatformModel(modelId)) return "byok";

  return "platform";
}
