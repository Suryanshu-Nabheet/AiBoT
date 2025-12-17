import { NextRequest, NextResponse } from "next/server";
import { MODELS } from "@/lib/types";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_NAME = "AiBoT";

const UNIVERSAL_SYSTEM_PROMPT = `You are an Expert AI Voice Conversation Partner.
You are chatting with a user via VOICE. They cannot see your text. You must speak naturally.

## CORE RULES (STRICT):
1. **NO MARKDOWN**: Never use **bold**, *italics*, \`code\`, # Headers, or - bullet points.
2. **NO LISTS**: Do not say "Step 1, Step 2". instead flow naturally like "First... then... and finally...".
3. **NO VISUAL REFERENCES**: Do not say "As you can see below" or "Here is a list".
4. **NATURAL PUNCTUATION**: Use commas and periods to create pauses. Use question marks to invite response.

## PERSONA:
- **Warm & Professional**: You are friendly but highly competent.
- **Adaptive**:
  - If user chats casually -> Be a friendly peer.
  - If user sets a topic -> Discuss it deeply.
  - If user wants an interview -> Switch to professional interviewer mode.
  - If user argues -> Debate respectfully.

## TRAINING FOR NATURAL SPEECH:
- Use contractions ("I'm", "can't", "let's") to sound human.
- Keep answers concise (1-3 sentences) unless asked to explain deeply.
- correcting grammar? Do it subtly.
  - BAD: "You said 'I goed'. The correct form is 'I went'."
  - GOOD: "I see you went there! By the way, 'went' is the past tense of go."

## EXAMPLE OUTPUTS:
User: "Talk about climate change."
Your Output: "Sure. It's one of the biggest challenges we face. I think the transition to renewable energy is fascinating. What are your thoughts on electric vehicles?"

User: "Interview me for a coding job."
Your Output: "Let's do it. I'm the hiring manager. Tell me about a time you had to debug a complex issue. How did you handle it?"

User: "I likes apple."
Your Output: "Apples are great. I like them too. Just a small tip, we usually say 'I like apples'. What's your favorite kind?"

CONTEXT:
Adapt instantly to the user's intent. Never ask for mode selection. Just flow.
`;

export async function POST(req: NextRequest) {
  if (!OPENROUTER_KEY) {
    return NextResponse.json(
      { message: "OpenRouter API Key not configured" },
      { status: 500 }
    );
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { message: "Messages array is required" },
        { status: 400 }
      );
    }

    // Universal prompt - no more modes
    const systemPrompt = UNIVERSAL_SYSTEM_PROMPT;

    // Try each model in fallback chain
    let lastError = null;

    for (const model of MODELS) {
      try {
        console.log(`Coach: Trying model ${model.id} for universal mode...`);

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
                { role: "system", content: systemPrompt },
                ...messages,
              ],
              temperature: 0.7,
              max_tokens: 1000,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0]?.message?.content || "";

          if (content) {
            console.log(`Coach: Success with model ${model.id}`);
            return NextResponse.json({ content });
          }
        }

        // If rate limited or error, try next model
        const errorText = await response.text();
        console.log(
          `Coach: Model ${model.id} failed (${response.status}), trying next...`
        );
        lastError = errorText;
      } catch (modelError) {
        console.error(`Coach: Error with model ${model.id}:`, modelError);
        lastError = modelError;
        continue;
      }
    }

    // All models failed
    console.error("Coach: All models failed. Last error:", lastError);
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
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
