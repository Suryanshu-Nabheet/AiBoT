/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

/** Turn raw HTTP / JSON error bodies into user-facing chat text. */
export function formatChatApiErrorMessage(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "Something went wrong. Please try again.";

  try {
    const parsed = JSON.parse(trimmed) as {
      message?: string;
      issues?: { fieldErrors?: Record<string, string[]> };
    };
    if (parsed.message && parsed.message !== "Invalid arena request") {
      return parsed.message;
    }
    if (parsed.message === "Invalid arena request" || parsed.issues) {
      return "Could not start arena chat. Check model selection and API keys in Settings.";
    }
  } catch {
    // not JSON
  }

  return trimmed.length > 400 ? `${trimmed.slice(0, 400)}…` : trimmed;
}
