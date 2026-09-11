/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

/** Drop empty or too-short keys so API validation does not reject the whole request. */
export function sanitizeCustomKeysForRequest(
  keys: Record<string, string | undefined> | object | undefined,
): Record<string, string> | undefined {
  if (!keys || typeof keys !== "object") return undefined;

  const out: Record<string, string> = {};
  for (const [provider, value] of Object.entries(keys)) {
    const trimmed = (value ?? "").trim();
    if (trimmed.length >= 8) {
      out[provider] = trimmed;
    }
  }

  return Object.keys(out).length > 0 ? out : undefined;
}
