/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { getAllByokModels } from "@/lib/provider-models";
import { MODELS } from "@/lib/types";

export type ModelRef = {
  id: string;
  name?: string;
};

const PROVIDER_LABELS: Record<string, string> = {
  openrouter: "OpenRouter",
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  deepseek: "DeepSeek",
  meta: "Meta",
  mistralai: "Mistral",
  qwen: "Qwen",
};

/** Human-readable model name from catalog or model id (never hardcoded in prompts). */
export function resolveModelLabel(model: ModelRef): string {
  if (model.name?.trim()) return model.name.trim();

  const platform = MODELS.find((m) => m.id === model.id);
  if (platform) return platform.name;

  const byok = getAllByokModels().find((m) => m.id === model.id);
  if (byok) return byok.name;

  const slug = model.id.includes("/")
    ? (model.id.split("/").pop() ?? model.id)
    : model.id;
  return slug
    .replace(/[:_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function resolveProviderLabel(modelId: string): string {
  if (modelId.startsWith("ollama/")) return "Ollama";
  const prefix = modelId.includes("/") ? modelId.split("/")[0] : "";
  if (!prefix) return "AiBoT";
  return PROVIDER_LABELS[prefix.toLowerCase()] ?? prefix.toUpperCase();
}

/**
 * Per-request model routing — vendor/creator credit stays on the model; not the AiBoT author.
 */
export function formatModelIdentityLine(model: ModelRef): string {
  const modelName = resolveModelLabel(model);
  const provider = resolveProviderLabel(model.id);
  return (
    `## Active model\n` +
    `This turn uses **${modelName}** from **${provider}**, routed through AiBoT. ` +
    `Use that model's strengths. If asked who made the model, name ${provider} (or its vendor)—not AiBoT. ` +
    `The user is talking to you on AiBoT; do not claim to be another consumer chat product.`
  );
}

export function composeSystemPromptWithIdentity(
  platformPrompt: string,
  rolePrompt: string,
  model: ModelRef,
  extraBlocks?: string[],
): string {
  const blocks = [
    platformPrompt.trim(),
    formatModelIdentityLine(model),
    rolePrompt.trim(),
    ...(extraBlocks ?? []).filter(Boolean),
  ];
  return blocks.join("\n\n");
}
