/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import "server-only";

import {
  findProviderForModel,
  isPlatformModel,
  resolveProviderRoute,
  type CustomKeys,
} from "@/lib/chat/resolve-provider";
import { toAnthropicMultimodalContent } from "@/lib/chat/attachments";
import { chatErrorResponseBody } from "@/lib/chat/chat-error";
import { inferChatKeySource } from "@/lib/chat/chat-key-context";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_NAME = "AiBoT";
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

export type AgentCompletionResult =
  | { ok: true; content: string; model: string }
  | { ok: false; status: number; body: Record<string, unknown> };

/**
 * Non-streaming completion for agent routes (coder / summarizer / coach).
 * Uses the same BYOK + platform routing as chat.
 */
export async function completeAgentChat(params: {
  model: string;
  systemPrompt: string;
  userContent: unknown;
  customKeys?: CustomKeys;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<AgentCompletionResult> {
  const {
    model,
    systemPrompt,
    userContent,
    customKeys,
    temperature = 0.5,
    maxTokens = 4000,
    timeoutMs = 120_000,
  } = params;

  if (model.startsWith("ollama/")) {
    return {
      ok: false,
      status: 400,
      body: {
        message:
          "Local Ollama models are available in Chat and Arena. Pick a cloud or BYOK model for this agent.",
      },
    };
  }

  const provider = findProviderForModel(model);
  const hasProviderKey = provider && customKeys?.[provider as keyof CustomKeys];
  if (
    !isPlatformModel(model) &&
    !hasProviderKey &&
    !customKeys?.openrouter &&
    !OPENROUTER_KEY
  ) {
    return {
      ok: false,
      status: 400,
      body: chatErrorResponseBody(
        400,
        undefined,
        "byok_key_required",
        model,
        customKeys,
      ),
    };
  }

  const route = resolveProviderRoute(model, customKeys, {
    openRouterKey: OPENROUTER_KEY,
    siteUrl: SITE_URL,
    siteName: SITE_NAME,
  });

  if (!route.authHeader) {
    const code =
      inferChatKeySource(model, customKeys) === "platform"
        ? "platform_unavailable"
        : "byok_key_required";
    return {
      ok: false,
      status: 401,
      body: chatErrorResponseBody(401, undefined, code, model, customKeys),
    };
  }

  try {
    if (route.kind === "anthropic") {
      const response = await fetch(route.url, {
        method: "POST",
        headers: {
          "x-api-key": route.authHeader,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: route.model,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: toAnthropicMultimodalContent(userContent),
            },
          ],
          max_tokens: maxTokens,
          temperature,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          ok: false,
          status: response.status,
          body: chatErrorResponseBody(
            response.status,
            errorText,
            undefined,
            model,
            customKeys,
          ),
        };
      }

      const data = (await response.json()) as {
        content?: Array<{ type?: string; text?: string }>;
      };
      const content = (data.content ?? [])
        .filter((part) => part.type === "text" && part.text)
        .map((part) => part.text)
        .join("\n")
        .trim();

      if (!content) {
        return {
          ok: false,
          status: 502,
          body: { message: "Empty completion from provider" },
        };
      }
      return { ok: true, content, model };
    }

    const response = await fetch(route.url, {
      method: "POST",
      headers: {
        Authorization: route.authHeader,
        "Content-Type": "application/json",
        ...(route.extraHeaders || {}),
      },
      body: JSON.stringify({
        model: route.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        ok: false,
        status: response.status,
        body: chatErrorResponseBody(
          response.status,
          errorText,
          undefined,
          model,
          customKeys,
        ),
      };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim() || "";
    if (!content) {
      return {
        ok: false,
        status: 502,
        body: { message: "Empty completion from provider" },
      };
    }
    return { ok: true, content, model };
  } catch (error) {
    console.error("Agent completion failed:", error);
    return {
      ok: false,
      status: 500,
      body: chatErrorResponseBody(500, undefined, undefined, model, customKeys),
    };
  }
}
