import { NextRequest, NextResponse } from "next/server";
import { AIBOT_SYSTEM_PROMPT } from "@/lib/prompts";

// Helper to convert Web Stream to Node Stream for AI SDK if needed,
// or just use standard fetch since we are in Next.js App Router.

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_NAME = "AiBoT";

// export const runtime = "edge"; // Switched to Node.js for better stability/logging

const MODELS = [
  "openai/gpt-oss-20b:free", // User requested default
  "google/gemini-2.0-flash-exp:free",
  "google/gemini-2.0-flash-thinking-exp:free",
  "meta-llama/llama-3.2-11b-vision-instruct:free",
  "huggingfaceh4/zephyr-7b-beta:free",
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  if (!OPENROUTER_KEY) {
    console.error("API: OpenRouter API Key missing");
    return NextResponse.json(
      { message: "OpenRouter API Key not found" },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const { messages, model: requestedModel } = body;

  // Use requested model if it's NOT the default free one (user selected specific),
  // otherwise start with our list.
  // Actually, to robustly handle "free" users, we should treat the requested
  // model as the first candidate if strictly provided, or default to our list.

  // Strategy: If user explicitly chose a model in UI, try that first.
  // If it fails, failover to others ONLY if it was one of our default free ones.
  // For simplicity: We will ALWAYS try the list if the first one fails,
  // assuming the user wants *any* answer rather than no answer.

  const candidateModels = requestedModel
    ? [requestedModel, ...MODELS.filter((m) => m !== requestedModel)]
    : MODELS;

  let lastError = null;
  let lastStatus = 500;

  for (const model of candidateModels) {
    try {
      console.log(`API: Attempting model ${model}...`);

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
            model: model,
            messages: [
              { role: "system", content: AIBOT_SYSTEM_PROMPT },
              ...messages,
            ],
            stream: true,
          }),
        }
      );

      if (response.ok) {
        console.log(`API: Success with model ${model}`);
        // Proxy the stream directly
        return new Response(response.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }

      // Handle Error via Retry
      const errorText = await response.text();
      console.warn(
        `API: Failed with model ${model} (${response.status}):`,
        errorText
      );

      lastStatus = response.status;
      try {
        const parsed = JSON.parse(errorText);
        lastError =
          parsed?.error?.metadata?.raw || parsed?.error?.message || errorText;
      } catch {
        lastError = errorText;
      }

      // If it's a rate limit (429) or Server Error (5xx), wait and retry next model
      if (response.status === 429 || response.status >= 500) {
        await delay(1000); // 1s backoff
        continue;
      }

      // If it's a 400/401 (client error), don't retry, just break and return error
      break;
    } catch (error) {
      console.error(`API: Network error with model ${model}:`, error);
      lastError = String(error);
      await delay(1000);
    }
  }

  // If we get here, all retries failed
  return NextResponse.json(
    {
      message: lastError || "All models failed. Please try again later.",
      code: lastStatus,
    },
    { status: lastStatus }
  );
}
