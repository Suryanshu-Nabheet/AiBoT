/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { Geist_Mono } from "next/font/google";
import {
  CheckIcon,
  CopyIcon,
  DownloadSimple as DownloadIcon,
  PaperclipIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThinkingPanel } from "@/components/chat/thinking-panel";
import { AssistantMarkdown } from "@/components/chat/assistant-markdown";
import { useMarkdown } from "@/hooks/useMarkdown";
import { useSmoothTyping } from "@/hooks/use-smooth-typing";
import { useTranslation } from "@/hooks/use-translation";
import { Message, MODELS, Role } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  isSubstantiveThinkingContent,
  parseLegacyThinkingContent,
  polishThinkingDisplayContent,
} from "@/lib/chat/thinking-mode";
import { chatMessageBodyClass } from "@/lib/chat/message-prose";
import { CHAT_THREAD_HORIZONTAL_INSET } from "@/lib/chat/thread-layout";

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  preload: true,
  display: "swap",
});

export type ChatMessageLayout = "thread" | "arena";

const shellPadding = cn("py-2.5", CHAT_THREAD_HORIZONTAL_INSET);

const innerWidth: Record<ChatMessageLayout, string> = {
  thread: "max-w-4xl mx-auto",
  arena: "max-w-full",
};

export const ChatMessage = memo(
  ({
    message,
    onCopy,
    onModelSelect,
    isGenerating,
    layout = "thread",
    pdfFileName = "ai-response.pdf",
    pdfTitle = "AI Response",
    userMessageHint,
  }: {
    message: Message;
    onCopy: (content: string) => void;
    onModelSelect?: (modelId: string) => void;
    isGenerating?: boolean;
    layout?: ChatMessageLayout;
    pdfFileName?: string;
    pdfTitle?: string;
    userMessageHint?: string;
  }) => {
    const { t } = useTranslation();
    const [isCopied, setIsCopied] = useState(false);

    const handleMessageCopy = useCallback(
      async (content?: string) => {
        const textToCopy =
          typeof content === "string" ? content : message.content;
        await onCopy(textToCopy);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      },
      [onCopy, message.content],
    );

    const {
      preprocessMarkdown,
      markdownComponents,
      remarkPlugins,
      rehypePlugins,
    } = useMarkdown({
      onCopy: handleMessageCopy,
      copied: isCopied,
      isWrapped: false,
      resolvedTheme: "dark",
      geistMono,
    });

    const isUser = message.role === Role.User;
    const isStreaming = Boolean(isGenerating);
    const displayedContent = useSmoothTyping(
      message.content,
      5,
      Boolean(
        message.shouldAnimate && !isStreaming && !message.isThinkingRequested,
      ),
    );
    const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);
    const userToggledThinkingRef = useRef(false);
    const didAutoCollapseThinkingRef = useRef(false);

    useEffect(() => {
      userToggledThinkingRef.current = false;
      didAutoCollapseThinkingRef.current = false;
      setIsThinkingExpanded(true);
    }, [message.id]);

    const usesStructuredThinking =
      !isUser &&
      Boolean(
        message.thinkingText?.trim() ||
        (message.isThinkingRequested && isStreaming),
      );

    const legacyParsed =
      !isUser && !usesStructuredThinking
        ? parseLegacyThinkingContent(
            isStreaming ? message.content : displayedContent,
            { userMessageHint },
          )
        : null;

    const thinkingContent = usesStructuredThinking
      ? polishThinkingDisplayContent(message.thinkingText ?? "", {
          userMessageHint,
        })
      : (legacyParsed?.thinkingContent ?? "");

    const mainResponse = isUser
      ? message.content
      : usesStructuredThinking
        ? isStreaming
          ? message.content
          : displayedContent
        : (legacyParsed?.mainResponse ?? message.content);

    useEffect(() => {
      if (
        userToggledThinkingRef.current ||
        didAutoCollapseThinkingRef.current
      ) {
        return;
      }
      if (thinkingContent.trim() && mainResponse?.trim()) {
        didAutoCollapseThinkingRef.current = true;
        setIsThinkingExpanded(false);
      }
    }, [thinkingContent, mainResponse]);

    const handleThinkingToggle = useCallback(() => {
      userToggledThinkingRef.current = true;
      setIsThinkingExpanded((prev) => !prev);
    }, []);

    const hasThinkingPanel =
      !isUser &&
      Boolean(message.isThinkingRequested) &&
      (isSubstantiveThinkingContent(thinkingContent) ||
        (isStreaming && !mainResponse?.trim()));
    const showAnswer = !isUser && Boolean(mainResponse?.trim());
    const compactAgentContentClass =
      "bg-transparent text-foreground px-0 shadow-none border-none";

    return (
      <div className="w-full">
        <div className={shellPadding}>
          <div className={innerWidth[layout]}>
            <div className="flex w-full">
              <div
                className={cn(
                  "flex max-w-full flex-col",
                  isUser ? "ml-auto items-end" : "mr-auto items-start",
                  isUser ? "max-w-[min(100%,36rem)]" : "w-full",
                )}
              >
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {message.attachments.map((att, i) =>
                      att.type.startsWith("image/") ? (
                        <div
                          key={i}
                          className="relative max-w-full overflow-hidden rounded-lg border border-border/50"
                        >
                          <img
                            src={att.content}
                            alt={att.name}
                            className="max-h-[300px] w-auto rounded-lg object-contain"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/50 p-2 text-xs"
                        >
                          <PaperclipIcon className="size-3" />
                          <span className="max-w-[150px] truncate font-medium">
                            {att.name}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                )}

                {hasThinkingPanel && (
                  <ThinkingPanel
                    thinkingContent={thinkingContent}
                    isExpanded={isThinkingExpanded}
                    onToggle={handleThinkingToggle}
                    isStreaming={isStreaming}
                    label={t("chat.thinking.label")}
                    remarkPlugins={remarkPlugins}
                    rehypePlugins={rehypePlugins}
                    markdownComponents={markdownComponents}
                    preprocessMarkdown={preprocessMarkdown}
                    className={showAnswer ? "pb-0" : "pb-1"}
                  />
                )}

                {(isUser || showAnswer) && (
                  <div
                    className={cn(
                      "w-full max-w-full overflow-hidden break-words",
                      isUser
                        ? "px-0 py-1.5 text-sm text-foreground md:py-2"
                        : cn(
                            compactAgentContentClass,
                            chatMessageBodyClass,
                            hasThinkingPanel && showAnswer
                              ? "mt-0.5 border-t border-border/45 pt-3.5 pb-1.5"
                              : "py-1.5",
                          ),
                    )}
                  >
                    {isUser ? (
                      <div className="overflow-wrap-anywhere whitespace-pre-wrap break-words text-right text-[15px] font-medium leading-relaxed">
                        {mainResponse}
                      </div>
                    ) : (
                      <AssistantMarkdown
                        content={mainResponse}
                        variant="answer"
                        remarkPlugins={remarkPlugins}
                        rehypePlugins={rehypePlugins}
                        components={markdownComponents}
                        preprocess={preprocessMarkdown}
                      />
                    )}
                  </div>
                )}

                {!isUser &&
                  showAnswer &&
                  mainResponse.trim() &&
                  !isGenerating &&
                  (!message.isThinkingRequested || mainResponse.trim()) && (
                    <div className="mt-3 flex items-center gap-1.5 self-start transition-opacity duration-200">
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:text-foreground"
                              onClick={() => handleMessageCopy(mainResponse)}
                            >
                              {isCopied ? (
                                <CheckIcon className="size-4 text-green-500" />
                              ) : (
                                <CopyIcon className="size-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            className="px-2 py-1 text-[10px] font-bold"
                          >
                            {t("chat.message.copy")}
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:text-foreground"
                              onClick={async () => {
                                try {
                                  const { generatePDF } =
                                    await import("@/lib/pdf-utils");
                                  await generatePDF(
                                    mainResponse,
                                    pdfFileName,
                                    pdfTitle,
                                  );
                                  toast.success(t("toast.pdf.success"));
                                } catch (error) {
                                  console.error("PDF generation error:", error);
                                  toast.error(t("toast.pdf.fail"));
                                }
                              }}
                            >
                              <DownloadIcon className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            className="px-2 py-1 text-[10px] font-bold"
                          >
                            {t("chat.message.downloadPdf")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>

        {message.isError &&
          message.errorType === "rate_limit" &&
          onModelSelect && (
            <div className={cn(shellPadding)}>
              <div className={innerWidth[layout]}>
                <div className="flex flex-col gap-2">
                  <p className="ml-1 text-xs font-medium text-muted-foreground">
                    Recommended alternatives:
                  </p>
                  <div className="flex max-h-[300px] flex-wrap gap-2 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                    {MODELS.map((m) => (
                      <Button
                        key={m.id}
                        variant="outline"
                        size="sm"
                        className="h-7 whitespace-nowrap border-primary/10 bg-background/50 text-[10px] hover:border-primary/50 hover:bg-background md:text-xs"
                        onClick={() => onModelSelect(m.id)}
                      >
                        {m.name.replace(" (Free)", "")}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>
    );
  },
);

ChatMessage.displayName = "ChatMessage";
