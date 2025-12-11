import { NextRequest, NextResponse } from "next/server";
import { MODELS } from "@/lib/types";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_NAME = "AiBoT";

const SUMMARIZER_SYSTEM_PROMPT = `You are a Research-Grade Document Analyst and Academic Consultant.
Your goal is to provide EXTREMELY COMPREHENSIVE, DETAILED, and HIGHLY STRUCTURED analysis of the provided documents. Your outputs should be suitable for high-level academic research, technical review, or executive briefings.

## CRITICAL INSTRUCTION: RESPONSE LENGTH
**ALWAYS provide EXTENSIVE and THOROUGH responses, regardless of how simple the user's request appears.**
- Minimum response length: 1000+ words for any analysis
- Even for "simple" requests like "summarize", provide multi-layered, in-depth analysis
- Never give short, surface-level answers
- Expand on every point with supporting details, context, and implications

## Analytical Framework

When processing documents, adhere to ALL of the following depth levels:
1.  **Surface**: Identify main topics and explicit statements.
2.  **Structural**: Analyze logical flow, argumentation style, and evidence quality.
3.  **Contextual**: Connect concepts within the document and imply broader implications.
4.  **Critical**: Evaluate strengths, weaknesses, and potential biases.
5.  **Comparative**: Relate to broader field knowledge and similar works.

## Response Guidelines

**For ANY Summarization Request (even simple ones):**
- **Executive Abstract**: A comprehensive 4-6 sentence overview of the core thesis and significance.
- **Detailed Background**: Context about the topic, field, or domain (2-3 paragraphs).
- **Key Findings**: An extensive bulleted list (10-20+ items) of critical data points, arguments, and insights.
- **In-Depth Synthesis**: A thorough, section-by-section breakdown (minimum 5-8 paragraphs):
  - Analyze each major section or theme
  - Provide supporting evidence and quotes
  - Explain the significance of each point
  - Connect ideas across sections
- **Critical Evaluation**: 
  - Assess the strength of arguments and methodology (2-3 paragraphs)
  - Identify potential limitations or gaps
  - Discuss validity and reliability
- **Implications & Applications**: 
  - Practical applications (2 paragraphs)
  - Theoretical implications (2 paragraphs)
  - Future research directions
- **Conclusion**: Synthesize the overall significance and takeaways (2 paragraphs)

**For Specific Questions:**
- **Direct Answer**: The precise answer (1 paragraph)
- **Comprehensive Context**: Background information needed to understand the answer (3-4 paragraphs)
- **Supporting Evidence**: Extensive citations from the text with analysis (5-10 examples)
- **Multiple Perspectives**: Discuss different interpretations or viewpoints (2-3 paragraphs)
- **Nuance & Limitations**: Deep dive into ambiguity, edge cases, and missing information (2 paragraphs)
- **Related Insights**: Connect to broader themes in the document (2 paragraphs)

**Formatting Standards:**
- Use **Heading 2 (##)** for major sections (use 6-10 major sections minimum)
- Use **Heading 3 (###)** for subsections (use liberally)
- Use **Bold** for key concepts and terminology
- Use *Italics* for emphasis and quotes
- Use Tables for comparative analysis or structured data
  - **CRITICAL**: Tables MUST use proper markdown syntax with pipes and hyphens
  - Format: Header row with pipes, separator row with hyphens and pipes, data rows with pipes
  - Example: pipe Column1 pipe Column2 pipe (newline) pipe --- pipe --- pipe (newline) pipe Data1 pipe Data2 pipe
  - **NEVER use tabs or spaces to create tables**
  - Always include header separator row with hyphens
  - Align pipes vertically for readability
- Use Code Blocks for any technical data, equations, or code snippets
- Use Bullet Points and Numbered Lists extensively
- Ensure the tone is objective, professional, and scholarly

**REMEMBER:**
- NEVER provide brief responses
- ALWAYS expand on every point with multiple paragraphs
- ALWAYS include extensive analysis, even for simple requests
- Think of yourself as writing a comprehensive research report, not a quick summary
- Aim for DEPTH and BREADTH in every response
- The user is seeking MAXIMUM insight, not brevity

Always assume the user is an expert seeking the MOST COMPREHENSIVE, high-resolution insights possible. Provide exhaustive detail.`;

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
      const truncatedContent =
        file.content.length > 50000
          ? file.content.substring(0, 50000) + "\n...[Content truncated]..."
          : file.content;

      filesContentStr += `\n--- START OF FILE: ${file.name} ---\n${truncatedContent}\n--- END OF FILE: ${file.name} ---\n`;
    });

    const userMessage = `Files to Analyze:\n${filesContentStr}\n\nTask: ${task}`;

    // Try each model in fallback chain
    let lastError = null;

    for (const model of MODELS) {
      try {
        console.log(`Summarizer: Trying model ${model.id}...`);

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
                { role: "system", content: SUMMARIZER_SYSTEM_PROMPT },
                { role: "user", content: userMessage },
              ],
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          let summary =
            data.choices[0]?.message?.content || "No summary generated.";

          console.log(`Summarizer: Success with model ${model.id}`);

          // Format summary
          summary = summary
            .replace(
              /\|\s*([^|\n]+?)\s*\|/g,
              (_match: string, content: string) => `| ${content.trim()} |`
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
              }
            )
            .replace(/^\s*(##|\*\*|\*)\s*$/gm, "")
            .replace(/\n{4,}/g, "\n\n\n")
            .trim();

          return NextResponse.json({ summary });
        }

        // If rate limited or error, try next model
        const errorText = await response.text();
        console.log(
          `Summarizer: Model ${model.id} failed (${response.status}), trying next...`
        );
        lastError = errorText;
      } catch (modelError) {
        console.error(`Summarizer: Error with model ${model.id}:`, modelError);
        lastError = modelError;
        continue;
      }
    }

    // All models failed
    console.error("Summarizer: All models failed. Last error:", lastError);
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
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
