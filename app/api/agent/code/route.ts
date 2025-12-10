import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_NAME = "AiBoT";
// Use a free model that is good at coding
const MODEL = "nvidia/nemotron-4-340b-instruct";

const CODER_SYSTEM_PROMPT = `You are an expert AI Coding Agent. Your goal is to generate high-quality, complete, and bug-free code based on the user's prompt. 
You specialize in React, Next.js, and TypeScript, but can code in any language.
Return ONLY code when asked for code, or a brief explanation if needed. 
Always aim for production-ready code with comments where necessary.
If generating a React component, ensure it's functional and uses Tailwind CSS for styling if appropriate.`;

export async function POST(req: NextRequest) {
  if (!OPENROUTER_KEY) {
    return NextResponse.json(
      { message: "OpenRouter API Key not found" },
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
          model: "openai/gpt-4o-mini", // Fallback to a generally good model or use a specific one
          messages: [
            { role: "system", content: CODER_SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API Error:", errorText);
      return NextResponse.json(
        { message: "Error from AI provider" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "// No code generated";

    // Basic extraction if the model wraps code in markdown blocks
    const codeBlockRegex =
      /```(?:typescript|javascript|tsx|jsx)?\n([\s\S]*?)```/;
    const match = content.match(codeBlockRegex);
    const code = match ? match[1] : content;

    return NextResponse.json({ code });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
