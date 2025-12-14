import { NextRequest, NextResponse } from "next/server";
import { AIBOT_SYSTEM_PROMPT } from "@/lib/prompts";

// Helper to convert Web Stream to Node Stream for AI SDK if needed,
// or just use standard fetch since we are in Next.js App Router.

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_NAME = "AiBoT";

// export const runtime = "edge"; // Switched to Node.js for better stability/logging

const MODELS = [
  "amazon/nova-2-lite-v1:free",
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-27b-it:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "qwen/qwen3-coder:free",
  "allenai/olmo-3-32b-think:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "google/gemma-3-12b-it:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "qwen/qwen3-235b-a22b:free",
  "openai/gpt-oss-20b:free",
  "mistralai/mistral-7b-instruct:free",
  "qwen/qwen3-4b:free",
  "google/gemma-3-4b-it:free",
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to optimize image tokens
const formatMessagesForOpenRouter = (messages: any[]) => {
  return messages.map((msg) => {
    if (typeof msg.content !== "string") return msg;

    // Check for markdown image syntax: ![alt](data:image/...)
    const imageRegex = /!\[.*?\]\((data:image\/.*?;base64,.*?)\)/g;
    if (!msg.content.match(imageRegex)) return msg;

    const contentParts = [];
    let lastIndex = 0;
    let match;

    // Reset regex state
    imageRegex.lastIndex = 0;

    while ((match = imageRegex.exec(msg.content)) !== null) {
      // Add text before image
      if (match.index > lastIndex) {
        const text = msg.content.substring(lastIndex, match.index).trim();
        if (text) contentParts.push({ type: "text", text });
      }

      // Add image
      const imageUrl = match[1];
      contentParts.push({
        type: "image_url",
        image_url: {
          url: imageUrl,
        },
      });

      lastIndex = imageRegex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < msg.content.length) {
      const text = msg.content.substring(lastIndex).trim();
      if (text) contentParts.push({ type: "text", text });
    }

    return {
      ...msg,
      content: contentParts,
    };
  });
};

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

  // No auto-switching: Try ONLY the requested model
  const targetModel = requestedModel || MODELS[0];

  try {
    console.log(`API: Attempting model ${targetModel}...`);

    // Optimize messages for Vision API
    const optimizedMessages = formatMessagesForOpenRouter(messages);

    let finalMessages = [...optimizedMessages];

    // Workaround for Gemma 3 models which don't support 'system' role (Developer instruction not enabled)
    const isGemma3 = targetModel.includes("gemma-3");

    if (isGemma3) {
      if (finalMessages.length > 0) {
        // Prepend system prompt to the first message if it's from user
        const firstMsg = finalMessages[0];
        if (firstMsg.role === "user") {
          // Handle both string content and array content (multimodal)
          if (typeof firstMsg.content === "string") {
            finalMessages[0] = {
              ...firstMsg,
              content: `${AIBOT_SYSTEM_PROMPT}\n\n${firstMsg.content}`,
            };
          } else if (Array.isArray(firstMsg.content)) {
            // Find the first text part and prepend
            const textPartIndex = firstMsg.content.findIndex(
              (c: any) => c.type === "text"
            );
            if (textPartIndex !== -1) {
              finalMessages[0].content[textPartIndex].text =
                `${AIBOT_SYSTEM_PROMPT}\n\n${finalMessages[0].content[textPartIndex].text}`;
            } else {
              // No text part, add one at the beginning
              finalMessages[0].content.unshift({
                type: "text",
                text: AIBOT_SYSTEM_PROMPT,
              });
            }
          }
        }
      }
    }

    const payloadMessages = isGemma3
      ? finalMessages
      : [{ role: "system", content: AIBOT_SYSTEM_PROMPT }, ...finalMessages];

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
          model: targetModel,
          messages: payloadMessages,
          stream: true,
          transforms: ["middle-out"], // Compress logic if still too large
        }),
      }
    );

    if (response.ok) {
      console.log(`API: Success with model ${targetModel}`);
      // Proxy the stream directly
      return new Response(response.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Handle Error
    const errorText = await response.text();
    console.warn(
      `API: Failed with model ${targetModel} (${response.status}):`,
      errorText
    );

    let errorMessage = "Provider returned error";
    try {
      const parsed = JSON.parse(errorText);
      errorMessage =
        parsed?.error?.metadata?.raw || parsed?.error?.message || errorText;
    } catch {
      errorMessage = errorText;
    }

    return NextResponse.json(
      {
        message: errorMessage,
        code: response.status,
        isRateLimit: response.status === 429,
      },
      { status: response.status }
    );
  } catch (error) {
    console.error(`API: Network error with model ${targetModel}:`, error);
    return NextResponse.json({ message: String(error) }, { status: 500 });
  }
}
