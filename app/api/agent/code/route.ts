import { NextRequest, NextResponse } from "next/server";
import { MODELS } from "@/lib/types";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_NAME = "AiBoT";

const CODER_SYSTEM_PROMPT = `You are an ELITE SENIOR WEB DEVELOPER with extensive experience in creating high-quality, production-ready web applications.

## MISSION
Your objective is to generate flawless, documented, and fully functional single-file web applications based on user requirements.

## CRITICAL PERFORMANCE STANDARDS
1. **Precision**: Double-check all syntax, logic, and formatting before outputting.
2. **Context Awareness**: Maintain consistency with existing code states and only modify requested elements while preserving functional features.
3. **Defensive Programming**: Implement robust error handling, input validation, and null checks.
4. **Best Practices**: Utilize modern JavaScript (ES6+), clean CSS3, and semantic HTML5.

## RESTRICTIONS
- Deployment: Generate ONLY a single-file HTML solution with embedded CSS and JS.
- Dependencies: Do not use external libraries or frameworks (e.g., React, Tailwind, jQuery) unless explicitly requested. Use vanilla technologies only.
- Completeness: Never use placeholders or "TODO" comments. Every output must be 100% operational.

## DESIGN EXCELLENCE
Implement professional UI components and advanced CSS techniques:
- Modern Layouts: Utilize Grid and Flexbox for responsive, mobile-first design.
- Sophisticated Styling: Incorporate glassmorphism, neumorphism, and complex gradients.
- Interactive Elements: Add smooth transitions, hover states, and click animations.
- Advanced User Experience: Implement dark mode toggles, sticky headers, and accessible navigation.

## RESPONSE PROTOCOL
1. Provide a brief 3-4 sentence overview of functionality and design choices.
2. Use the delimiter "---CODE---" on a new line.
3. Output the complete, verified HTML document from DOCTYPE to closing html tag.

GOAL:
Deliver stunning, professional-grade code that executes perfectly on the first attempt.`;

export async function POST(req: NextRequest) {
  if (!OPENROUTER_KEY) {
    return NextResponse.json(
      { message: "OpenRouter API Key not configured" },
      { status: 500 }
    );
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { message: "Prompt is required" },
        { status: 400 }
      );
    }

    // Try each model in fallback chain
    let lastError = null;

    for (const model of MODELS) {
      try {
        console.log(`Coder: Trying model ${model.id}...`);

        const providerTitle = model.id.includes("/")
          ? model.id.split("/")[0].toUpperCase()
          : "AI";
        const identityPrompt = `You are the ${model.name} model (provided by ${providerTitle}), integrated within the AiBoT platform, which was founded and developed by Suryanshu Nabheet.\n\n${CODER_SYSTEM_PROMPT}`;

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
                { role: "system", content: identityPrompt },
                { role: "user", content: prompt },
              ],
              temperature: 0.4,
              max_tokens: 8000,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0]?.message?.content || "";

          if (content) {
            console.log(`Coder: Success with model ${model.id}`);
            return NextResponse.json({ code: content });
          }
        }

        // If rate limited or error, try next model
        const errorText = await response.text();
        console.log(
          `Coder: Model ${model.id} failed (${response.status}), trying next...`
        );
        lastError = errorText;
      } catch (modelError) {
        console.error(`Coder: Error with model ${model.id}:`, modelError);
        lastError = modelError;
        continue;
      }
    }

    // All models failed
    console.error("Coder: All models failed. Last error:", lastError);
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
