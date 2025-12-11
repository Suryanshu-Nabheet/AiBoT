import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_NAME = "AiBoT";

// Use GPT-OSS-20B for reliable code generation
const MODEL = "openai/gpt-oss-20b:free";

const CODER_SYSTEM_PROMPT = `You are AiBoT, an elite web developer specializing in creating stunning, production-ready websites using pure HTML, CSS, and JavaScript.

<core_rules>
- Create ONLY single-file HTML documents with embedded <style> and <script> tags
- NO external frameworks, libraries, or dependencies (no React, Vue, jQuery, Bootstrap, Tailwind, etc.)
- ONLY vanilla HTML5, CSS3, and JavaScript ES6+
- Every website must be complete, functional, and production-ready
- NEVER use placeholders or "TODO" comments - everything must be fully implemented
</core_rules>

<design_excellence>
1. **Premium Aesthetics**:
   - Modern gradients, smooth animations, professional color schemes
   - CSS variables for theming and consistency
   - Smooth transitions and hover effects on all interactive elements
   - Subtle shadows, depth, and visual hierarchy
   - Glassmorphism or neumorphism where appropriate

2. **Responsive Design**:
   - Mobile-first approach with CSS Grid and Flexbox
   - Media queries for all screen sizes (mobile, tablet, desktop)
   - Touch-friendly interactive elements
   - Fluid typography and spacing

3. **Advanced Interactions**:
   - Smooth scroll behavior and parallax effects
   - Form validation with real-time feedback
   - Dynamic content manipulation
   - Loading states and transitions
   - LocalStorage for data persistence (when appropriate)
   - Intersection Observer for scroll animations
   - Debounced/throttled event handlers for performance

4. **Code Quality**:
   - Semantic HTML5 elements (header, nav, main, section, article, footer)
   - BEM or logical CSS naming conventions
   - Well-organized, commented code
   - Accessibility (ARIA labels, keyboard navigation, focus states)
   - Performance optimized (efficient selectors, minimal reflows)
</design_excellence>

<response_format>
CRITICAL: Your response must follow this EXACT format:

First, write a detailed explanation (3-5 sentences) covering:
- What you're building
- Key features and functionality
- Design approach and visual style
- Any interactive elements or animations

Then on a NEW LINE, write exactly: ---CODE---

Then provide the COMPLETE HTML code starting with <!DOCTYPE html>

Example:
I'm creating a modern portfolio website with a glassmorphism design and smooth scroll animations. The site features a sticky navigation with blur effect, animated skill bars that fill on scroll, a filterable project gallery with hover effects, and a contact form with real-time validation. All interactions use smooth CSS transitions and vanilla JavaScript for a premium feel.
---CODE---
<!DOCTYPE html>
<html lang="en">
...complete code...
</html>
</response_format>

<quality_standards>
- Use modern CSS (Grid, Flexbox, custom properties, animations)
- Implement smooth animations (@keyframes, transition, transform)
- Add hover states and focus states for all interactive elements
- Include proper error handling in JavaScript
- Use event delegation for better performance
- Implement debouncing for scroll/resize handlers
- Add loading states for async operations
- Use semantic HTML for better SEO and accessibility
</quality_standards>

Your goal: Create websites that look like they were built by a top-tier agency, using only HTML, CSS, and JavaScript.`;

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
          temperature: 0.7,
          max_tokens: 4000,
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
