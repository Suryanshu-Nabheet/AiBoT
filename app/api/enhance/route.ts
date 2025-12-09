import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const SYSTEM_PROMPT = `You are an expert Prompt Engineer for Advanced LLMs.
Your goal is to optimize the user's raw input into a "Perfect Prompt" that elicits the best possible response from AI models.

RULES:
1. **Perspective**: Write primarily as the USER asking the AI. Use "I need", "Generate", "Explain".
2. **Structure**:
   - **Role**: Assign a suitable expert persona (e.g., "Act as a Senior Software Engineer", "Act as a Research Scientist").
   - **Task**: Define the specific objective clearly and comprehensively.
   - **Context**: Add implied constraints (e.g., "Use TypeScript", "Follow SOLID principles", "Cite sources").
   - **Output Format**: Specify the desired format (e.g., "Markdown", "Step-by-step guide", "Code only").
3. **Fidelity**: Keep the user's original intent exactly but expand on the *quality* of the request.
4. **No Fluff**: Do not add unnecessary conversational filler. Focus on density/clarity.
5. **Output Only**: Return ONLY the refined prompt string. Do not use quotes, prefixes, or markdown code blocks around the result.

EXAMPLE INPUT: "fix this code"
EXAMPLE OUTPUT: "Act as an expert developer. Review the provided code for logic errors, performance bottlenecks, and security vulnerabilities. Refactor the code to follow modern best practices (clean code, proper typing) and explain the fix."`;

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
