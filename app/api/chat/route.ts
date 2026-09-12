/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { NextRequest, NextResponse } from "next/server";
import type { ThinkingStage } from "@/lib/chat/thinking-mode";
import {
  findProviderForModel,
  isPlatformModel,
} from "@/lib/chat/resolve-provider";
import { isLocale, type Locale } from "@/lib/i18n";
import { chatErrorResponseBody } from "@/lib/chat/chat-error";
import { openChatUpstreamStream } from "@/lib/server/chat-completion";
import { protectApiRequest } from "@/lib/server/request-security";
import { chatRequestSchema } from "@/lib/server/request-schemas";

export const maxDuration = 300; // 5 minutes for deep reasoning

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_NAME = "AiBoT";

const STREAM_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

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
      chatErrorResponseBody(400, undefined, "missing_api_key"),
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
    const { response } = await openChatUpstreamStream({
      model: targetModel,
      messages,
      thinkingStage: stage,
      priorReasoning,
      locale,
      customKeys,
      openRouterKey: OPENROUTER_KEY,
      siteUrl: SITE_URL,
      siteName: SITE_NAME,
    });

    if (response.ok && response.body) {
      return new Response(response.body, { headers: STREAM_HEADERS });
    }

    const errorText = await response.text();
    return NextResponse.json(
      chatErrorResponseBody(response.status, errorText),
      { status: response.status },
    );
  } catch {
    return NextResponse.json(chatErrorResponseBody(500), { status: 500 });
  }
}
