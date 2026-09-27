/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

/** Normalize model markdown before react-markdown (headings, lists, spacing). */
export function preprocessAssistantMarkdown(text: string): string {
  if (!text?.trim()) return "";

  // Model output commonly uses LaTeX's `\[ ... \]` and a standalone
  // `[ ... ]` pair for display equations. Normalize these before Markdown sees
  // separator lines such as `---` as headings or horizontal rules.
  const normalizeMath = (markdown: string) =>
    markdown
      .replace(
        /\\\[\s*\n?([\s\S]*?)\n?\\\]/g,
        (_match, formula: string) => `$$\n${formula}\n$$`,
      )
      .replace(
        /\\\(([\s\S]*?)\\\)/g,
        (_match, formula: string) => `$${formula}$`,
      )
      .replace(
        /(^|\n)([ \t]*)\[\s*\n([\s\S]*?)\n[ \t]*\]([ \t]*(?:\n|$))/g,
        (
          match,
          before: string,
          indent: string,
          formula: string,
          after: string,
        ) =>
          /\\(?:text\w*|frac|sqrt|sum|int|left|right|begin|end|mathbf|mathrm|math(?:bb|cal|bf|rm|it)|operatorname|overline|overrightarrow|cdot|times|alpha|beta|theta|lambda|mu|sigma|pi|Delta|lim|log|sin|cos|tan|infty|partial|nabla|approx|equiv|to|rightarrow|cases|boldsymbol|hat|bar)\b/.test(
            formula,
          )
            ? `${before}${indent}$$\n${formula.trim()}\n$$${after}`
            : match,
      );

  // Keep examples and literal code untouched while normalizing prose math.
  const normalized = text
    .replace(/\r\n/g, "\n")
    .split(
      /(^[ \t]{0,3}(?:`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^[ \t]{0,3}(?:`{3,}|~{3,})[ \t]*(?:\n|$)|$(?![\s\S])))/gm,
    )
    .map((part) =>
      /^[ \t]{0,3}(?:`{3,}|~{3,})[^\n]*\n/.test(part)
        ? part
        : normalizeMath(part)
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
            .replace(/\n{3,}/g, "\n\n"),
    )
    .join("");
  const out = normalized.trim();

  return out;
}
