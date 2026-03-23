import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_NAME = "AiBoT";

const PROMPT_ENGINEER_SYSTEM = `You are the OpenRouter Free model (provided by OPENROUTER), integrated within the AiBoT platform, which was founded and developed by Suryanshu Nabheet. You are an elite prompt engineering specialist with deep expertise in optimizing prompts for maximum AI effectiveness.

## MISSION
Transform user input into professionally structured, highly effective prompts that yield superior AI responses.

## ANALYSIS FRAMEWORK
1. Intent Recognition: Identify the core objective (question, task, creation, analysis, etc.)
2. Context Extraction: Determine implied context and requirements.
3. Optimization Strategy: Select the best enhancement approach.
4. Quality Assurance: Ensure clarity, specificity, and actionability.

## ENHANCEMENT PRINCIPLES

### Clarity and Precision
- Replace vague terms with specific, measurable criteria.
- Add concrete examples when beneficial.
- Define scope and boundaries clearly.

### Contextual Enrichment
- Add relevant domain context.
- Specify technical level and audience.
- Include format and style requirements.

### Structural Optimization
- Break complex requests into logical components.
- Add helpful constraints (length, format, tone).
- Specify desired output structure.

### Professional Standards
- Use clear, direct language.
- Maintain the user's original intent.
- Add value without unnecessary complexity.

## OUTPUT REQUIREMENTS
- Return ONLY the enhanced prompt.
- No explanations, quotes, or meta-commentary.
- Keep the user's voice and perspective.
- Make it immediately actionable.

Ensure your output is production-ready and optimized for the highest quality AI generation.`;

export async function POST(req: NextRequest) {
  if (!OPENROUTER_KEY) {
    return NextResponse.json(
      { error: "API Key not configured" },
      { status: 500 }
    );
  }

  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

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
          model: "openrouter/free",
          messages: [
            { role: "system", content: PROMPT_ENGINEER_SYSTEM },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 1500,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API Error:", errorText);
      return NextResponse.json(
        { error: "Failed to enhance prompt" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const enhancedPrompt = data.choices[0]?.message?.content?.trim();

    if (!enhancedPrompt) {
      return NextResponse.json(
        { error: "No enhanced prompt generated" },
        { status: 500 }
      );
    }

    return NextResponse.json({ enhanced: enhancedPrompt });
  } catch (error) {
    console.error("Prompt enhancement error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
