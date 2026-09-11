/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

/**
 * Curated BYOK model catalog — shown in Settings after a provider API key is saved.
 * `id` must match the upstream provider’s model slug (used by resolve-provider).
 */

export type ProviderModelCategory =
  | "flagship"
  | "balanced"
  | "fast"
  | "reasoning"
  | "code"
  | "multimodal";

export interface ProviderModel {
  id: string;
  name: string;
  provider: string;
  summary: string;
  category?: ProviderModelCategory;
}

export const BYOK_PROVIDER_IDS = [
  "openai",
  "anthropic",
  "google",
  "deepseek",
  "openrouter",
] as const;

export type ByokProviderId = (typeof BYOK_PROVIDER_IDS)[number];

export const PROVIDER_MODELS: Record<string, ProviderModel[]> = {
  openai: [
    {
      id: "gpt-4.1",
      name: "GPT-4.1",
      provider: "openai",
      category: "flagship",
      summary:
        "Latest general-purpose flagship; strong coding and instruction following",
    },
    {
      id: "gpt-4.1-mini",
      name: "GPT-4.1 Mini",
      provider: "openai",
      category: "balanced",
      summary: "High quality at lower cost and latency than full 4.1",
    },
    {
      id: "gpt-4.1-nano",
      name: "GPT-4.1 Nano",
      provider: "openai",
      category: "fast",
      summary: "Lightweight 4.1 variant for high-volume or edge workflows",
    },
    {
      id: "gpt-4o",
      name: "GPT-4o",
      provider: "openai",
      category: "multimodal",
      summary: "Multimodal flagship (text, vision, audio) with broad tool use",
    },
    {
      id: "gpt-4o-mini",
      name: "GPT-4o Mini",
      provider: "openai",
      category: "fast",
      summary: "Affordable multimodal model for everyday chat and vision",
    },
    {
      id: "o3",
      name: "o3",
      provider: "openai",
      category: "reasoning",
      summary: "Deep reasoning for math, science, and multi-step analysis",
    },
    {
      id: "o3-mini",
      name: "o3 Mini",
      provider: "openai",
      category: "reasoning",
      summary: "Faster, cheaper reasoning tier with strong STEM performance",
    },
    {
      id: "o4-mini",
      name: "o4 Mini",
      provider: "openai",
      category: "reasoning",
      summary: "Compact reasoning model optimized for agentic and tool loops",
    },
    {
      id: "o1",
      name: "o1",
      provider: "openai",
      category: "reasoning",
      summary:
        "Prior-generation reasoning model; still strong on hard problems",
    },
    {
      id: "o1-mini",
      name: "o1 Mini",
      provider: "openai",
      category: "reasoning",
      summary: "Lower-latency reasoning for coding and structured tasks",
    },
    {
      id: "gpt-4-turbo",
      name: "GPT-4 Turbo",
      provider: "openai",
      category: "balanced",
      summary: "Mature GPT-4 class model with large context and vision",
    },
  ],

  anthropic: [
    {
      id: "claude-sonnet-4-20250514",
      name: "Claude Sonnet 4",
      provider: "anthropic",
      category: "flagship",
      summary:
        "Best balance of intelligence, speed, and cost for production workloads",
    },
    {
      id: "claude-opus-4-20250514",
      name: "Claude Opus 4",
      provider: "anthropic",
      category: "flagship",
      summary:
        "Highest capability tier for research, agents, and complex reasoning",
    },
    {
      id: "claude-3-7-sonnet-20250219",
      name: "Claude 3.7 Sonnet",
      provider: "anthropic",
      category: "balanced",
      summary: "Strong coding and analysis with extended thinking support",
    },
    {
      id: "claude-3-5-sonnet-20241022",
      name: "Claude 3.5 Sonnet",
      provider: "anthropic",
      category: "balanced",
      summary: "Widely deployed Sonnet generation; excellent all-rounder",
    },
    {
      id: "claude-3-5-haiku-20241022",
      name: "Claude 3.5 Haiku",
      provider: "anthropic",
      category: "fast",
      summary:
        "Near-instant responses for chat, classification, and extraction",
    },
    {
      id: "claude-3-opus-20240229",
      name: "Claude 3 Opus",
      provider: "anthropic",
      category: "flagship",
      summary: "Previous Opus generation for demanding reasoning tasks",
    },
    {
      id: "claude-3-haiku-20240307",
      name: "Claude 3 Haiku",
      provider: "anthropic",
      category: "fast",
      summary: "Entry Haiku tier for simple, high-throughput use cases",
    },
  ],

  google: [
    {
      id: "gemini-2.5-pro",
      name: "Gemini 2.5 Pro",
      provider: "google",
      category: "flagship",
      summary:
        "Top Gemini tier for reasoning, long documents, and multimodal input",
    },
    {
      id: "gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      provider: "google",
      category: "balanced",
      summary: "Fast Gemini 2.5 with strong quality for chat and agents",
    },
    {
      id: "gemini-2.5-flash-lite",
      name: "Gemini 2.5 Flash Lite",
      provider: "google",
      category: "fast",
      summary: "Lowest-cost Gemini 2.5 for scale and simple tasks",
    },
    {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      provider: "google",
      category: "fast",
      summary: "Previous Flash generation; reliable and widely available",
    },
    {
      id: "gemini-2.0-flash-lite",
      name: "Gemini 2.0 Flash Lite",
      provider: "google",
      category: "fast",
      summary: "Ultra-light Gemini 2.0 for latency-sensitive workloads",
    },
    {
      id: "gemini-1.5-pro",
      name: "Gemini 1.5 Pro",
      provider: "google",
      category: "balanced",
      summary:
        "Long-context Pro model (up to 1M tokens on supported endpoints)",
    },
    {
      id: "gemini-1.5-flash",
      name: "Gemini 1.5 Flash",
      provider: "google",
      category: "fast",
      summary: "Cost-efficient 1.5 generation with solid multimodal support",
    },
    {
      id: "gemini-1.5-flash-8b",
      name: "Gemini 1.5 Flash 8B",
      provider: "google",
      category: "fast",
      summary: "Smallest 1.5 Flash variant for edge and bulk inference",
    },
  ],

  deepseek: [
    {
      id: "deepseek-chat",
      name: "DeepSeek Chat (V3)",
      provider: "deepseek",
      category: "flagship",
      summary: "General chat and instruction; strong multilingual performance",
    },
    {
      id: "deepseek-reasoner",
      name: "DeepSeek Reasoner (R1)",
      provider: "deepseek",
      category: "reasoning",
      summary: "Chain-of-thought style reasoning for math, logic, and planning",
    },
    {
      id: "deepseek-coder",
      name: "DeepSeek Coder",
      provider: "deepseek",
      category: "code",
      summary: "Code generation, completion, and repository-scale context",
    },
  ],

  openrouter: [
    // —— OpenAI via OpenRouter ——
    {
      id: "openai/gpt-4.1",
      name: "GPT-4.1",
      provider: "openrouter",
      category: "flagship",
      summary: "OpenAI GPT-4.1 routed through OpenRouter billing",
    },
    {
      id: "openai/gpt-4.1-mini",
      name: "GPT-4.1 Mini",
      provider: "openrouter",
      category: "balanced",
      summary: "Smaller GPT-4.1 tier on OpenRouter",
    },
    {
      id: "openai/gpt-4o",
      name: "GPT-4o",
      provider: "openrouter",
      category: "multimodal",
      summary: "OpenAI multimodal flagship via OpenRouter",
    },
    {
      id: "openai/o3-mini",
      name: "o3 Mini",
      provider: "openrouter",
      category: "reasoning",
      summary: "OpenAI reasoning mini via OpenRouter",
    },
    // —— Anthropic ——
    {
      id: "anthropic/claude-sonnet-4",
      name: "Claude Sonnet 4",
      provider: "openrouter",
      category: "flagship",
      summary: "Anthropic Sonnet 4 on OpenRouter",
    },
    {
      id: "anthropic/claude-3.7-sonnet",
      name: "Claude 3.7 Sonnet",
      provider: "openrouter",
      category: "balanced",
      summary: "Claude 3.7 Sonnet with tool and coding strengths",
    },
    {
      id: "anthropic/claude-3.5-sonnet",
      name: "Claude 3.5 Sonnet",
      provider: "openrouter",
      category: "balanced",
      summary: "Popular Sonnet snapshot on OpenRouter",
    },
    // —— Google ——
    {
      id: "google/gemini-2.5-pro-preview",
      name: "Gemini 2.5 Pro",
      provider: "openrouter",
      category: "flagship",
      summary: "Gemini 2.5 Pro preview via OpenRouter",
    },
    {
      id: "google/gemini-2.5-flash-preview",
      name: "Gemini 2.5 Flash",
      provider: "openrouter",
      category: "fast",
      summary: "Gemini 2.5 Flash preview via OpenRouter",
    },
    {
      id: "google/gemini-2.0-flash-001",
      name: "Gemini 2.0 Flash",
      provider: "openrouter",
      category: "fast",
      summary: "Stable Gemini 2.0 Flash on OpenRouter",
    },
    // —— Meta Llama ——
    {
      id: "meta-llama/llama-3.3-70b-instruct",
      name: "Llama 3.3 70B Instruct",
      provider: "openrouter",
      category: "balanced",
      summary: "Meta’s latest open 70B instruct model",
    },
    {
      id: "meta-llama/llama-3.1-405b-instruct",
      name: "Llama 3.1 405B Instruct",
      provider: "openrouter",
      category: "flagship",
      summary: "Largest Llama 3.1 open-weights instruct",
    },
    {
      id: "meta-llama/llama-3.1-70b-instruct",
      name: "Llama 3.1 70B Instruct",
      provider: "openrouter",
      category: "balanced",
      summary: "Strong open model for chat and RAG",
    },
    {
      id: "meta-llama/llama-3.1-8b-instruct",
      name: "Llama 3.1 8B Instruct",
      provider: "openrouter",
      category: "fast",
      summary: "Lightweight Llama for fast iteration",
    },
    // —— Mistral ——
    {
      id: "mistralai/mistral-large-2411",
      name: "Mistral Large",
      provider: "openrouter",
      category: "flagship",
      summary: "Mistral flagship multilingual reasoning",
    },
    {
      id: "mistralai/mistral-small-3.1-24b-instruct",
      name: "Mistral Small 3.1",
      provider: "openrouter",
      category: "balanced",
      summary: "Efficient 24B Mistral instruct",
    },
    {
      id: "mistralai/codestral-2501",
      name: "Codestral",
      provider: "openrouter",
      category: "code",
      summary: "Mistral code-specialized model",
    },
    // —— DeepSeek ——
    {
      id: "deepseek/deepseek-chat",
      name: "DeepSeek Chat",
      provider: "openrouter",
      category: "balanced",
      summary: "DeepSeek V3 chat on OpenRouter",
    },
    {
      id: "deepseek/deepseek-r1",
      name: "DeepSeek R1",
      provider: "openrouter",
      category: "reasoning",
      summary: "DeepSeek reasoning model on OpenRouter",
    },
    // —— Qwen ——
    {
      id: "qwen/qwen-2.5-72b-instruct",
      name: "Qwen 2.5 72B",
      provider: "openrouter",
      category: "balanced",
      summary: "Alibaba Qwen 2.5 large instruct",
    },
    {
      id: "qwen/qwen-2.5-coder-32b-instruct",
      name: "Qwen 2.5 Coder 32B",
      provider: "openrouter",
      category: "code",
      summary: "Qwen coding-focused 32B instruct",
    },
    // —— xAI ——
    {
      id: "x-ai/grok-2-1212",
      name: "Grok 2",
      provider: "openrouter",
      category: "flagship",
      summary: "xAI Grok 2 general model",
    },
    {
      id: "x-ai/grok-3-beta",
      name: "Grok 3 Beta",
      provider: "openrouter",
      category: "flagship",
      summary: "xAI Grok 3 beta when available on OpenRouter",
    },
    // —— Cohere ——
    {
      id: "cohere/command-r-plus-08-2024",
      name: "Command R+",
      provider: "openrouter",
      category: "balanced",
      summary: "Cohere enterprise RAG and tool use",
    },
    // —— Perplexity (online) ——
    {
      id: "perplexity/sonar-pro",
      name: "Sonar Pro",
      provider: "openrouter",
      category: "balanced",
      summary: "Perplexity search-augmented answers",
    },
    {
      id: "perplexity/sonar",
      name: "Sonar",
      provider: "openrouter",
      category: "fast",
      summary: "Lighter Perplexity online model",
    },
    // —— NVIDIA / others ——
    {
      id: "nvidia/llama-3.1-nemotron-70b-instruct",
      name: "Nemotron 70B",
      provider: "openrouter",
      category: "balanced",
      summary: "NVIDIA-tuned Llama instruct variant",
    },
    {
      id: "microsoft/phi-4",
      name: "Phi-4",
      provider: "openrouter",
      category: "fast",
      summary: "Microsoft small language model; strong for size",
    },
  ],
};

/** All BYOK models flattened (e.g. for search or migration). */
export function getAllByokModels(): ProviderModel[] {
  return BYOK_PROVIDER_IDS.flatMap((id) => PROVIDER_MODELS[id]);
}

export function getModelsForProvider(providerId: string): ProviderModel[] {
  if (!(providerId in PROVIDER_MODELS)) return [];
  return PROVIDER_MODELS[providerId as ByokProviderId];
}
