/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import ReactMarkdown from "react-markdown";
import type { Components, Options } from "react-markdown";
import { cn } from "@/lib/utils";
import {
  assistantMarkdownClass,
  markdownOverflowClass,
  thinkingMarkdownClass,
} from "@/lib/chat/message-prose";

type AssistantMarkdownProps = {
  content: string;
  variant: "answer" | "thinking";
  remarkPlugins: Options["remarkPlugins"];
  rehypePlugins: Options["rehypePlugins"];
  components: Components;
  preprocess?: (text: string) => string;
  className?: string;
};

export function AssistantMarkdown({
  content,
  variant,
  remarkPlugins,
  rehypePlugins,
  components,
  preprocess,
  className,
}: AssistantMarkdownProps) {
  const trimmed = content?.trim();
  if (!trimmed) return null;

  const source = preprocess ? preprocess(trimmed) : trimmed;

  return (
    <div
      className={cn(
        variant === "thinking" ? thinkingMarkdownClass : assistantMarkdownClass,
        markdownOverflowClass,
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
