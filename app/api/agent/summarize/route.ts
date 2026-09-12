/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { NextRequest, NextResponse } from "next/server";
import { SUMMARIZER_AGENT_ROLE, composeAgentSystemPrompt } from "@/lib/prompts";
import {
  buildMultimodalUserContent,
  normalizeLegacyAttachment,
  type ChatAttachment,
} from "@/lib/chat/attachments";
import { completeAgentChat } from "@/lib/server/agent-completion";
import { protectApiRequest } from "@/lib/server/request-security";
import { summarizeRequestSchema } from "@/lib/server/request-schemas";

export async function POST(req: NextRequest) {
  const blocked = protectApiRequest(req, {
    scope: "summarize",
    limit: 3,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  try {
    const parsed = summarizeRequestSchema.safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json(
        { message: "Invalid summarization request" },
        { status: 400 },
      );
    const {
      task,
      filesData,
      attachments: rawAttachments,
      model,
      customKeys,
    } = parsed.data;

    const fromLegacy: ChatAttachment[] = filesData.map((file, index) =>
      normalizeLegacyAttachment({
        id: `sum-doc-${index}`,
        name: file.name,
        type: "text/plain",
        kind: "document",
        content: file.content,
      }),
    );
    const fromNew = (rawAttachments ?? []).map((a) =>
      normalizeLegacyAttachment(a),
    );
    const userContent = buildMultimodalUserContent(task, [
      ...fromLegacy,
      ...fromNew,
    ]);

    const systemPrompt = composeAgentSystemPrompt(SUMMARIZER_AGENT_ROLE, {
      id: model,
      name: model,
    });

    const result = await completeAgentChat({
      model,
      systemPrompt,
      userContent,
      customKeys,
      temperature: 0.3,
      maxTokens: 6000,
    });

    if (!result.ok) {
      return NextResponse.json(result.body, { status: result.status });
    }

    const summary = result.content
      .replace(
        /\|\s*([^|\n]+?)\s*\|/g,
        (_match: string, content: string) => `| ${content.trim()} |`,
      )
      .replace(
        /(\|[^\n]+\|)\n(\|[^\n]+\|)/g,
        (match: string, header: string, row: string) => {
          if (!row.includes("---")) {
            const cols = (header.match(/\|/g) || []).length - 1;
            const separator = "|" + " --- |".repeat(cols);
            return `${header}\n${separator}\n${row}`;
          }
          return match;
        },
      )
      .replace(/^\s*(##|\*\*|\*)\s*$/gm, "")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim();

    return NextResponse.json({ summary, model: result.model });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
