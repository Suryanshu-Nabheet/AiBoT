/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { NextRequest, NextResponse } from "next/server";
import { COACH_VOICE_ROLE, composeAgentSystemPrompt } from "@/lib/prompts";
import { MODELS } from "@/lib/types";
import { protectApiRequest } from "@/lib/server/request-security";
import { coachRequestSchema } from "@/lib/server/request-schemas";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_NAME = "AiBoT";

export async function POST(req: NextRequest) {
  const blocked = protectApiRequest(req, {
    scope: "coach",
    limit: 15,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  if (!OPENROUTER_KEY) {
    return NextResponse.json(
      { message: "OpenRouter API Key not configured" },
      { status: 500 },
    );
  }

  try {
    const parsed = coachRequestSchema.safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json(
        { message: "Invalid coach request" },
        { status: 400 },
      );
    const { messages } = parsed.data;

    let lastError = null;

    for (const model of MODELS) {
      try {
        const systemPrompt = composeAgentSystemPrompt(COACH_VOICE_ROLE, {
          id: model.id,
          name: model.name,
        });

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
              model: model.id,
              messages: [
                { role: "system", content: systemPrompt },
                ...messages,
              ],
              temperature: 0.7,
              max_tokens: 1000,
            }),
            signal: AbortSignal.timeout(90_000),
          },
        );

        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0]?.message?.content || "";

          if (content) {
            return NextResponse.json({ content });
          }
        }

        const errorText = response.bodyUsed
          ? "Empty completion"
          : await response.text();
        lastError = errorText;
      } catch (modelError) {
        console.error(`Coach: Error with model ${model.id}:`, modelError);
        lastError = modelError;
        continue;
      }
    }

    console.error("Coach: All models failed. Last error:", lastError);
    return NextResponse.json(
      {
        message:
          "All AI models are currently unavailable. Please try again in a moment.",
      },
      { status: 503 },
    );
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
