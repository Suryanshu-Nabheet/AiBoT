/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { NextRequest, NextResponse } from "next/server";
import {
  PROMPT_ENHANCE_ROLE,
  composeAgentSystemPrompt,
  resolveModelLabel,
} from "@/lib/prompts";
import { isLocale, localeReplyDirective } from "@/lib/i18n";
import { MODELS } from "@/lib/types";
import { protectApiRequest } from "@/lib/server/request-security";
import { enhanceRequestSchema } from "@/lib/server/request-schemas";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_NAME = "AiBoT";

const ENHANCE_MODEL_ID = "openrouter/free";

export async function POST(req: NextRequest) {
  const blocked = protectApiRequest(req, {
    scope: "enhance",
    limit: 10,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  if (!OPENROUTER_KEY) {
    return NextResponse.json(
      { error: "API Key not configured" },
      { status: 500 },
    );
  }

  try {
    const parsed = enhanceRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid prompt request" },
        { status: 400 },
      );
    }
    const { prompt, locale: rawLocale } = parsed.data;
    const locale = isLocale(rawLocale) ? rawLocale : undefined;

    const enhanceModel = MODELS.find((m) => m.id === ENHANCE_MODEL_ID);
    const systemPrompt = composeAgentSystemPrompt(
      PROMPT_ENHANCE_ROLE,
      {
        id: ENHANCE_MODEL_ID,
        name: enhanceModel?.name ?? resolveModelLabel({ id: ENHANCE_MODEL_ID }),
      },
      locale ? [localeReplyDirective(locale)] : undefined,
    );

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          "HTTP-Referer": SITE_URL,
          "X-Title": SITE_NAME,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: ENHANCE_MODEL_ID,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 1500,
        }),
        signal: AbortSignal.timeout(90_000),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API Error:", errorText);
      return NextResponse.json(
        { error: "Failed to enhance prompt" },
        { status: response.status },
      );
    }

    const data = await response.json();
    const enhancedPrompt = data.choices[0]?.message?.content?.trim();

    if (!enhancedPrompt) {
      return NextResponse.json(
        { error: "No enhanced prompt generated" },
        { status: 500 },
      );
    }

    return NextResponse.json({ enhanced: enhancedPrompt });
  } catch (error) {
    console.error("Prompt enhancement error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
