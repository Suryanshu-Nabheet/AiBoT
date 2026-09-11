/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import React, { memo } from "react";
import { TextShimmer } from "@/components/core/text-shimmer";
import { ThinkingBar } from "@/components/core/thinking-bar";
import {
  ChatMessage,
  type ChatMessageLayout,
} from "@/components/chat/chat-message";
import { Message, Role } from "@/lib/types";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

export const ChatThread = memo(
  ({
    messages,
    isLoading,
    loadingStatus,
    thinkingRequested,
    onCopy,
    onModelSelect,
    layout = "thread",
    pdfFileName,
    pdfTitle,
    className,
    endRef,
  }: {
    messages: Message[];
    isLoading: boolean;
    loadingStatus: string;
    thinkingRequested?: boolean;
    onCopy: (content: string) => void;
    onModelSelect?: (modelId: string) => void;
    layout?: ChatMessageLayout;
    pdfFileName?: string;
    pdfTitle?: string;
    className?: string;
    endRef?: React.Ref<HTMLDivElement>;
  }) => {
    const { t } = useTranslation();
    const statusPadding =
      layout === "arena" ? "px-2 sm:px-3" : "px-2 sm:px-4 md:px-6 lg:px-8";

    return (
      <div className={cn("flex flex-col gap-1 pb-4 sm:gap-1.5", className)}>
        {messages.map((message, i) => {
          const isLast = i === messages.length - 1;
          const isAgentGenerating =
            isLoading && isLast && message.role === Role.Agent;
          const msgIsThinking = message.isThinkingRequested;
          const showLoadingStatus =
            isAgentGenerating &&
            (msgIsThinking ? !message.content.trim() : true);

          return (
            <React.Fragment key={message.id || i}>
              {showLoadingStatus && loadingStatus && (
                <div className={cn(statusPadding, "mb-2")}>
                  <div
                    className={layout === "thread" ? "mx-auto max-w-4xl" : ""}
                  >
                    {msgIsThinking ? (
                      <ThinkingBar text={t("chat.thinking.inProgress")} />
                    ) : (
                      <TextShimmer
                        className="text-sm font-medium opacity-60"
                        duration={1.2}
                      >
                        {loadingStatus}
                      </TextShimmer>
                    )}
                  </div>
                </div>
              )}
              <ChatMessage
                message={message}
                onCopy={onCopy}
                onModelSelect={onModelSelect}
                isGenerating={isAgentGenerating}
                layout={layout}
                pdfFileName={pdfFileName}
                pdfTitle={pdfTitle}
              />
            </React.Fragment>
          );
        })}

        {isLoading &&
          messages.length > 0 &&
          messages[messages.length - 1].role === Role.User &&
          loadingStatus && (
            <div className={cn(statusPadding, "mb-2")}>
              <div className={layout === "thread" ? "mx-auto max-w-4xl" : ""}>
                {thinkingRequested ? (
                  <ThinkingBar text={t("chat.status.connecting")} />
                ) : (
                  <TextShimmer
                    className="text-sm font-medium opacity-60"
                    duration={1.2}
                  >
                    {loadingStatus}
                  </TextShimmer>
                )}
              </div>
            </div>
          )}

        <div ref={endRef} className="h-1" />
      </div>
    );
  },
);

ChatThread.displayName = "ChatThread";
