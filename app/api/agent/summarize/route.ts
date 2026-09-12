/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { NextRequest, NextResponse } from "next/server";
import { SUMMARIZER_AGENT_ROLE, composeAgentSystemPrompt } from "@/lib/prompts";
import { MODELS } from "@/lib/types";
import {
  buildMultimodalUserContent,
  normalizeLegacyAttachment,
  type ChatAttachment,
} from "@/lib/chat/attachments";
import { protectApiRequest } from "@/lib/server/request-security";
import { summarizeRequestSchema } from "@/lib/server/request-schemas";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_NAME = "AiBoT";

export async function POST(req: NextRequest) {
  const blocked = protectApiRequest(req, {
    scope: "summarize",
    limit: 3,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  if (!OPENROUTER_KEY) {
    return NextResponse.json(
      { message: "OpenRouter API Key not found" },
      { status: 500 },
    );
  }

  try {
    const parsed = summarizeRequestSchema.safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json(
        { message: "Invalid summarization request" },
        { status: 400 },
      );
    const { task, filesData, attachments: rawAttachments } = parsed.data;

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

    let lastError = null;

    for (const model of MODELS) {
      try {
        const systemPrompt = composeAgentSystemPrompt(SUMMARIZER_AGENT_ROLE, {
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
                { role: "user", content: userContent },
              ],
            }),
            signal: AbortSignal.timeout(120_000),
          },
        );

        if (response.ok) {
          const data = await response.json();
          let summary =
            data.choices[0]?.message?.content || "No summary generated.";

          summary = summary
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

          return NextResponse.json({ summary });
        }

        const errorText = await response.text();
        lastError = errorText;
      } catch (modelError) {
        console.error(`Summarizer: Error with model ${model.id}:`, modelError);
        lastError = modelError;
        continue;
      }
    }

    console.error("Summarizer: All models failed. Last error:", lastError);
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
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
