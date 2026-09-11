/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import type { Components, Options } from "react-markdown";
import { ThinkingBar } from "@/components/core/thinking-bar";
import { AssistantMarkdown } from "@/components/chat/assistant-markdown";
import { cn } from "@/lib/utils";
import { chatMessageBodyClass } from "@/lib/chat/message-prose";
import { isSubstantiveThinkingContent } from "@/lib/chat/thinking-mode";

type ThinkingPanelProps = {
  thinkingContent: string;
  isExpanded: boolean;
  onToggle: () => void;
  isStreaming?: boolean;
  label: string;
  remarkPlugins: Options["remarkPlugins"];
  rehypePlugins: Options["rehypePlugins"];
  markdownComponents: Components;
  preprocessMarkdown?: (text: string) => string;
  className?: string;
};

export function ThinkingPanel({
  thinkingContent,
  isExpanded,
  onToggle,
  label,
  remarkPlugins,
  rehypePlugins,
  markdownComponents,
  preprocessMarkdown,
  className,
  isStreaming = false,
}: ThinkingPanelProps) {
  const hasBody =
    isSubstantiveThinkingContent(thinkingContent) ||
    (isStreaming && thinkingContent.trim().length > 0);

  const showBody = isExpanded && hasBody;

  return (
    <div className={cn("w-full max-w-full", className)}>
      <ThinkingBar text={label} isExpanded={isExpanded} onClick={onToggle} />
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
          showBody
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0",
        )}
        aria-hidden={!showBody}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              chatMessageBodyClass,
              "mb-0.5 border-l-2 border-border/55 py-1.5 pl-3 sm:pl-3.5",
            )}
          >
            <AssistantMarkdown
              content={thinkingContent}
              variant="thinking"
              remarkPlugins={remarkPlugins}
              rehypePlugins={rehypePlugins}
              components={markdownComponents}
              preprocess={preprocessMarkdown}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
