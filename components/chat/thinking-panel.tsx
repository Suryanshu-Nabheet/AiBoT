/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Components, Options } from "react-markdown";
import { ThinkingBar } from "@/components/core/thinking-bar";
import { AssistantMarkdown } from "@/components/chat/assistant-markdown";
import { cn } from "@/lib/utils";
import { chatMessageBodyClass } from "@/lib/chat/message-prose";

type ThinkingPanelProps = {
  thinkingContent: string;
  isExpanded: boolean;
  onToggle: () => void;
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
}: ThinkingPanelProps) {
  const hasBody = Boolean(thinkingContent?.trim());

  return (
    <div className={cn("w-full max-w-full", className)}>
      <ThinkingBar
        text={label}
        isExpanded={isExpanded}
        onClick={onToggle}
      />
      <AnimatePresence initial={false}>
        {isExpanded && hasBody && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
