/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { NextRequest, NextResponse } from "next/server";
import { VOICE_SYSTEM_PROMPT, composeVoiceSystemPrompt } from "@/lib/prompts";
import {
  buildMultimodalUserContent,
  normalizeLegacyAttachment,
} from "@/lib/chat/attachments";
import { completeVoiceChat } from "@/lib/server/voice-completion";
import { protectApiRequest } from "@/lib/server/request-security";
import { voiceRequestSchema } from "@/lib/server/request-schemas";

export async function POST(req: NextRequest) {
  const blocked = protectApiRequest(req, {
    scope: "voice",
    limit: 15,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  try {
    const parsed = voiceRequestSchema.safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json(
        { message: "Invalid voice request" },
        { status: 400 },
      );
    const { messages, attachments, model, customKeys } = parsed.data;
    const normalized = (attachments ?? []).map((a) =>
      normalizeLegacyAttachment(a),
    );

    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const prior = messages.filter((m) => m !== lastUser);
    const lastText =
      typeof lastUser?.content === "string"
        ? lastUser.content
        : "Continue the voice conversation.";

    const historyBlock =
      prior.length > 0
        ? prior
            .map((m) => {
              const text =
                typeof m.content === "string"
                  ? m.content
                  : "[multimodal message]";
              return `${m.role === "assistant" ? "Assistant" : "User"}: ${text}`;
            })
            .join("\n")
        : "";

    const promptText = historyBlock
      ? `Conversation so far:\n${historyBlock}\n\nUser: ${lastText}`
      : lastText;

    const userContent = buildMultimodalUserContent(promptText, normalized);

    const systemPrompt = composeVoiceSystemPrompt(VOICE_SYSTEM_PROMPT, {
      id: model,
      name: model,
    });

    const result = await completeVoiceChat({
      model,
      systemPrompt,
      userContent,
      customKeys,
      temperature: 0.7,
      maxTokens: 1000,
      timeoutMs: 90_000,
    });

    if (!result.ok) {
      return NextResponse.json(result.body, { status: result.status });
    }

    return NextResponse.json({ content: result.content, model: result.model });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
