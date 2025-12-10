import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_NAME = "AiBoT";

const SUMMARIZER_SYSTEM_PROMPT = `You are a Research-Grade Document Analyst and Academic Consultant.
Your goal is to provide deep, comprehensive, and highly structured analysis of the provided documents. Your outputs should be suitable for high-level academic research, technical review, or executive briefings.

## Analytical Framework

When processing documents, adhering to the following depth levels:
1.  **Surface**: Identify main topics and explicit statements.
2.  **Structural**: Analyze logical flow, argumentation style, and evidence quality.
3.  **Contextual**: Connect concepts within the document and imply broader implications.

## Response Guidelines

**For Summaries:**
- **Executive Abstract**: A high-level 3-4 sentence overview of the core thesis.
- **Key Findings**: A bulleted list of the most critical data points or arguments.
- **Detailed Synthesis**: A structured breakdown of the content, section by section or theme by theme.
- **Critical Evaluation**: Assess the strength of the arguments, methodology, or validity of the content.

**For Specific Questions:**
- **Direct Answer**: The precise answer to the query.
- **Supporting Evidence**: Cite specific sections, data, or quotes from the text.
- **Nuance & Limitations**: Discuss any ambiguity or missing info in the source text.

**Formatting Standards:**
- Use **Heading 2 (##)** for major sections.
- Use **Bold** for key concepts and terminology.
- Use *Italics* for emphasis.
- Use Code Blocks for any technical data, equations, or code snippets found.
- Ensure the tone is objective, professional, and scholarly.

Always assume the user is an expert seeking high-resolution insights, not a layman seeking simplification. Never oversimplify unless explicitly asked.`;

export async function POST(req: NextRequest) {
  if (!OPENROUTER_KEY) {
    return NextResponse.json(
      { message: "OpenRouter API Key not found" },
      { status: 500 }
    );
  }

  try {
    const { task, filesData } = await req.json();

    if (!task) {
      return NextResponse.json(
        { message: "Task is required" },
        { status: 400 }
      );
    }

    if (!filesData || !Array.isArray(filesData) || filesData.length === 0) {
      return NextResponse.json(
        { message: "No file content provided" },
        { status: 400 }
      );
    }

    // Construct the user message with file contents
    let filesContentStr = "";
    filesData.forEach((file: { name: string; content: string }) => {
      // Truncate content if it's too long (rough safety limit for context window)
      // Assuming a large context window model (128k+), but still good to be safe.
      // Let's limit per file to ~20k chars for now to safe on tokens if many files.
      // A improved version would use token counting.
      const truncatedContent =
        file.content.length > 50000
          ? file.content.substring(0, 50000) + "\n...[Content truncated]..."
          : file.content;

      filesContentStr += `\n--- START OF FILE: ${file.name} ---\n${truncatedContent}\n--- END OF FILE: ${file.name} ---\n`;
    });

    const userMessage = `Files to Analyze:\n${filesContentStr}\n\nTask: ${task}`;

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
          model: "openai/gpt-4o-mini", // Good balance of speed/cost/context
          messages: [
            { role: "system", content: SUMMARIZER_SYSTEM_PROMPT },
            { role: "user", content: userMessage },
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
    const summary =
      data.choices[0]?.message?.content || "No summary generated.";

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
