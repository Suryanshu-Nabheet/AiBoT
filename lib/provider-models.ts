/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

export interface ProviderModel {
  id: string;
  name: string;
  provider: string;
  summary: string;
}

export const PROVIDER_MODELS: Record<string, ProviderModel[]> = {
  openai: [
    { id: "gpt-4o", name: "GPT-4o", provider: "openai", summary: "OpenAI's most advanced multimodal flagship" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", summary: "Fast, affordable small model for lightweight tasks" },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "openai", summary: "Previous generation flagship with broad knowledge" },
    { id: "o1-preview", name: "o1-preview", provider: "openai", summary: "New reasoning model for complex problem solving" },
    { id: "o1-mini", name: "o1-mini", provider: "openai", summary: "Fast reasoning model optimized for STEM" },
  ],
  anthropic: [
    { id: "claude-3-5-sonnet-20240620", name: "Claude 3.5 Sonnet", provider: "anthropic", summary: "Anthropic's most intelligent and fastest model" },
    { id: "claude-3-opus-20240229", name: "Claude 3 Opus", provider: "anthropic", summary: "Deep reasoning for highly complex tasks" },
    { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", provider: "anthropic", summary: "Near-instant responsiveness for simple tasks" },
  ],
  google: [
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "google", summary: "Complex reasoning with a massive context window" },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "google", summary: "Fast and cost-efficient for high-volume tasks" },
  ],
  deepseek: [
    { id: "deepseek-chat", name: "DeepSeek Chat", provider: "deepseek", summary: "Highly capable and efficient general model" },
    { id: "deepseek-coder", name: "DeepSeek Coder", provider: "deepseek", summary: "Specialized for advanced code generation" },
  ],
  openrouter: [
    { id: "meta-llama/llama-3.1-405b", name: "Llama 3.1 405B", provider: "openrouter", summary: "The world's largest open-weights model" },
    { id: "mistralai/mistral-large-2", name: "Mistral Large 2", provider: "openrouter", summary: "Mistral's top-tier multilingual reasoning model" },
    { id: "perplexity/llama-3.1-sonar-huge-128k-online", name: "Sonar Huge Online", provider: "openrouter", summary: "Real-time web-connected reasoning" },
  ],
};
