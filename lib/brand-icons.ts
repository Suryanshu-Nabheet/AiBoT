/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

/**
 * Brand SVGs that render as black / currentColor when used as <img>.
 * Invert them in dark mode. Leave colorful logos (Google, NVIDIA, etc.) alone.
 */
const MONOCHROME_ICON_NAMES = new Set([
  "openai",
  "ollama",
  "openrouter",
  "anthropic",
  "ai",
  "chatgpt",
  "kimi",
  "zai",
  "arcee",
  "xAI",
  "groq",
  "cohere",
  "together",
  "replicate",
  "fireworks",
  "cerebras",
  "sambanova",
  "lmstudio",
  "llamacpp",
  "llamafile",
  "docker",
  "ibm",
  "moonshot",
  "hunyuan",
  "novita",
  "nebius",
  "inception",
  "allenai",
  "amazon",
  "azure",
  "ask-sage",
  "cometapi",
  "function-network",
  "lemonade",
  "mimo",
  "ncompass",
  "ovhcloud",
  "scaleway",
  "siliconflow",
  "venice",
  "vertexai",
  "wizardlm",
  "WatsonX",
  "TetrateAgentRouterService",
]);

export function isMonochromeBrandIcon(src?: string | null): boolean {
  if (!src) return false;
  const file = src.split("/").pop()?.split("?")[0] ?? "";
  const name = file.replace(/\.svg$/i, "");
  return MONOCHROME_ICON_NAMES.has(name);
}
