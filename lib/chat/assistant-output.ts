/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

/** Lines some small models append (e.g. Liquid / safety-tuned weights). */
const MODEL_ARTIFACT_LINE =
  /^\s*(?:user\s+safety|response\s+safety|safety)\s*:\s*.+$/i;

/** Remove known junk lines and extra blank lines from model text. */
export function stripModelOutputArtifacts(text: string): string {
  const lines = text.split(/\r?\n/);
  const kept = lines.filter((line) => !MODEL_ARTIFACT_LINE.test(line.trim()));
  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Strip safety/metadata lines from assistant-visible text. */
export function cleanAssistantContent(raw: string): string {
  return stripModelOutputArtifacts(raw.trim());
}
