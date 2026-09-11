/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

/**
 * Shared typography / spacing for assistant message markdown.
 */

import { cn } from "@/lib/utils";

/** Single body size for thinking trace + final answer */
export const chatMessageBodyClass = "text-sm leading-[1.65]";

/** Answer body — full contrast */
export const assistantMarkdownClass = cn(
  chatMessageBodyClass,
  "prose prose-sm dark:prose-invert max-w-none w-full",
  "prose-p:my-2 prose-p:text-sm prose-p:leading-[1.65] prose-p:text-foreground",
  "prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground",
  "prose-headings:mt-4 prose-headings:mb-2 prose-headings:first:mt-0",
  "prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-h4:text-sm",
  "prose-ol:my-2 prose-ul:my-2",
  "prose-li:my-0.5 prose-li:text-sm prose-li:leading-[1.65]",
  "prose-strong:font-semibold prose-strong:text-sm prose-strong:text-foreground",
  "prose-pre:my-3 prose-pre:max-w-full prose-pre:text-xs",
  "prose-code:text-xs prose-code:break-words prose-img:rounded-lg prose-img:max-w-full",
);

/** Reasoning trace — muted color only; same metrics as answer */
export const thinkingMarkdownClass = cn(
  assistantMarkdownClass,
  "text-muted-foreground",
  "prose-p:text-muted-foreground prose-headings:text-muted-foreground",
  "prose-strong:text-muted-foreground prose-strong:font-medium prose-li:text-muted-foreground",
);

export const markdownOverflowClass = cn(
  "w-full max-w-full overflow-x-auto scrollbar-thin",
  "[&_*]:max-w-full",
  "[&_table]:w-full [&_table]:table-auto [&_table]:border-collapse",
  "[&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:bg-muted/50 [&_th]:break-words [&_th]:text-xs",
  "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5 [&_td]:break-words [&_td]:text-sm",
  "[&_pre]:overflow-x-auto [&_pre]:max-w-full",
  "[&_code]:text-xs [&_code]:break-words [&_code]:overflow-wrap-anywhere",
  "[&_p]:break-words [&_li]:break-words",
  "[&_h1]:break-words [&_h2]:break-words [&_h3]:break-words",
);
