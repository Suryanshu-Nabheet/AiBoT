/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

const LATEX_MATH_COMMAND_REGEX =
  /\\(?:text\w*|frac|sqrt|sum|int|left|right|begin|end|mathbf|mathrm|math(?:bb|cal|bf|rm|it)|operatorname|overline|overrightarrow|cdot|times|alpha|beta|theta|lambda|mu|sigma|pi|Delta|lim|log|sin|cos|tan|infty|partial|nabla|approx|equiv|to|rightarrow|cases|boldsymbol|hat|bar|circ|le|ge|pm|mp|neq)\b/;

/**
 * Strips outer enclosing parentheses only if the opening '(' at index 0
 * actually matches the closing ')' at the very end of the string.
 * Preserves compound parenthesized formulas like `(A) = (B)`.
 */
function stripOuterEnclosingParentheses(str: string): string {
  const trimmed = str.trim();
  if (!trimmed.startsWith("(") || !trimmed.endsWith(")")) return trimmed;
  let depth = 0;
  for (let i = 0; i < trimmed.length; i += 1) {
    if (trimmed[i] === "(") depth += 1;
    else if (trimmed[i] === ")") {
      depth -= 1;
      if (depth === 0 && i < trimmed.length - 1) {
        return trimmed;
      }
    }
  }
  return depth === 0 ? trimmed.slice(1, -1).trim() : trimmed;
}

/**
 * Normalizes mathematical formulas from model outputs into standard KaTeX/LaTeX delimiters.
 * Ensures display and inline equations parse cleanly without greedily consuming markdown prose.
 */
function normalizeMath(markdown: string): string {
  let result = markdown;

  // 1. Explicit display math: \[ ... \] -> $$ ... $$
  // Prevent runaway matches across blank lines or markdown headings
  result = result.replace(/\\\[([^\n]+|\n(?!\s*\n)[^\n]+)*?\\\]/g, (match) => {
    const formula = match.slice(2, -2).trim();
    if (!formula || /\n\s*\n|\n\s*#{1,6}\s/.test(formula)) return match;
    return `$$\n${formula}\n$$`;
  });

  // 2. Explicit inline math: \( ... \) -> $...$ (or $$ if multiline)
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, (match, formula: string) => {
    const trimmed = formula.trim();
    if (!trimmed || /\n\s*\n/.test(trimmed)) return match;
    return trimmed.includes("\n") ? `$$\n${trimmed}\n$$` : `$${trimmed}$`;
  });

  // 3. Bracketed display equations on their own lines: [ ... ]
  // ONLY match compact, single-formula blocks without markdown paragraphs or lists
  result = result.replace(
    /(^|\n)[ \t]*\[[ \t]*\n?([^\n]+(?:\n(?!\s*\n|\s*[-*•\d#])[^\n]+){0,6})\n?[ \t]*\][ \t]*(?=\n|$)/g,
    (match, before: string, formula: string) => {
      const trimmed = formula.trim();
      if (
        LATEX_MATH_COMMAND_REGEX.test(trimmed) &&
        !/\n\s*\n|\n\s*#{1,6}\s|[-*•]\s+\*\*|\bhttp/.test(trimmed) &&
        trimmed.length <= 400
      ) {
        return `${before}$$\n${trimmed}\n$$`;
      }
      return match;
    },
  );

  // 4. Standalone un-delimited equation lines with LaTeX commands:
  // e.g. \text{Angle A} + \text{Angle B} + \text{Angle C} = 180^\circ
  // or (\text{Midline}) = \frac{1}{2} \times (\text{Third Side})
  result = result.replace(
    /(^|\n)[ \t]*(\(?[ \t]*\\(?:text|frac|sqrt|sum|int)[^\n]+?\)?)[ \t]*(?=\n|$)/g,
    (match, before: string, line: string) => {
      const trimmed = line.trim();
      if (
        trimmed.startsWith("$$") ||
        trimmed.startsWith("$") ||
        trimmed.startsWith("-") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("#") ||
        /^\d+\./.test(trimmed)
      ) {
        return match;
      }
      const cleaned = stripOuterEnclosingParentheses(trimmed);
      if (LATEX_MATH_COMMAND_REGEX.test(cleaned)) {
        return `${before}$$\n${cleaned}\n$$`;
      }
      return match;
    },
  );

  // 5. Standalone algebraic/Pythagorean equations on their own line: e.g. a^2 + b^2 = c^2
  result = result.replace(
    /(^|\n)[ \t]*([a-zA-Z0-9]\^[0-9]\s*\+\s*[a-zA-Z0-9]\^[0-9]\s*=\s*[a-zA-Z0-9]\^[0-9])[ \t]*(?=\n|$)/g,
    (_match, before: string, formula: string) => `${before}$$\n${formula}\n$$`,
  );

  return result;
}

/** Normalize model markdown before react-markdown (headings, lists, spacing, math). */
export function preprocessAssistantMarkdown(text: string): string {
  if (!text?.trim()) return "";

  // Keep code blocks untouched while normalizing prose math and markdown
  const normalized = text
    .replace(/\r\n/g, "\n")
    .split(
      /(^[ \t]{0,3}(?:`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^[ \t]{0,3}(?:`{3,}|~{3,})[ \t]*(?:\n|$)|$(?![\s\S])))/gm,
    )
    .map((part) =>
      /^[ \t]{0,3}(?:`{3,}|~{3,})[^\n]*\n/.test(part)
        ? part
        : normalizeMath(part)
            // Remove duplicate leading hashes e.g. "### # Heading" -> "### Heading"
            .replace(/(^|\n)(#{1,6})\s*#+\s+/gm, "$1$2 ")
            // Normalize escaped hashes e.g. "\# Heading" -> "# Heading"
            .replace(/(^|\n)\\+(#{1,6}\s+)/gm, "$1$2")
            // Ensure headings without blank line before them get a blank line (CommonMark requirement)
            .replace(/([^\n])\n(#{1,6}\s+[^\n]+)/g, "$1\n\n$2")
            // ATX headings embedded in prose → own line
            .replace(/([^\n])\s+(#{1,6}\s+\S)/g, "$1\n\n$2")
            // "#Title" → "# Title"
            .replace(/^(#{1,6})([^\s#])/gm, "$1 $2")
            // Lone "# Label:" lines → h3
            .replace(/^#\s+([^#\n]+):\s*$/gm, "### $1")
            .replace(/^##\s+([^#\n]+):\s*$/gm, "### $1")
            .replace(/###\s*(\d+)\.\s*/g, "\n\n### $1. ")
            .replace(/([.!?])\s*###\s*/g, "$1\n\n### ")
            // Bold asterisks normalization: e.g. "* * text * *" or "** text **" -> "**text**"
            .replace(/\*\s+\*\s*([^*\n]+?)\s*\*+\s*\*/g, "**$1**")
            .replace(/\*\*\s+([^*\n]+?)\s+\*\*/g, "**$1**")
            .replace(/\*\*\s*:\s*/g, "**: ")
            // Definition / Example labeling
            .replace(/\s*-\s*Definition:/g, "\n\n**Definition:**")
            .replace(/\s*-\s*Example:/g, "\n\n**Example:**")
            .replace(/([.!?])\s*(\d+\.\s*[A-Z])/g, "$1\n\n$2")
            .replace(/\n{3,}/g, "\n\n"),
    )
    .join("");

  let out = normalized.trim();

  // If there is an odd count of display math $$ outside code blocks (e.g. streaming active),
  // close it cleanly so remark-math and KaTeX do not crash or corrupt the rest of the text.
  const displayMathTokens = out.match(/\$\$/g);
  if (displayMathTokens && displayMathTokens.length % 2 !== 0) {
    out = `${out}\n$$`;
  }

  return out;
}
