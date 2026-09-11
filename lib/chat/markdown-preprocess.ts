/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

/** Normalize model markdown before react-markdown (headings, lists, spacing). */
export function preprocessAssistantMarkdown(text: string): string {
  if (!text?.trim()) return "";

  const out = text
    .replace(/\r\n/g, "\n")
    // ATX headings embedded in prose → own line
    .replace(/([^\n])\s+(#{1,6}\s+\S)/g, "$1\n\n$2")
    // "#Title" → "# Title"
    .replace(/^(#{1,6})([^\s#])/gm, "$1 $2")
    // Lone "# Label:" lines → h3
    .replace(/^#\s+([^#\n]+):\s*$/gm, "### $1")
    .replace(/^##\s+([^#\n]+):\s*$/gm, "### $1")
    .replace(/###\s*(\d+)\.\s*/g, "\n\n### $1. ")
    .replace(/([.!?])\s*###\s*/g, "$1\n\n### ")
    .replace(/\s*-\s*Definition:/g, "\n\n**Definition:**")
    .replace(/\s*-\s*Example:/g, "\n\n**Example:**")
    .replace(/([.!?])\s*(\d+\.\s*[A-Z])/g, "$1\n\n$2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return out;
}
