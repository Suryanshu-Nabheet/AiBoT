/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { v4 } from "uuid";
import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  CopyIcon,
  CheckIcon,
  PaperPlaneRightIcon,
  StopIcon,
  ArrowDownIcon,
  MagicWandIcon,
  MicrophoneIcon,
  PaperclipIcon,
  X as XIcon,
  DownloadSimple as DownloadIcon,
} from "@phosphor-icons/react";
import Image from "next/image";
import { Geist_Mono } from "next/font/google";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ModelSelector } from "@/components/ui/model-selector";
import { useModel } from "@/hooks/use-model";
import { TextShimmer } from "@/components/core/text-shimmer";
import { useChatSession } from "@/hooks/use-chat-session";
import { ChatInput } from "./chat-input";
import { useConversationById, saveConversation } from "@/hooks/useConversation";
import { useGlobalKeyPress } from "@/hooks/useGlobalKeyPress";
import { useExecutionContext } from "@/contexts/execution-context";
import { useMarkdown } from "@/hooks/useMarkdown";
import { useSmoothTyping } from "@/hooks/use-smooth-typing";
import { Message, Role, MODELS } from "@/lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThinkingBar } from "@/components/core/thinking-bar";
import { ThinkingPanel } from "@/components/chat/thinking-panel";
import { AssistantMarkdown } from "@/components/chat/assistant-markdown";
import { useTranslation } from "@/hooks/use-translation";
import { useThinkingMode } from "@/hooks/use-thinking-mode";
import { PageShell } from "@/components/layout/page-shell";
import { parseAssistantThinkingContent } from "@/lib/chat/thinking-mode";
import { chatMessageBodyClass } from "@/lib/chat/message-prose";

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  preload: true,
  display: "swap",
});

// Memoized Message Component
const MessageComponent = memo(
  ({
    message,
    onCopy,
    onModelSelect,
    isGenerating,
  }: {
    message: Message;
    onCopy: (content: string) => void;
    onModelSelect?: (modelId: string) => void;
    isGenerating?: boolean;
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
    // Simplified Markdown usage for now, ensuring robustness
    const {
      preprocessMarkdown,
      markdownComponents,
      remarkPlugins,
      rehypePlugins,
    } = useMarkdown({
      onCopy: handleMessageCopy,
      copied: isCopied,
      isWrapped: false,
      // toggleWrap removed to hide useless button
      resolvedTheme: "dark",
      geistMono,
    });

    const isUser = message.role === Role.User;

    const displayedContent = useSmoothTyping(
      message.content,
      5,
      message.shouldAnimate,
    );

    const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);

    const contentToShow = isUser ? message.content : displayedContent;

    const parsedThinking = parseAssistantThinkingContent(contentToShow, {
      isUser,
      isThinkingRequested: message.isThinkingRequested,
    });
    const {
      thinkingContent,
      mainResponse,
      hasThinkingTag,
      hideAnswerPanel,
    } = parsedThinking;

    const hasThinkingPanel = !isUser && (hasThinkingTag || thinkingContent);
    const showAnswer =
      !isUser && !hideAnswerPanel && Boolean(mainResponse?.trim());
    const compactAgentContentClass =
      "bg-transparent text-foreground px-0 shadow-none border-none";

    return (
      <div className="w-full">
        {/* Outer wrapper with EXACT same padding as floating input */}
        <div className="px-2 sm:px-4 md:px-6 lg:px-8 py-2.5">
          {/* Inner container with same max-width as input */}
          <div className="max-w-4xl mx-auto">
            {/* Message alignment wrapper - full width */}
            <div className="flex w-full">
              {/* Message bubble container - auto-sized with max width */}
              <div
                className={cn(
                  "flex flex-col max-w-full",
                  isUser ? "items-end ml-auto" : "items-start mr-auto",
                )}
              >
                {/* Attachments Rendering */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {message.attachments.map((att, i) =>
                      att.type.startsWith("image/") ? (
                        <div
                          key={i}
                          className="relative rounded-lg overflow-hidden border border-border/50 max-w-full"
                        >
                          <img
                            src={att.content}
                            alt={att.name}
                            className="max-h-[300px] w-auto object-contain rounded-lg"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div
                          key={i}
                          className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-border/50 text-xs"
                        >
                          <PaperclipIcon className="size-3" />
                          <span className="font-medium truncate max-w-[150px]">
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
                      "w-full max-w-full overflow-hidden break-words",
                      isUser
                        ? "text-sm bg-muted text-foreground border border-border/50 rounded-2xl px-3.5 py-2.5 md:px-5 md:py-3.5 shadow-sm"
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
                      <div className="whitespace-pre-wrap break-words overflow-wrap-anywhere font-medium leading-relaxed">
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

                {/* Copy and Download buttons - Only show after final response is complete */}
                {!isUser && mainResponse.trim() && !isGenerating && (
                    <div className="mt-2 flex items-center gap-1.5 self-start transition-opacity duration-200 animate-in fade-in slide-in-from-bottom-1">
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full transition-all duration-200"
                              onClick={() => handleMessageCopy()}
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
                            {t("chat.message.copy")}
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
                                    "ai-response.pdf",
                                    "AI Response",
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
                            className="text-[10px] px-2 py-1 font-bold"
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

        {/* Error / Rate Limit Interactive Actions */}
        {message.isError &&
          message.errorType === "rate_limit" &&
          onModelSelect && (
            <div className="px-4 md:px-8 lg:px-12 py-2">
              <div className="max-w-4xl mx-auto flex flex-col gap-2">
                <p className="text-xs text-muted-foreground font-medium ml-1">
                  Recommended alternatives:
                </p>
                <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                  {MODELS.map((m) => (
                    <Button
                      key={m.id}
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] md:text-xs bg-background/50 hover:bg-background border-primary/10 hover:border-primary/50 whitespace-nowrap"
                      onClick={() => onModelSelect(m.id)}
                    >
                      {m.name.replace(" (Free)", "")}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
      </div>
    );
  },
);
MessageComponent.displayName = "MessageComponent";

const MessagesList = memo(
  ({
    messages,
    onCopy,
    onModelSelect,
    isLoading,
    loadingStatus,
    isThinking,
  }: {
    messages: Array<Message>;
    onCopy: (content: string) => void;
    onModelSelect: (modelId: string) => void;
    isLoading: boolean;
    loadingStatus: string;
    isThinking: boolean;
  }) => {
    const { t } = useTranslation();
    return (
      <div className="flex flex-col gap-3 pb-4 sm:gap-4">
        {messages.map((message, i) => {
          const isLast = i === messages.length - 1;
          const isAgentGenerating =
            isLoading && isLast && message.role === Role.Agent;

          // Determine if we should show thinking bar for this specific message
          const msgIsThinking = message.isThinkingRequested;

          // Normal Mode: Show shimmer UNTIL THE END of generation
          // Thinking Mode: Show reasoning bar ONLY UNTIL tokens start appearing (the ThinkingBar inside handles it after)
          const showLoadingStatus =
            isAgentGenerating &&
            (msgIsThinking ? !message.content.trim() : true);

          return (
            <React.Fragment key={message.id || i}>
              {showLoadingStatus && loadingStatus && (
                <div className="px-2 sm:px-4 md:px-6 lg:px-8 mb-2">
                  <div className="max-w-4xl mx-auto">
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
              <MessageComponent
                message={message}
                onCopy={onCopy}
                onModelSelect={onModelSelect}
                isGenerating={isAgentGenerating}
              />
            </React.Fragment>
          );
        })}
        {/* Case where AI is thinking but hasn't sent the first token yet */}
        {isLoading &&
          messages.length > 0 &&
          messages[messages.length - 1].role === Role.User &&
          loadingStatus && (
            <div className="px-2 sm:px-4 md:px-6 lg:px-8">
              <div className="max-w-4xl mx-auto">
                {isThinking ? (
                  <ThinkingBar text={t("chat.status.connecting")} />
                ) : (
                  <TextShimmer className="text-sm font-medium" duration={1}>
                    {loadingStatus}
                  </TextShimmer>
                )}
              </div>
            </div>
          )}
      </div>
    );
  },
);
MessagesList.displayName = "MessagesList";

interface ChatInterfaceProps {
  conversationId?: string;
  storageKey?: string;
  className?: string;
}

export default function ChatInterface({
  conversationId: initialConversationId,
  storageKey = "preferredModel",
  className,
}: ChatInterfaceProps = {}) {
  const { t, locale } = useTranslation();
  const {
    model,
    setModel,
    query,
    setQuery,
    messages,
    isLoading,
    attachments,
    setAttachments,
    handleSend,
    conversationId,
    stopHelpers,
  } = useChatSession({
    conversationId: initialConversationId,
    storageKey,
    viewMode: "direct",
  });

  // Enterprise Features State (UI only)
  const [isListening, setIsListening] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const { thinkingEnabled: isThinking, setThinkingEnabled: setIsThinking } =
    useThinkingMode("aibot_thinking_enabled");
  const [loadingStatus, setLoadingStatus] = useState(() =>
    t("chat.status.thinking"),
  );

  useEffect(() => {
    if (!isLoading) {
      setLoadingStatus(
        isThinking ? t("chat.status.thinking") : t("chat.status.generating"),
      );
      return;
    }

    const thinkingStatuses = [
      t("chat.status.thinking"),
      t("chat.status.reasoningQuery"),
      t("chat.status.analyzing"),
      t("chat.status.crafting"),
      t("chat.status.polishing"),
    ];

    const normalStatuses = [
      t("chat.status.generating"),
      t("chat.status.writing"),
      t("chat.status.analyzing"),
      t("chat.status.crafting"),
      t("chat.status.polishing"),
    ];

    const statuses = isThinking ? thinkingStatuses : normalStatuses;

    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % statuses.length;
      setLoadingStatus(statuses[i]);
    }, 2000);

    return () => clearInterval(interval);
  }, [isLoading, isThinking, t]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [showScrollButton, setShowScrollButton] = useState(false);

  const messagesLengthRef = useRef<number>(messages.length);
  useEffect(() => {
    messagesLengthRef.current = messages.length;
  }, [messages.length]);

  const scrollRafRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
      return;
    }

    // Fallback when the container ref isn't ready yet.
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Handle scroll visibility
  const handleScroll = useCallback(() => {
    if (scrollRafRef.current !== null) return;

    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = null;

      const container = scrollContainerRef.current;
      if (!container) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      // Distance from the bottom. When close enough, hide the button.
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const isBottom = distanceFromBottom < 100;

      const hasMessages = messagesLengthRef.current > 0;
      const next = !isBottom && hasMessages;

      setShowScrollButton((prev) => (prev === next ? prev : next));
    });
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  const isEmptyChat = messages.length === 0;

  // Auto-scroll on new messages (thread mode only)
  useEffect(() => {
    if (isEmptyChat) return;
    scrollToBottom("auto");
  }, [messages.length, isEmptyChat, scrollToBottom]);

  useGlobalKeyPress({
    inputRef: textareaRef,
    onKeyPress: (key: string) => setQuery((prev) => prev + key),
    disabled: isLoading,
    loading: isLoading,
  });

  // --- Enterprise Feature Handlers ---

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newAttachments: { name: string; content: string; type: string }[] =
        [];

      // Dynamically import extractTextFromFile
      const { extractTextFromFile } = await import("@/lib/file-utils");

      for (const file of files) {
        try {
          // Check if it's an image
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
            // Document types that need extraction
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
              toast.success(t("toast.file.extracted", { name: file.name }));
            } catch (extractError) {
              console.error(`Failed to extract ${file.name}:`, extractError);
              toast.error(t("toast.file.extractFail", { name: file.name }));
            }
          } else {
            // Text based files (txt, md, json, etc.)
            const text = await file.text();
            newAttachments.push({
              name: file.name,
              content: text,
              type: file.type,
            });
          }
        } catch (err) {
          console.error(`Error reading ${file.name}:`, err);
          toast.error(t("toast.file.readFail", { name: file.name }));
        }
      }

      setAttachments((prev) => [...prev, ...newAttachments]);
      // Reset input
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
      toast.error(t("toast.speech.unsupported"));
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = locale === "hi" ? "hi-IN" : "en-US";

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      toast.info(t("toast.speech.listening"));
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = (event: any) => {
      console.error("Speech error", event.error);
      setIsListening(false);
      recognitionRef.current = null;
      // toast.error("Speech recognition error"); // Optional: suppress trivial errors
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery((prev) => (prev ? prev + " " + transcript : transcript));
    };

    recognition.start();
  }, [isListening, t, locale]);

  const handleEnhance = async () => {
    if (!query.trim()) {
      toast.warning(t("toast.enhance.empty"));
      return;
    }

    const originalQuery = query; // Save original message
    setIsEnhancing(true);

    try {
      const res = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: query, locale }),
      });

      if (!res.ok) {
        toast.error(t("toast.enhance.fail"));
        return;
      }

      const data = await res.json();

      // Check if response is an actual enhancement or an error message
      if (data.enhanced) {
        const enhanced = data.enhanced.trim();

        // Check if it's an error/instruction message (not an enhancement)
        const isErrorMessage =
          enhanced.toLowerCase().includes("please provide") ||
          enhanced.toLowerCase().includes("give more") ||
          enhanced.toLowerCase().includes("add more details") ||
          enhanced.toLowerCase().includes("be more specific") ||
          enhanced.toLowerCase().includes("too short") ||
          enhanced.toLowerCase().includes("need more context") ||
          enhanced.length < originalQuery.length; // Enhanced should be longer

        if (isErrorMessage) {
          // Show as toast, keep original message
          toast.info(enhanced, {
            duration: 4000,
          });
        } else {
          // Valid enhancement - replace the message
          setQuery(enhanced);
          toast.success(t("toast.enhance.success"));
        }
      } else {
        toast.error(t("toast.enhance.none"));
      }
    } catch (error) {
      console.error("Enhancement error:", error);
      toast.error(t("toast.enhance.fail"));
    } finally {
      setIsEnhancing(false);
    }
  };

  // -----------------------------------

  const handleCreateChat = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(undefined, undefined, undefined, isThinking);
  };

  // NOTE: Logic successfully extracted to useChatSession
  // The rest of this file is purely UI Rendering

  const handleCopy = useCallback(async (content: string) => {
    await navigator.clipboard.writeText(content);
  }, []);

  const chatInputProps = {
    query,
    setQuery,
    onSubmit: handleCreateChat,
    isLoading,
    onStop: stopHelpers.stop,
    attachments,
    setAttachments,
    isListening,
    onSpeechToggle: handleSpeech,
    isEnhancing,
    onEnhance: handleEnhance,
    isThinking,
    onThinkingChange: setIsThinking,
    model,
    onModelChange: setModel,
    modelStorageKey: storageKey,
    showModelSelector: true as const,
    placeholder: isListening
      ? t("composer.placeholder.listening")
      : t("composer.placeholder"),
  };

  return (
    <PageShell className={cn("relative bg-background", className)}>
      {isEmptyChat ? (
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto overscroll-contain px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative w-full max-w-3xl"
          >
            <p
              className="pointer-events-none absolute bottom-full left-0 right-0 mb-5 max-w-md mx-auto text-balance px-2 text-center text-xl font-normal tracking-tight text-foreground sm:mb-6 sm:text-2xl"
            >
              {t("chat.welcome.greeting")}
            </p>

            <ChatInput
              {...chatInputProps}
              dock="center"
              className="w-full shrink-0"
            />
          </motion.div>
        </div>
      ) : (
        <>
          <div
            ref={scrollContainerRef}
            className="min-h-0 flex-1 w-full max-w-full overflow-y-auto overflow-x-hidden scroll-smooth overscroll-contain"
          >
            <div className="mx-auto w-full max-w-4xl px-2 pb-6 pt-4 sm:px-4 sm:pt-6 md:pt-8">
              <div className="flex flex-col gap-1">
                <MessagesList
                  messages={messages}
                  onCopy={handleCopy}
                  onModelSelect={setModel}
                  isLoading={isLoading}
                  loadingStatus={loadingStatus}
                  isThinking={isThinking}
                />
                <div ref={messagesEndRef} className="h-4" />
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showScrollButton && (
              <motion.button
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-[calc(7.5rem+env(safe-area-inset-bottom,0px))] right-3 z-20 rounded-full bg-primary p-2 text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 sm:bottom-28 sm:right-6"
                onClick={() => scrollToBottom()}
              >
                <ArrowDownIcon className="size-5" />
              </motion.button>
            )}
          </AnimatePresence>

          <ChatInput {...chatInputProps} dock="bottom" className="shrink-0" />
        </>
      )}
    </PageShell>
  );
}
