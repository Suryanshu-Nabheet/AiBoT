import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_NAME = "AiBoT";

// Use Llama 3.3 70B - much more powerful for code generation
const MODEL = "meta-llama/llama-3.3-70b-instruct:free";

const CODER_SYSTEM_PROMPT = `You are AiBoT, an expert web developer. You create complete, working websites using only HTML, CSS, and JavaScript.

<critical_rules>
1. Create ONLY single-file HTML documents with embedded <style> and <script> tags
2. NO external libraries, frameworks, or dependencies (no React, Vue, jQuery, Bootstrap, Tailwind)
3. ONLY vanilla HTML5, CSS3, and JavaScript ES6+
4. Every website must be 100% complete and functional
5. NEVER use placeholders, TODOs, or incomplete code
6. ALWAYS finish the entire HTML file - from <!DOCTYPE html> to </html>
</critical_rules>

<design_requirements>
- Modern, professional design with smooth animations
- Responsive layout (mobile, tablet, desktop)
- Interactive features with JavaScript
- Form validation where applicable
- Smooth transitions and hover effects
- Professional color schemes
- Clean, readable code with comments
</design_requirements>

<response_format>
IMPORTANT: Follow this exact format:

1. Write 2-3 sentences explaining what you're building
2. On a new line, write exactly: ---CODE---
3. Write the COMPLETE HTML code from <!DOCTYPE html> to </html>

Example:
I'm creating a modern portfolio website with smooth animations and a contact form. The design features a gradient background, animated sections, and form validation.
---CODE---
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portfolio</title>
    <style>
        /* Complete CSS here */
    </style>
</head>
<body>
    <!-- Complete HTML here -->
    <script>
        // Complete JavaScript here
    </script>
</body>
</html>
</response_format>

<quality_checklist>
Before finishing, ensure:
✓ HTML starts with <!DOCTYPE html> and ends with </html>
✓ All tags are properly closed
✓ CSS is complete and in <style> tags
✓ JavaScript is complete and in <script> tags
✓ All features are fully implemented
✓ Code is clean and commented
✓ Design is responsive
</quality_checklist>

Remember: Create complete, working websites. No shortcuts, no placeholders, no incomplete code.`;

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

    console.log(`API: Using model ${MODEL}...`);

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
          temperature: 0.3,
          max_tokens: 8000,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API Error:", errorText);
      return NextResponse.json(
        { message: "AI service temporarily unavailable. Please try again." },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "";

    if (!content) {
      return NextResponse.json(
        { message: "No code generated. Please try again." },
        { status: 500 }
      );
    }

    console.log(`API: Success with model ${MODEL}`);
    return NextResponse.json({ code: content });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
