/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { NextRequest, NextResponse } from "next/server";
import { AIBOT_SYSTEM_PROMPT } from "@/lib/prompts";
import {
  buildChatMessagesForThinkingStage,
  buildThinkingSystemAddon,
  type ThinkingStage,
} from "@/lib/chat/thinking-mode";
import {
  anthropicToOpenAISSE,
  findProviderForModel,
  isPlatformModel,
  resolveProviderRoute,
} from "@/lib/chat/resolve-provider";
import { isLocale, localeReplyDirective, type Locale } from "@/lib/i18n";
import { protectApiRequest } from "@/lib/server/request-security";
import { chatRequestSchema } from "@/lib/server/request-schemas";

export const maxDuration = 300; // 5 minutes for deep reasoning

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_NAME = "AiBoT";

const formatMessagesForProvider = (messages: any[]) => {
  return messages.map((msg) => {
    if (typeof msg.content !== "string") return msg;

    const imageRegex = /!\[.*?\]\((data:image\/.*?;base64,.*?)\)/g;
    if (!msg.content.match(imageRegex)) return msg;

    const contentParts = [];
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
};

function buildSystemPrompt(stage?: ThinkingStage, locale?: Locale) {
  let dynamicSystemPrompt = `You are a helpful AI assistant integrated within the AiBoT platform, developed by Suryanshu Nabheet.\n\n${AIBOT_SYSTEM_PROMPT}`;

  if (locale) {
    dynamicSystemPrompt += localeReplyDirective(locale);
  }

  if (stage === "thinking" || stage === "final") {
    dynamicSystemPrompt += `\n\n${buildThinkingSystemAddon(stage)}`;
  }

  return dynamicSystemPrompt;
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

function prepareMessagesForThinking(
  messages: any[],
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

export async function POST(req: NextRequest) {
  const blocked = protectApiRequest(req, {
    scope: "chat",
    limit: 20,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid chat request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    messages,
    model: targetModel,
    customKeys,
    thinkingStage,
    priorReasoning,
    locale: rawLocale,
  } = parsed.data;

  const selectedProvider = findProviderForModel(targetModel);
  const hasProviderKey =
    selectedProvider &&
    customKeys?.[selectedProvider as keyof NonNullable<typeof customKeys>];
  if (
    !isPlatformModel(targetModel) &&
    !hasProviderKey &&
    !customKeys?.openrouter
  ) {
    return NextResponse.json(
      { message: "The selected model requires its provider API key." },
      { status: 400 },
    );
  }

  const stage: ThinkingStage | undefined =
    thinkingStage === "thinking" || thinkingStage === "final"
      ? thinkingStage
      : undefined;

  const locale: Locale | undefined = isLocale(rawLocale)
    ? rawLocale
    : undefined;

  try {
    const route = resolveProviderRoute(targetModel, customKeys, {
      openRouterKey: OPENROUTER_KEY,
      siteUrl: SITE_URL,
      siteName: SITE_NAME,
    });

    if (!route.authHeader) {
      return NextResponse.json(
        {
          message:
            "No API key available. Add a provider key in Settings or configure OPENROUTER_API_KEY.",
        },
        { status: 401 },
      );
    }

    const optimizedMessages = formatMessagesForProvider(messages);
    const dynamicSystemPrompt = buildSystemPrompt(stage, locale);
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
        const errorText = await response.text();
        return NextResponse.json(
          { message: errorText, code: response.status },
          { status: response.status },
        );
      }

      return new Response(anthropicToOpenAISSE(response.body), {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
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

    if (response.ok) {
      return new Response(response.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const errorText = await response.text();
    return NextResponse.json(
      { message: errorText, code: response.status },
      { status: response.status },
    );
  } catch (error) {
    return NextResponse.json({ message: String(error) }, { status: 500 });
  }
}
