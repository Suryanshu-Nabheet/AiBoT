/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { PROVIDER_MODELS } from "@/lib/provider-models";

export type CustomKeys = {
  openai?: string;
  anthropic?: string;
  google?: string;
  deepseek?: string;
  openrouter?: string;
};

export type ResolvedProviderRoute = {
  kind: "openai-compatible" | "anthropic" | "platform";
  url: string;
  authHeader?: string;
  extraHeaders?: Record<string, string>;
  model: string;
};

function findProviderForModel(modelId: string): keyof typeof PROVIDER_MODELS | null {
  for (const [providerId, models] of Object.entries(PROVIDER_MODELS)) {
    if (models.some((m) => m.id === modelId)) {
      return providerId as keyof typeof PROVIDER_MODELS;
    }
  }
  return null;
}

/**
 * Resolve which upstream API to hit for a chat request based on the selected
 * model and any user-supplied BYOK keys.
 */
export function resolveProviderRoute(
  modelId: string,
  customKeys: CustomKeys | undefined,
  platform: { openRouterKey?: string; siteUrl: string; siteName: string }
): ResolvedProviderRoute {
  const provider = findProviderForModel(modelId);
  const keys = customKeys || {};

  if (provider === "openai" && keys.openai) {
    return {
      kind: "openai-compatible",
      url: "https://api.openai.com/v1/chat/completions",
      authHeader: `Bearer ${keys.openai}`,
      model: modelId,
    };
  }

  if (provider === "deepseek" && keys.deepseek) {
    return {
      kind: "openai-compatible",
      url: "https://api.deepseek.com/chat/completions",
      authHeader: `Bearer ${keys.deepseek}`,
      model: modelId,
    };
  }

  if (provider === "openrouter" && keys.openrouter) {
    return {
      kind: "openai-compatible",
      url: "https://openrouter.ai/api/v1/chat/completions",
      authHeader: `Bearer ${keys.openrouter}`,
      extraHeaders: {
        "HTTP-Referer": platform.siteUrl,
        "X-Title": platform.siteName,
      },
      model: modelId,
    };
  }

  if (provider === "google" && keys.google) {
    return {
      kind: "openai-compatible",
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      authHeader: `Bearer ${keys.google}`,
      model: modelId,
    };
  }

  if (provider === "anthropic" && keys.anthropic) {
    return {
      kind: "anthropic",
      url: "https://api.anthropic.com/v1/messages",
      authHeader: keys.anthropic,
      model: modelId,
    };
  }

  // Fallback: platform OpenRouter key (or user openrouter key for any model)
  const openRouterKey = keys.openrouter || platform.openRouterKey;
  return {
    kind: "openai-compatible",
    url: "https://openrouter.ai/api/v1/chat/completions",
    authHeader: openRouterKey ? `Bearer ${openRouterKey}` : undefined,
    extraHeaders: {
      "HTTP-Referer": platform.siteUrl,
      "X-Title": platform.siteName,
    },
    model: modelId,
  };
}

/** Convert Anthropic SSE stream into OpenAI-style `data: {choices...}` SSE. */
export function anthropicToOpenAISSE(anthropicBody: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream({
    async start(controller) {
      const reader = anthropicBody.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const raw = trimmed.slice(5).trim();
            if (!raw || raw === "[DONE]") continue;
            try {
              const event = JSON.parse(raw);
              if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
                const text = event.delta.text || "";
                if (!text) continue;
                const openaiChunk = {
                  choices: [{ delta: { content: text } }],
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
              }
            } catch {
              // ignore partial JSON
            }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}
