/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import React, { memo } from "react";
import { TextShimmer } from "@/components/core/text-shimmer";
import {
  ChatMessage,
  type ChatMessageLayout,
} from "@/components/chat/chat-message";
import { Message, Role } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isExplicitDocumentDeliverableRequest } from "@/lib/chat/document-work";
import { CHAT_THREAD_HORIZONTAL_INSET } from "@/lib/chat/thread-layout";

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
    const statusPadding = CHAT_THREAD_HORIZONTAL_INSET;
    let latestUserRequestedDocument = false;
    const documentRequestMessages = new Set<number>();
    messages.forEach((message, index) => {
      if (message.role === Role.User) {
        latestUserRequestedDocument = isExplicitDocumentDeliverableRequest(
          message.content ?? "",
        );
      } else if (
        message.role === Role.Assistant &&
        latestUserRequestedDocument
      ) {
        documentRequestMessages.add(index);
      }
    });

    return (
      <div
        className={cn(
          "flex min-w-0 flex-col gap-1 sm:gap-1.5",
          layout === "arena" ? "pb-2" : "pb-4",
          className,
        )}
      >
        {messages.map((message, i) => {
          const isLast = i === messages.length - 1;
          const isAssistantGenerating =
            isLoading && isLast && message.role === Role.Assistant;
          const msgIsThinking = message.isThinkingRequested;
          // Thinking mode uses ThinkingPanel on the message — avoid a second ThinkingBar here.
          const showLoadingStatus =
            isAssistantGenerating && !msgIsThinking && Boolean(loadingStatus);

          return (
            <React.Fragment key={message.id || i}>
              {showLoadingStatus && (
                <div className={cn(statusPadding, "mb-2")}>
                  <div
                    className={layout === "thread" ? "mx-auto max-w-4xl" : ""}
                  >
                    <TextShimmer className="text-sm font-medium" duration={1.2}>
                      {loadingStatus}
                    </TextShimmer>
                  </div>
                </div>
              )}
              <ChatMessage
                message={message}
                onCopy={onCopy}
                onModelSelect={onModelSelect}
                isGenerating={isAssistantGenerating}
                layout={layout}
                pdfFileName={pdfFileName}
                pdfTitle={pdfTitle}
                isDocumentRequest={documentRequestMessages.has(i)}
              />
            </React.Fragment>
          );
        })}

        {isLoading &&
          messages.length > 0 &&
          messages[messages.length - 1].role === Role.User &&
          loadingStatus &&
          !thinkingRequested && (
            <div className={cn(statusPadding, "mb-2")}>
              <div className={layout === "thread" ? "mx-auto max-w-4xl" : ""}>
                <TextShimmer className="text-sm font-medium" duration={1.2}>
                  {loadingStatus}
                </TextShimmer>
              </div>
            </div>
          )}

        <div ref={endRef} className="h-1" />
      </div>
    );
  },
);

ChatThread.displayName = "ChatThread";
