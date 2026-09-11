/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

export function normalizeOllamaUrl(raw: string | undefined): string {
  let targetUrl = (raw ?? "").trim();
  if (!targetUrl) {
    targetUrl = "http://localhost:11434";
  }
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = `http://${targetUrl}`;
  }
  return targetUrl;
}
