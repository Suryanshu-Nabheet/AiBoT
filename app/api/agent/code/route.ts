/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { NextRequest, NextResponse } from "next/server";
import { CODER_AGENT_ROLE, composeAgentSystemPrompt } from "@/lib/prompts";
import {
  buildMultimodalUserContent,
  normalizeLegacyAttachment,
} from "@/lib/chat/attachments";
import { completeAgentChat } from "@/lib/server/agent-completion";
import { protectApiRequest } from "@/lib/server/request-security";
import { coderRequestSchema } from "@/lib/server/request-schemas";

export async function POST(req: NextRequest) {
  const blocked = protectApiRequest(req, {
    scope: "coder",
    limit: 5,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  try {
    const parsed = coderRequestSchema.safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json(
        { message: "Invalid code request" },
        { status: 400 },
      );
    const { prompt, attachments, model, customKeys } = parsed.data;
    const userContent = buildMultimodalUserContent(
      prompt,
      (attachments ?? []).map((a) => normalizeLegacyAttachment(a)),
    );

    const systemPrompt = composeAgentSystemPrompt(CODER_AGENT_ROLE, {
      id: model,
      name: model,
    });

    const result = await completeAgentChat({
      model,
      systemPrompt,
      userContent,
      customKeys,
      temperature: 0.4,
      maxTokens: 8000,
    });

    if (!result.ok) {
      return NextResponse.json(result.body, { status: result.status });
    }

    return NextResponse.json({ code: result.content, model: result.model });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
