import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const SYSTEM_PROMPT = `You are a professional Prompt Engineer. Your task is to rewrite the user's raw input into a highly effective, clear, and structured prompt for an LLM. 
- Improve clarity and specificity.
- Add necessary context or constraints if implied.
- Use professional phrasing.
- Keep the intent exactly the same.
- Return ONLY the enhanced prompt text, no explanations or quotes.`;

export async function POST(req: NextRequest) {
  if (!OPENROUTER_KEY) {
    return NextResponse.json({ message: "API Key missing" }, { status: 500 });
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
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini", // Fast and cheap for this utility
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to enhance prompt");
    }

    const data = await response.json();
    const enhanced = data.choices[0]?.message?.content?.trim() || prompt;

    return NextResponse.json({ enhanced });
  } catch (error) {
    console.error("Enhance error:", error);
    return NextResponse.json(
      { message: "Failed to enhance prompt" },
      { status: 500 }
    );
  }
}
