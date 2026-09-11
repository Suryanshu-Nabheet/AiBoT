/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

/** Extract text delta from one Ollama NDJSON line. */
export function deltaFromOllamaLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const data = JSON.parse(trimmed);
    const content = data.message?.content || data.response;
    return content ? String(content) : null;
  } catch {
    return null;
  }
}

/** Extract text delta from one OpenAI-style SSE line. */
export function deltaFromSseLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.startsWith("data: ")) return null;
  if (trimmed === "data: [DONE]") return null;
  try {
    const data = JSON.parse(trimmed.slice(6));
    const content = data.choices?.[0]?.delta?.content || data.content;
    return content ? String(content) : null;
  } catch {
    return null;
  }
}
