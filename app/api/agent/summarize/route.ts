import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_NAME = "AiBoT";

const SUMMARIZER_SYSTEM_PROMPT = `You are AiBoT's Document Analyzer - smart, efficient, and helpful.

Your job is to help users understand and work with their documents quickly.

## How to Respond:

**For Summarization Requests:**
- Provide a clear, structured summary of the document
- Focus on key points, main ideas, and important details
- Use bullet points and headers for easy scanning
- Keep it concise but comprehensive

**For Questions About Documents:**
- Answer directly based on the file name and typical content
- If you can infer the answer from context, provide it
- Be honest if you need more information
- Suggest what the user should look for

**For Analysis Requests:**
- Break down the document structure
- Highlight important sections or themes
- Provide actionable insights

## Response Style:
- **Direct**: Get to the point immediately
- **Clear**: Use simple language and good formatting
- **Helpful**: Anticipate follow-up questions
- **Honest**: Say if you need the actual file content to give a better answer

Remember: You're helping someone work faster and smarter. Make every word count.`;

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
