/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { NextRequest, NextResponse } from "next/server";
import { COACH_VOICE_ROLE, composeAgentSystemPrompt } from "@/lib/prompts";
import {
  buildMultimodalUserContent,
  normalizeLegacyAttachment,
} from "@/lib/chat/attachments";
import { completeAgentChat } from "@/lib/server/agent-completion";
import { protectApiRequest } from "@/lib/server/request-security";
import { coachRequestSchema } from "@/lib/server/request-schemas";

export async function POST(req: NextRequest) {
  const blocked = protectApiRequest(req, {
    scope: "coach",
    limit: 15,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  try {
    const parsed = coachRequestSchema.safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json(
        { message: "Invalid coach request" },
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
        : "Continue the coaching conversation.";

    const historyBlock =
      prior.length > 0
        ? prior
            .map((m) => {
              const text =
                typeof m.content === "string"
                  ? m.content
                  : "[multimodal message]";
              return `${m.role === "assistant" ? "Coach" : "User"}: ${text}`;
            })
            .join("\n")
        : "";

    const promptText = historyBlock
      ? `Conversation so far:\n${historyBlock}\n\nUser: ${lastText}`
      : lastText;

    const userContent = buildMultimodalUserContent(promptText, normalized);

    const systemPrompt = composeAgentSystemPrompt(COACH_VOICE_ROLE, {
      id: model,
      name: model,
    });

    const result = await completeAgentChat({
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
