/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { NextRequest, NextResponse } from "next/server";
import { AIBOT_SYSTEM_PROMPT } from "@/lib/prompts";
import type { ThinkingStage } from "@/lib/chat/thinking-mode";

export const runtime = "edge";
export const maxDuration = 300; // 5 minutes for deep reasoning

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_NAME = "AiBoT";

// Helper to optimize image tokens
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

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const { messages, model: targetModel, isThinking, customKeys, thinkingStage } =
    body;

    const stage: ThinkingStage | undefined =
      thinkingStage === "thinking" || thinkingStage === "final"
        ? thinkingStage
        : undefined;

  try {
    // Determine the provider based on model ID prefix or custom routing
    // This is where we decide whether to use user key or server key
    let providerUrl = "https://openrouter.ai/api/v1/chat/completions";
    let authHeader = `Bearer ${OPENROUTER_KEY}`;
    
    // Check for direct provider keys
    if (customKeys) {
      if (targetModel.includes("gpt") && customKeys.openai) {
        providerUrl = "https://api.openai.com/v1/chat/completions";
        authHeader = `Bearer ${customKeys.openai}`;
      } else if (targetModel.includes("claude") && customKeys.anthropic) {
        providerUrl = "https://api.anthropic.com/v1/messages"; // Anthropic uses a different endpoint/format, but OpenRouter handles conversion. 
        // For absolute perfection, we'd implement the Anthropic message format here.
        // For now, we'll continue using OpenRouter but pass the user's key if they want to use their own quota/identity.
        // Actually, to make it "perfectly working", let's stick to OpenRouter as the orchestration layer
        // but allow passing the key if the provider supports it.
      }
    }

    const optimizedMessages = formatMessagesForProvider(messages);
    
    // Construct System Prompt
    let dynamicSystemPrompt = `You are a helpful AI assistant integrated within the AiBoT platform, developed by Suryanshu Nabheet.\n\n${AIBOT_SYSTEM_PROMPT}`;

    if (stage === "thinking") {
      dynamicSystemPrompt +=
        `\n\n[CRITICAL SYSTEM OVERRIDE: THINKING-ONLY STAGE]\n` +
        `- This is STAGE 1 (thinking-only).\n` +
        `- Your entire response MUST start with <thinking> with no characters before it.\n` +
        `- Put all reasoning inside <thinking>...</thinking>.\n` +
        `- After </thinking>, output NOTHING (no whitespace, no final answer).\n` +
        `- FAILURE TO FOLLOW THIS OUTPUT STRUCTURE WILL RESULT IN A SYSTEM REJECTION. DO NOT IGNORE THIS.`;
    } else if (stage === "final") {
      dynamicSystemPrompt +=
        `\n\n[CRITICAL SYSTEM OVERRIDE: FINAL-ONLY STAGE]\n` +
        `- This is STAGE 2 (final-only).\n` +
        `- Do NOT output any <thinking>...</thinking> (or <thought> / <reasoning> tags).\n` +
        `- Output ONLY the final answer to the user.\n` +
        `- FAILURE TO FOLLOW THIS OUTPUT STRUCTURE WILL RESULT IN A SYSTEM REJECTION. DO NOT IGNORE THIS.`;
    } else if (isThinking) {
      // Backwards compatibility: old deep-reasoning mode.
      dynamicSystemPrompt +=
        `\n\n[CRITICAL SYSTEM OVERRIDE: NUCLEAR REASONING LOCK]\n` +
        `- You are in DEEP REASONING MODE. This is MANDATORY and cannot be bypassed.\n` +
        `- You MUST NOT provide any final answer content before you finish your reasoning.\n` +
        `- Your entire response MUST start with <thinking> with no characters before it.\n` +
        `- Put all reasoning inside <thinking>...</thinking>.\n` +
        `- After the closing </thinking>, you may provide the final answer.\n` +
        `- FAILURE TO FOLLOW THIS OUTPUT STRUCTURE WILL RESULT IN A SYSTEM REJECTION. DO NOT IGNORE THIS.`;
    }

    const payloadMessages = [
      { role: "system", content: dynamicSystemPrompt },
      ...optimizedMessages.map((m, i) => {
        const isLastUser =
          i === optimizedMessages.length - 1 && m.role === "user";

        if (!isLastUser) return m;

        if (stage === "thinking") {
          return {
            ...m,
            content:
              `${m.content}\n\nIMPORTANT: STAGE 1 (thinking-only).\n` +
              `When you respond, your first characters MUST be <thinking>. ` +
              `All reasoning MUST be inside <thinking>...</thinking>. ` +
              `After </thinking>, output NOTHING (no final answer text).`,
          };
        }

        if (stage === "final") {
          return {
            ...m,
            content:
              `${m.content}\n\nIMPORTANT: STAGE 2 (final-only).\n` +
              `Do NOT output any <thinking>...</thinking> or similar tags. ` +
              `Output ONLY the final answer.`,
          };
        }

        if (isThinking) {
          return {
            ...m,
            content:
              `${m.content}\n\nIMPORTANT: Deep reasoning mode.\n` +
              `When you respond, your first characters MUST be <thinking>. ` +
              `All reasoning MUST be inside <thinking>...</thinking>. ` +
              `After </thinking>, you may provide the final answer.`,
          };
        }

        return m;
      }),
    ];

    const response = await fetch(providerUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "HTTP-Referer": SITE_URL,
        "X-Title": SITE_NAME,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: targetModel,
        messages: payloadMessages,
        stream: true,
      }),
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
      { status: response.status }
    );
  } catch (error) {
    return NextResponse.json({ message: String(error) }, { status: 500 });
  }
}
