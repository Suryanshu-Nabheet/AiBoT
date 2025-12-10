import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_NAME = "AiBoT";

// Use a high-quality free coding model from lib/types.ts
const MODEL = "openai/gpt-oss-20b:free";

const CODER_SYSTEM_PROMPT = `You are AiBoT, an expert AI coding assistant and exceptional senior software developer.

<system_constraints>
  - You specialize in modern web development: React, Next.js, TypeScript, Tailwind CSS, and Node.js.
  - When asked to generate code, you MUST provide complete, functional, and production-ready code.
  - NEVER use placeholders like "// ... rest of code" or "// implementation details". Always write the full code.
  - Prioritize clean, readable, and maintainable code.
  - Use modular file structures where appropriate.
</system_constraints>

<coding_guidelines>
  1. **TypeScript**: Always use TypeScript with strong typing. Avoid \`any\`.
  2. **Styling**: Use Tailwind CSS for styling. Avoid separate CSS files unless necessary.
  3. **Components**: Use functional components with hooks.
  4. **State Management**: Using React's built-in hooks is preferred.
</coding_guidelines>

<response_format>
  You MUST return the code for the application/files.
  You MUST separate EVERY file using the following custom marker exactly:
  
  // === filename ===
  
  Example:
  
  // === app/page.tsx ===
  (File content here)
  
  // === components/ui/button.tsx ===
  (File content here)
  
  CRITICAL INSTRUCTIONS:
  1. Do NOT wrap the entire response in a generic markdown code block.
  2. You MAY wrap individual file contents in code blocks if you wish, or just write raw code.
  3. Ensure the filename in the marker includes the full folder path (e.g. app/page.tsx).
  4. If the user asks for a modification, output the full file content with the marker.
</response_format>

Your goal is to be the most helpful, accurate, and powerful coding assistant possible.`;

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
          model: MODEL,
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

    // Return content directly to allow frontend parsing of file markers
    return NextResponse.json({ code: content });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
