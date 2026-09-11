/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import { v4 } from "uuid";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  PaperPlaneRightIcon,
  StopIcon,
  PaperclipIcon,
  MagicWandIcon,
  MicrophoneIcon,
  X as XIcon,
  CheckIcon,
  CopyIcon,
  ClipboardTextIcon,
  DownloadSimple as DownloadIcon,
} from "@phosphor-icons/react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ModelSelector } from "@/components/ui/model-selector";
import { cn } from "@/lib/utils";
import { ThinkingBar } from "@/components/core/thinking-bar";
import { ThinkingPanel } from "@/components/chat/thinking-panel";
import { AssistantMarkdown } from "@/components/chat/assistant-markdown";
import { TextShimmer } from "@/components/core/text-shimmer";
import { useChatSession } from "@/hooks/use-chat-session";
import { ChatInput } from "./chat-input";
import { Geist_Mono } from "next/font/google";
import { useSmoothTyping } from "@/hooks/use-smooth-typing";
import { Message, Role } from "@/lib/types";
import { useMarkdown } from "@/hooks/useMarkdown";
import { useTranslation } from "@/hooks/use-translation";
import { PageShell } from "@/components/layout/page-shell";
import { parseAssistantThinkingContent } from "@/lib/chat/thinking-mode";
import { chatMessageBodyClass } from "@/lib/chat/message-prose";
import { useThinkingMode } from "@/hooks/use-thinking-mode";

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  preload: true,
  display: "swap",
});

// Reusing Message Component logic but simplified for import/export if needed
// For speed, I'm duplicating the display logic or I should export it from chat-interface.
// To keep it clean and robust, I'll inline a simplified version here or duplicate for safety.
// Given strict instructions, I will duplicate the MessageComponent logic to ensure isolation.

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MessageComponent = memo(
  ({
    message,
    onCopy,
    isGenerating,
  }: {
    message: Message;
    onCopy: (content: string) => void;
    isGenerating?: boolean;
  }) => {
    const { t } = useTranslation();
    const {
      markdownComponents,
      remarkPlugins,
      rehypePlugins,
      preprocessMarkdown,
    } = useMarkdown({
      onCopy,
      copied: false,
      isWrapped: false,
      resolvedTheme: "dark",
      geistMono,
    });

    const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);
    const isUser = message.role === Role.User;
    const displayedContent = useSmoothTyping(
      message.content,
      5,
      message.shouldAnimate,
    );

    const {
      thinkingContent,
      mainResponse,
      hasThinkingTag,
      hideAnswerPanel,
    } = parseAssistantThinkingContent(
      isUser ? message.content : displayedContent,
      { isUser, isThinkingRequested: message.isThinkingRequested },
    );

    const hasThinkingPanel = !isUser && (hasThinkingTag || thinkingContent);
    const showAnswer =
      !isUser && !hideAnswerPanel && Boolean(mainResponse?.trim());
    const compactAgentContentClass =
      "bg-transparent text-foreground px-0 shadow-none border-none w-full max-w-full";

    const [isCopied, setIsCopied] = useState(false);
    const handleCopy = useCallback(async () => {
      await onCopy(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }, [onCopy, message.content]);

    return (
      <div
        className={cn(
          "flex flex-col w-full px-4 md:px-6 py-2",
          isUser ? "items-end" : "items-start",
        )}
      >
        {hasThinkingPanel && (
          <ThinkingPanel
            thinkingContent={thinkingContent}
            isExpanded={isThinkingExpanded}
            onToggle={() => setIsThinkingExpanded(!isThinkingExpanded)}
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
              "text-sm overflow-hidden break-words w-full",
              isUser
                ? "bg-muted text-foreground border border-border/50 rounded-2xl px-4 py-2.5 md:px-5 md:py-3 shadow-sm max-w-[85%]"
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
              <div className="whitespace-pre-wrap text-sm font-medium leading-relaxed">
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

        {/* Actions - Only show after final response is complete */}
        {!isUser &&
          mainResponse.trim() &&
          !isGenerating &&
          !hideAnswerPanel && (
            <div className="mt-2 flex items-center gap-1.5 self-start transition-opacity duration-200 animate-in fade-in slide-in-from-bottom-1">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full transition-all duration-200"
                      onClick={handleCopy}
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
                    className="text-[10px] px-2 py-1 font-bold"
                  >
                    Copy message
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full transition-all duration-200"
                      onClick={async () => {
                        try {
                          const { generatePDF } =
                            await import("@/lib/pdf-utils");
                          await generatePDF(
                            message.content,
                            "arena-response.pdf",
                            "Arena Response",
                          );
                          toast.success("PDF downloaded successfully!");
                        } catch (err) {
                          toast.error("Failed to generate PDF");
                        }
                      }}
                    >
                      <DownloadIcon className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="text-[10px] px-2 py-1 font-bold"
                  >
                    Download as PDF
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
      </div>
    );
  },
);
MessageComponent.displayName = "MessageComponent";

export default function ArenaInterface({
  conversationId: initialConversationId,
}: {
  conversationId?: string;
}) {
  const { t } = useTranslation();
  // Shared conversation ID for both panels to keep history unified
  const [arenaConversationId] = useState(() => initialConversationId || v4());

  // --- Dual Sessions ---
  const leftChat = useChatSession({
    storageKey: "arena-a",
    sessionId: "arena-a",
    conversationId: arenaConversationId,
    executionType: "ARENA",
    viewMode: "side-by-side",
  });
  const rightChat = useChatSession({
    storageKey: "arena-b",
    sessionId: "arena-b",
    conversationId: arenaConversationId,
    executionType: "ARENA",
    viewMode: "side-by-side",
  });

  // --- Shared Input State ---
  const [query, setQuery] = useState("");
  const [attachments, setAttachments] = useState<
    { name: string; content: string; type: string }[]
  >([]);
  const [isListening, setIsListening] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const { thinkingEnabled: isThinking, setThinkingEnabled: setIsThinking } =
    useThinkingMode("aibot_arena_thinking_enabled");

  const [leftLoadingStatus, setLeftLoadingStatus] = useState(
    "AiBoT is thinking...",
  );
  const [rightLoadingStatus, setRightLoadingStatus] = useState(
    "AiBoT is thinking...",
  );

  useEffect(() => {
    if (!leftChat.isLoading) {
      setLeftLoadingStatus(
        isThinking ? "AiBoT is thinking..." : "AiBoT is generating...",
      );
      return;
    }
    const statuses = isThinking
      ? [
          "AiBoT is thinking...",
          "Analyzing logical branches...",
          "Validating reasoning paths...",
          "Exploring deeper context...",
          "Synthesizing final thought...",
        ]
      : [
          "AiBoT is generating...",
          "Drafting response...",
          "Finalizing details...",
          "Polishing output...",
        ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % statuses.length;
      setLeftLoadingStatus(statuses[i]);
    }, 2000);
    return () => clearInterval(interval);
  }, [leftChat.isLoading, isThinking]);

  useEffect(() => {
    if (!rightChat.isLoading) {
      setRightLoadingStatus(
        isThinking ? "AiBoT is thinking..." : "AiBoT is generating...",
      );
      return;
    }
    const statuses = isThinking
      ? [
          "AiBoT is thinking...",
          "Analyzing logical branches...",
          "Validating reasoning paths...",
          "Exploring deeper context...",
          "Synthesizing final thought...",
        ]
      : [
          "AiBoT is generating...",
          "Drafting response...",
          "Finalizing details...",
          "Polishing output...",
        ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % statuses.length;
      setRightLoadingStatus(statuses[i]);
    }, 2000);
    return () => clearInterval(interval);
  }, [rightChat.isLoading, isThinking]);

  // --- Refs ---
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // --- Handlers ---
  const handleSharedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      (!query.trim() && attachments.length === 0) ||
      leftChat.isLoading ||
      rightChat.isLoading
    )
      return;

    const currentQuery = query;
    const currentAttachments = [...attachments]; // Capture current state

    setQuery("");
    setAttachments([]); // Clear immediately

    await Promise.all([
      leftChat.handleSend(
        currentQuery,
        currentAttachments,
        undefined,
        isThinking,
      ),
      rightChat.handleSend(
        currentQuery,
        currentAttachments,
        undefined,
        isThinking,
      ),
    ]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newAttachments: { name: string; content: string; type: string }[] =
        [];

      const { extractTextFromFile } = await import("@/lib/file-utils");

      for (const file of files) {
        try {
          if (file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            await new Promise<void>((resolve) => {
              reader.onload = () => {
                if (typeof reader.result === "string") {
                  newAttachments.push({
                    name: file.name,
                    content: reader.result,
                    type: file.type,
                  });
                }
                resolve();
              };
            });
          } else if (
            file.name.endsWith(".pdf") ||
            file.name.endsWith(".docx") ||
            file.name.endsWith(".doc") ||
            file.name.endsWith(".pptx") ||
            file.name.endsWith(".xlsx") ||
            file.name.endsWith(".xls")
          ) {
            try {
              const extractedText = await extractTextFromFile(file);
              newAttachments.push({
                name: file.name,
                content: `[Document: ${file.name}]\n\n${extractedText}\n\n---\n*For detailed analysis of this document, use the Summarizer feature for comprehensive research-grade insights.*`,
                type: "text/plain",
              });
              toast.success(`Extracted text from ${file.name}`);
            } catch (extractError) {
              console.error(`Failed to extract ${file.name}:`, extractError);
              toast.error(
                `Could not extract text from ${file.name}. Try the Summarizer feature.`,
              );
            }
          } else {
            const text = await file.text();
            newAttachments.push({
              name: file.name,
              content: text,
              type: file.type,
            });
          }
        } catch (err) {
          console.error(`Error reading ${file.name}:`, err);
          toast.error(`Failed to read ${file.name}`);
        }
      }

      setAttachments((prev) => [...prev, ...newAttachments]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSpeech = useCallback(() => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    if (!("webkitSpeechRecognition" in window)) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      toast.info("Listening...");
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = (event: any) => {
      console.error("Speech error", event.error);
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery((prev) => (prev ? prev + " " + transcript : transcript));
    };

    recognition.start();
  }, [isListening]);

  const handleEnhance = async () => {
    if (!query.trim()) {
      toast.warning("Please type something to enhance first.");
      return;
    }

    const originalQuery = query;
    setIsEnhancing(true);

    try {
      const res = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: query }),
      });

      if (!res.ok) {
        toast.error("Failed to enhance prompt. Please try again.");
        return;
      }

      const data = await res.json();

      if (data.enhanced) {
        const enhanced = data.enhanced.trim();
        const isErrorMessage =
          enhanced.toLowerCase().includes("please provide") ||
          enhanced.length < originalQuery.length;

        if (isErrorMessage) {
          toast.info(enhanced, { duration: 4000 });
        } else {
          setQuery(enhanced);
          toast.success("Prompt enhanced!");
        }
      } else {
        toast.error("No enhancement received.");
      }
    } catch (error) {
      console.error("Enhancement error:", error);
      toast.error("Failed to enhance.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  return (
    <PageShell className="relative bg-background">
      {/* Split Area */}
      <div className="flex min-h-0 flex-1 flex-col divide-y divide-border overflow-hidden md:flex-row md:divide-x md:divide-y-0">
        {/* LEFT PANEL */}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col basis-0">
          <div className="absolute top-2 left-2 right-2 z-10 sm:left-4 sm:right-auto">
            <ModelSelector
              value={leftChat.model}
              onValueChange={leftChat.setModel}
              triggerClassName="h-8 w-full max-w-full justify-between sm:w-fit sm:max-w-[min(42vw,160px)]"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-12 pb-3 scrollbar-thin sm:pb-5">
            {leftChat.messages.map((m, i) => {
              const isLast = i === leftChat.messages.length - 1;
              const isAgentGenerating =
                leftChat.isLoading && isLast && m.role === Role.Agent;

              // Only show shimmer if generating and (if thinking, show shimmer only until reasoning starts)
              const showShimmer =
                isAgentGenerating &&
                (m.isThinkingRequested ? !m.content.trim() : true);

              return (
                <React.Fragment key={m.id || i}>
                  {showShimmer && leftLoadingStatus && (
                    <div className="px-6 mb-2">
                      <TextShimmer
                        className="text-sm font-medium opacity-60"
                        duration={1.2}
                      >
                        {leftLoadingStatus}
                      </TextShimmer>
                    </div>
                  )}
                  <MessageComponent
                    message={m}
                    onCopy={handleCopy}
                    isGenerating={isAgentGenerating}
                  />
                </React.Fragment>
              );
            })}

            {/* Initial Shimmer for Left Panel */}
            {leftChat.isLoading &&
              leftChat.messages.length > 0 &&
              leftChat.messages[leftChat.messages.length - 1].role ===
                Role.User &&
              leftLoadingStatus && (
                <div className="px-6 mb-4">
                  {isThinking ? (
                    <ThinkingBar text={t("chat.status.connecting")} />
                  ) : (
                    <TextShimmer
                      className="text-sm font-medium opacity-60"
                      duration={1.2}
                    >
                      {leftLoadingStatus}
                    </TextShimmer>
                  )}
                </div>
              )}
            <div
              ref={(el) => {
                el?.scrollIntoView({ behavior: "smooth" });
              }}
            />
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col basis-0">
          <div className="absolute top-2 left-2 right-2 z-10 sm:left-4 sm:right-auto">
            <ModelSelector
              value={rightChat.model}
              onValueChange={rightChat.setModel}
              triggerClassName="h-8 w-full max-w-full justify-between sm:w-fit sm:max-w-[min(42vw,160px)]"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-12 pb-3 scrollbar-thin sm:pb-5">
            {rightChat.messages.map((m, i) => {
              const isLast = i === rightChat.messages.length - 1;
              const isAgentGenerating =
                rightChat.isLoading && isLast && m.role === Role.Agent;

              const showShimmer =
                isAgentGenerating &&
                (m.isThinkingRequested ? !m.content.trim() : true);

              return (
                <React.Fragment key={m.id || i}>
                  {showShimmer && rightLoadingStatus && (
                    <div className="px-6 mb-2">
                      <TextShimmer
                        className="text-sm font-medium opacity-60"
                        duration={1.2}
                      >
                        {rightLoadingStatus}
                      </TextShimmer>
                    </div>
                  )}
                  <MessageComponent
                    message={m}
                    onCopy={handleCopy}
                    isGenerating={isAgentGenerating}
                  />
                </React.Fragment>
              );
            })}

            {/* Initial Shimmer for Right Panel */}
            {rightChat.isLoading &&
              rightChat.messages.length > 0 &&
              rightChat.messages[rightChat.messages.length - 1].role ===
                Role.User &&
              rightLoadingStatus && (
                <div className="px-6 mb-4">
                  {isThinking ? (
                    <ThinkingBar text={t("chat.status.connecting")} />
                  ) : (
                    <TextShimmer
                      className="text-sm font-medium opacity-60"
                      duration={1.2}
                    >
                      {rightLoadingStatus}
                    </TextShimmer>
                  )}
                </div>
              )}
            <div
              ref={(el) => {
                el?.scrollIntoView({ behavior: "smooth" });
              }}
            />
          </div>
        </div>
      </div>

      {/* Shared Input Area - Fixed at bottom */}
      <ChatInput
        query={query}
        setQuery={setQuery}
        onSubmit={handleSharedSubmit}
        isLoading={leftChat.isLoading || rightChat.isLoading}
        attachments={attachments}
        setAttachments={setAttachments}
        isListening={isListening}
        onSpeechToggle={handleSpeech}
        isEnhancing={isEnhancing}
        onEnhance={handleEnhance}
        isThinking={isThinking}
        onThinkingChange={setIsThinking}
        thinkingMenuOnly
        showModelSelector={false}
        placeholder={
          isListening
            ? t("composer.placeholder.listening")
            : t("composer.placeholder.arena")
        }
        className="shrink-0"
      />
    </PageShell>
  );
}
