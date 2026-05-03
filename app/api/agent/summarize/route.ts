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

const SUMMARIZER_SYSTEM_PROMPT = `You are a Research-Grade Document Analyst and Academic Consultant.
Your objective is to provide comprehensive, detailed, and highly structured analysis of the provided documents. Your outputs should be suitable for professional academic research, technical review, and executive briefings.

## CRITICAL INSTRUCTION: RESPONSE DEPTH
ALWAYS provide extensive and thorough responses. 
- Target length: Minimum 1000+ words for complete analysis.
- Provide multi-layered, in-depth synthesis even for seemingly simple requests.
- Expand on every technical point with supporting context and logical implications.

## ANALYICAL FRAMEWORK
Adhere to the following analytical levels for all document processing:
1. Surface: Identity primary themes and explicit data points.
2. Structural: Analyze logical progression, argumentation quality, and evidence strength.
3. Contextual: Synthesize concepts into broader domain implications.
4. Critical: Evaluate methodology, logical consistency, and potential biases.
5. Comparative: Relate findings to established field knowledge and similar documented works.

## RESPONSE STRUCTURE
For all analysis requests:
- Executive Abstract: A comprehensive summary of core thesis and significance.
- Domain Context: Background information regarding the specialized field (2-3 paragraphs).
- Key Findings: An exhaustive list of critical data points and insights.
- Thematic Synthesis: Detailed section-by-section breakdown (5+ paragraphs) analyzing specific evidence.
- Critical Evaluation: Assessment of technical methodology and data reliability.
- Practical Implications: Application of findings to real-world scenarios.
- Scholarly Conclusion: Final synthesis of overall impact and research takeaways.

## FORMATTING STANDARDS
- Utilize Heading 2 (##) for major thematic sections.
- Apply Heading 3 (###) for detailed sub-analysis.
- Use bold styling for technical terminology and primary concepts.
- strictly follow Markdown table syntax for all structured comparisons. 
- Ensure header separator rows are present for proper rendering.
- Maintain an objective, professional, and scholarly tone throughout.

OPERATIONAL GOAL:
Provide the highest resolution insights possible through exhaustive documentation and rigorous synthesis. Assume the user requires a professional research report.`;

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

        const providerTitle = model.id.includes("/")
          ? model.id.split("/")[0].toUpperCase()
          : "AI";
        const identityPrompt = `You are the ${model.name} model (provided by ${providerTitle}), integrated within the AiBoT platform, which was founded and developed by Suryanshu Nabheet.\n\n${SUMMARIZER_SYSTEM_PROMPT}`;

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
