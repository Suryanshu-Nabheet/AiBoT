/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import "server-only";

import { buildChatSystemPrompt } from "@/lib/prompts";
import {
  buildChatMessagesForThinkingStage,
  type ThinkingStage,
} from "@/lib/chat/thinking-mode";
import {
  anthropicToOpenAISSE,
  findProviderForModel,
  isPlatformModel,
  resolveProviderRoute,
} from "@/lib/chat/resolve-provider";
import { normalizeOllamaUrl } from "@/lib/chat/ollama-url";
import { chatErrorResponseBody } from "@/lib/chat/chat-error";
import { inferChatKeySource } from "@/lib/chat/chat-key-context";
import type { Locale } from "@/lib/i18n";

export type ChatMessageInput = {
  role: "user" | "assistant" | "system";
  content: string | unknown;
};

export function formatMessagesForProvider(messages: ChatMessageInput[]) {
  return messages.map((msg) => {
    if (typeof msg.content !== "string") return msg;

    const imageRegex = /!\[.*?\]\((data:image\/.*?;base64,.*?)\)/g;
    if (!msg.content.match(imageRegex)) return msg;

    const contentParts: { type: string; text?: string; image_url?: object }[] =
      [];
    let lastIndex = 0;
    let match;
    imageRegex.lastIndex = 0;

    while ((match = imageRegex.exec(msg.content)) !== null) {
      if (match.index > lastIndex) {
        const text = msg.content.substring(lastIndex, match.index).trim();
        if (text) contentParts.push({ type: "text", text });
      }

      contentParts.push({
        type: "image_url",
        image_url: { url: match[1] },
      });

      lastIndex = imageRegex.lastIndex;
    }

    if (lastIndex < msg.content.length) {
      const text = msg.content.substring(lastIndex).trim();
      if (text) contentParts.push({ type: "text", text });
    }

    return { ...msg, content: contentParts };
  });
}

export function buildSystemPrompt(
  modelId: string,
  stage?: ThinkingStage,
  locale?: Locale,
) {
  return buildChatSystemPrompt({
    modelId,
    locale,
    thinkingStage: stage,
  });
}

function messageTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (part?.type === "text" ? part.text : ""))
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

export function prepareMessagesForThinking(
  messages: ChatMessageInput[],
  stage?: ThinkingStage,
  priorReasoning?: string,
) {
  if (!stage) return messages;

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role,
    content: messageTextContent(m.content),
  }));
  const last = messages[messages.length - 1];
  const userContent = messageTextContent(last?.content);

  return buildChatMessagesForThinkingStage({
    history,
    userContent,
    stage,
    priorReasoning,
  });
}

function toAnthropicContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (part?.type === "text" ? part.text : ""))
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

export type OpenUpstreamParams = {
  model: string;
  messages: ChatMessageInput[];
  thinkingStage?: ThinkingStage;
  priorReasoning?: string;
  locale?: Locale;
  customKeys?: Record<string, string | undefined>;
  openRouterKey?: string;
  siteUrl: string;
  siteName: string;
};

/** Opens a streaming upstream response (provider or Ollama). */
export async function openChatUpstreamStream(
  params: OpenUpstreamParams & { ollamaUrl?: string },
): Promise<{ response: Response; streamKind: "ollama" | "sse" }> {
  const {
    model: targetModel,
    messages,
    thinkingStage,
    priorReasoning,
    locale,
    customKeys,
    openRouterKey,
    siteUrl,
    siteName,
    ollamaUrl,
  } = params;

  if (targetModel.startsWith("ollama/")) {
    const ollamaModelName = targetModel.replace("ollama/", "");
    const targetUrl = normalizeOllamaUrl(ollamaUrl);
    const stage = thinkingStage;
    const dynamicSystemPrompt = buildSystemPrompt(targetModel, stage, locale);
    const optimized = formatMessagesForProvider(messages);
    const annotated = stage
      ? prepareMessagesForThinking(optimized, stage, priorReasoning)
      : optimized;

    const payload = {
      model: ollamaModelName,
      messages: [
        { role: "system", content: dynamicSystemPrompt },
        ...annotated.map((m) => ({
          role: m.role,
          content: messageTextContent(m.content),
        })),
      ],
      stream: true,
    };

    let response = await fetch(`${targetUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(285_000),
    });

    if (!response.ok && targetUrl.includes("localhost")) {
      const fallbackUrl = targetUrl.replace("localhost", "127.0.0.1");
      response = await fetch(`${fallbackUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(285_000),
      });
    }

    return { response, streamKind: "ollama" };
  }

  const selectedProvider = findProviderForModel(targetModel);
  const hasProviderKey =
    selectedProvider &&
    customKeys?.[selectedProvider as keyof typeof customKeys];
  if (
    !isPlatformModel(targetModel) &&
    !hasProviderKey &&
    !customKeys?.openrouter
  ) {
    return {
      response: new Response(
        JSON.stringify(
          chatErrorResponseBody(
            400,
            undefined,
            "byok_key_required",
            targetModel,
            customKeys,
          ),
        ),
        { status: 400 },
      ),
      streamKind: "sse",
    };
  }

  const route = resolveProviderRoute(targetModel, customKeys, {
    openRouterKey,
    siteUrl,
    siteName,
  });

  if (!route.authHeader) {
    const missingKeyCode =
      inferChatKeySource(targetModel, customKeys) === "platform"
        ? "platform_unavailable"
        : "byok_key_required";
    return {
      response: new Response(
        JSON.stringify(
          chatErrorResponseBody(
            401,
            undefined,
            missingKeyCode,
            targetModel,
            customKeys,
          ),
        ),
        { status: 401 },
      ),
      streamKind: "sse",
    };
  }

  const stage = thinkingStage;
  const optimizedMessages = formatMessagesForProvider(messages);
  const dynamicSystemPrompt = buildSystemPrompt(targetModel, stage, locale);
  const annotated = stage
    ? prepareMessagesForThinking(optimizedMessages, stage, priorReasoning)
    : optimizedMessages;

  if (route.kind === "anthropic") {
    const anthropicMessages = annotated
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: toAnthropicContent(m.content),
      }));

    const response = await fetch(route.url, {
      method: "POST",
      headers: {
        "x-api-key": route.authHeader,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: route.model,
        system: dynamicSystemPrompt,
        messages: anthropicMessages,
        max_tokens: 4096,
        stream: true,
      }),
      signal: AbortSignal.timeout(285_000),
    });

    if (!response.ok || !response.body) {
      return { response, streamKind: "sse" };
    }

    return {
      response: new Response(anthropicToOpenAISSE(response.body), {
        status: response.status,
        headers: response.headers,
      }),
      streamKind: "sse",
    };
  }

  const payloadMessages = [
    { role: "system", content: dynamicSystemPrompt },
    ...annotated,
  ];

  const response = await fetch(route.url, {
    method: "POST",
    headers: {
      Authorization: route.authHeader,
      "Content-Type": "application/json",
      ...(route.extraHeaders || {}),
    },
    body: JSON.stringify({
      model: route.model,
      messages: payloadMessages,
      stream: true,
    }),
    signal: AbortSignal.timeout(285_000),
  });

  return { response, streamKind: "sse" };
}
