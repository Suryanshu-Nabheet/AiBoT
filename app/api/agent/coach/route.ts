/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { NextRequest, NextResponse } from "next/server";
import { MODELS } from "@/lib/types";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_NAME = "AiBoT";

const UNIVERSAL_SYSTEM_PROMPT = `You are an Expert AI Voice Conversation Partner.
You are chatting with a user via VOICE. They cannot see your text. You must speak naturally without visual formatting or unconventional syntax.

## CORE RULES
1. **NO MARKDOWN**: Never use bold, italics, code blocks, headers, or bullet points.
2. **NO LISTS**: Do not use "Step 1, Step 2". Instead, maintain a natural conversational flow using transition words like "First", "then", and "finally".
3. **NO VISUAL REFERENCES**: Do not use phrases like "As you can see below" or "Here is a list".
4. **NATURAL PUNCTUATION**: Use standard commas and periods to create natural pauses during speech synthesis.

## PERSONA
- **Professional and Engaging**: Maintain a highly competent yet accessible tone.
- **Adaptive**:
  - Casual Chat: Function as a supportive and knowledgeable peer.
  - Deep Discussion: Provide thorough academic or technical insights.
  - Professional Mock Interview: Assume the role of a rigorous interviewer.
  - Debate: Present objective counter-arguments respectfully.

## NATURAL SPEECH OPTIMIZATION
- Use standard contractions (e.g., "I'm", "can't") to improve speech cadence.
- Prioritize concise responses (1-3 sentences) unless the context requires detailed explanation.
- Address any linguistic nuances subtly without breaking the conversation flow.

CONTEXT:
Adapt immediately to user intent. Maintain a seamless conversational flow without meta-commentary on the selected mode.`;

export async function POST(req: NextRequest) {
  if (!OPENROUTER_KEY) {
    return NextResponse.json(
      { message: "OpenRouter API Key not configured" },
      { status: 500 }
    );
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { message: "Messages array is required" },
        { status: 400 }
      );
    }

    // Universal prompt - no more modes
    const systemPrompt = UNIVERSAL_SYSTEM_PROMPT;

    // Try each model in fallback chain
    let lastError = null;

    for (const model of MODELS) {
      try {
        console.log(`Coach: Trying model ${model.id} for universal mode...`);

        const providerTitle = model.id.includes("/")
          ? model.id.split("/")[0].toUpperCase()
          : "AI";
        const identityPrompt = `You are the ${model.name} model (provided by ${providerTitle}), integrated within the AiBoT platform, which was founded and developed by Suryanshu Nabheet.\n\n${UNIVERSAL_SYSTEM_PROMPT}`;

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
              messages: [{ role: "system", content: identityPrompt }, ...messages],
              temperature: 0.7,
              max_tokens: 1000,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0]?.message?.content || "";

          if (content) {
            console.log(`Coach: Success with model ${model.id}`);
            return NextResponse.json({ content });
          }
        }

        // If rate limited or error, try next model
        const errorText = await response.text();
        console.log(
          `Coach: Model ${model.id} failed (${response.status}), trying next...`
        );
        lastError = errorText;
      } catch (modelError) {
        console.error(`Coach: Error with model ${model.id}:`, modelError);
        lastError = modelError;
        continue;
      }
    }

    // All models failed
    console.error("Coach: All models failed. Last error:", lastError);
    return NextResponse.json(
      {
        message:
          "All AI models are currently unavailable. Please try again in a moment.",
      },
      { status: 503 }
    );
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
