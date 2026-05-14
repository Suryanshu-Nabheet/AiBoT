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
import ReactMarkdown from "react-markdown";
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
    const [isCopied, setIsCopied] = useState(false);

    const handleMessageCopy = useCallback(async (content?: string) => {
      const textToCopy = typeof content === 'string' ? content : message.content;
      await onCopy(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }, [onCopy, message.content]);
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
      message.shouldAnimate
    );
    const contentToShow = isUser ? message.content : displayedContent;

    // Parsing Thinking blocks - Only for Agent responses
    const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);
    
    let thinkingContent = "";
    let mainResponse = contentToShow;

    if (!isUser) {
      const rawContent = message.content;
      
      // Super-Advance Harness: Universal Thinking Tag Support
      // Matches: <thinking>, <|thinking|>, <thought>, [THOUGHT], etc.
      const thinkingPatterns = [
        { open: /<thinking>/i, close: /<\/thinking>/i },
        { open: /<begin_of_thinking>/i, close: /<\/end_of_thinking>/i },
        { open: /<\|thinking\|>/i, close: /<\|end_of_thought\|>/i },
        { open: /<thought>/i, close: /<\/thought>/i },
        { open: /\[THOUGHT\]/i, close: /\[\/THOUGHT\]/i }
      ];

      let matchFound = false;
      for (const pattern of thinkingPatterns) {
        const openMatch = rawContent.match(pattern.open);
        if (openMatch) {
          matchFound = true;
          const openTag = openMatch[0];
          const parts = rawContent.split(openTag);
          
          if (parts.length > 1) {
            const closeMatch = parts[1].match(pattern.close);
            if (closeMatch) {
              const closeTag = closeMatch[0];
              const thinkingParts = parts[1].split(closeTag);
              thinkingContent = thinkingParts[0].trim();
              
              // Remove the entire block from the main response
              const blockPattern = new RegExp(`${openTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${closeTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, "gi");
              mainResponse = contentToShow.replace(blockPattern, "").trim();
            } else {
              // Still thinking
              thinkingContent = parts[1].trim();
              mainResponse = "";
            }
          }
          break;
        }
      }
    }

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
                  isUser ? "items-end ml-auto" : "items-start mr-auto"
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
                      )
                    )}
                  </div>
                )}

                {/* Thinking Bar */}
                {!isUser && thinkingContent && (
                  <div className="w-full">
                    <ThinkingBar
                      text={isThinkingExpanded ? "Reasoning Details" : (mainResponse ? "Deep reasoning complete" : "Deep reasoning in progress")}
                      isExpanded={isThinkingExpanded}
                      onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
                    />
                    <AnimatePresence>
                      {isThinkingExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden px-1"
                        >
                          <div className="text-sm text-muted-foreground/75 leading-relaxed py-2 border-l border-primary/5 pl-4 my-1">
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-3 prose-p:leading-relaxed prose-headings:mt-6 prose-headings:first:mt-0 prose-headings:mb-3 prose-headings:text-muted-foreground/80 prose-li:my-1.5 prose-pre:my-4 prose-pre:max-w-full prose-code:break-words prose-img:rounded-lg prose-img:max-w-full [&_*]:text-muted-foreground/75">
                              <ReactMarkdown
                                remarkPlugins={remarkPlugins}
                                rehypePlugins={rehypePlugins}
                                components={markdownComponents}
                              >
                                {thinkingContent}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Message Content */}
                <div
                  className={cn(
                    "text-sm w-full max-w-full overflow-hidden break-words",
                    isUser
                      ? "bg-muted text-foreground border border-border/50 rounded-2xl px-3.5 py-2.5 md:px-5 md:py-3.5 shadow-sm"
                      : "bg-transparent text-foreground px-0 py-2 shadow-none border-none"
                  )}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap break-words overflow-wrap-anywhere font-medium">
                      {mainResponse}
                    </div>
                  ) : (
                    <div className="w-full max-w-full">
                      {mainResponse && (
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-3 prose-p:leading-relaxed prose-headings:mt-6 prose-headings:first:mt-0 prose-headings:mb-3 prose-li:my-1.5 prose-pre:my-4 prose-pre:max-w-full prose-code:break-words prose-img:rounded-lg prose-img:max-w-full">
                          <div className="w-full max-w-full overflow-x-auto scrollbar-thin">
                            <div className="w-full max-w-full [&_*]:max-w-full [&_table]:w-full [&_table]:table-auto [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:bg-muted/50 [&_th]:break-words [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5 [&_td]:break-words [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:text-xs [&_code]:break-words [&_code]:overflow-wrap-anywhere [&_p]:break-words [&_p]:overflow-wrap-anywhere [&_li]:break-words [&_h1]:break-words [&_h2]:break-words [&_h3]:break-words [&_h4]:break-words [&_span]:break-words [&_div]:break-words">
                              <ReactMarkdown
                                remarkPlugins={remarkPlugins}
                                rehypePlugins={rehypePlugins}
                                components={markdownComponents}
                              >
                                {mainResponse}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Copy and Download buttons - Only show after response is complete */}
                {!isUser && message.content.trim() && !isGenerating && displayedContent.length === message.content.length && (
                  <div className="mt-2 flex items-center gap-1.5 self-start transition-opacity duration-200">
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full transition-all duration-200"
                            onClick={handleMessageCopy}
                          >
                            {isCopied ? (
                              <CheckIcon className="size-4 text-green-500" />
                            ) : (
                              <CopyIcon className="size-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-[10px] px-2 py-1 font-bold">Copy message</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full transition-all duration-200"
                            onClick={async () => {
                              try {
                                const { generatePDF } = await import("@/lib/pdf-utils");
                                await generatePDF(message.content, "ai-response.pdf", "AI Response");
                                toast.success("PDF downloaded successfully!");
                              } catch (error) {
                                console.error("PDF generation error:", error);
                                toast.error("Failed to generate PDF");
                              }
                            }}
                          >
                            <DownloadIcon className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-[10px] px-2 py-1 font-bold">Download as PDF</TooltipContent>
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
  }
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
    return (
      <div className="flex flex-col gap-2 pb-4">
        {messages.map((message, i) => {
          const isLast = i === messages.length - 1;
          const isAgentGenerating = isLoading && isLast && message.role === Role.Agent;
          
          // Only show loading status if it's the very last message and it's empty
          const showLoadingStatus = isAgentGenerating && !message.content.trim();

          // Determine if we should show thinking bar for this specific message
          const msgIsThinking = message.isThinkingRequested;

          return (
            <React.Fragment key={message.id || i}>
              {showLoadingStatus && loadingStatus && (
                <div className="px-2 sm:px-4 md:px-6 lg:px-8">
                  <div className="max-w-4xl mx-auto">
                    {msgIsThinking ? (
                      <ThinkingBar text="Initializing deep reasoning..." />
                    ) : (
                      <TextShimmer className="text-sm font-medium" duration={1}>
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
                  <ThinkingBar text="Connecting to reasoning engine..." />
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
  }
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
  const {
    model,
    setModel,
    query,
    setQuery,
    messages,
    showWelcome,
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
  const [isThinking, setIsThinking] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("AiBoT is thinking...");

  useEffect(() => {
    if (!isLoading) {
      setLoadingStatus(isThinking ? "AiBoT is thinking..." : "AiBoT is generating...");
      return;
    }

    const thinkingStatuses = [
      "AiBoT is thinking...",
      "Reasoning about the query...",
      "Analyzing the context...",
      "Drafting thought process...",
      "Finalizing details...",
    ];

    const normalStatuses = [
      "AiBoT is generating...",
      "Searching for answers...",
      "Analyzing the context...",
      "Drafting a response...",
      "Finalizing details...",
    ];

    const statuses = isThinking ? thinkingStatuses : normalStatuses;

    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % statuses.length;
      setLoadingStatus(statuses[i]);
    }, 2000);

    return () => clearInterval(interval);
  }, [isLoading]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Handle scroll visibility
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    const isBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isBottom && messages.length > 0);
  }, [messages.length]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom("instant");
  }, [messages.length, scrollToBottom]);

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
              toast.success(`Extracted text from ${file.name}`);
            } catch (extractError) {
              console.error(`Failed to extract ${file.name}:`, extractError);
              toast.error(
                `Could not extract text from ${file.name}. Try the Summarizer feature.`
              );
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
          toast.error(`Failed to read ${file.name}`);
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
      // toast.error("Speech recognition error"); // Optional: suppress trivial errors
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

    const originalQuery = query; // Save original message
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
          toast.success("Prompt enhanced!");
        }
      } else {
        toast.error("No enhancement received. Please try again.");
      }
    } catch (error) {
      console.error("Enhancement error:", error);
      toast.error("Failed to enhance prompt. Please try again.");
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

  return (
    <div
      className={cn(
        "flex flex-col h-full w-full max-w-full relative overflow-hidden bg-background touch-none",
        className
      )}
    >
      {/* Scrollable Message Area - independent scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 w-full max-w-full overflow-y-auto overflow-x-hidden scroll-smooth overscroll-contain"
      >
        <div className="w-full max-w-4xl mx-auto pb-40 sm:pb-48 pt-6 md:pt-8">
          {showWelcome && messages.length === 0 ? (
            <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-8 text-center px-4">
              <div className="space-y-4">
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground">
                  Ai<span className="text-primary">BoT</span>
                </h1>
                <p className="text-muted-foreground text-base md:text-lg max-w-lg mx-auto leading-relaxed">
                  The world's fastest, smartest, and most premium AI chatbot.
                  Start a conversation below.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <MessagesList
                messages={messages}
                onCopy={handleCopy}
                onModelSelect={setModel}
                isLoading={isLoading}
                loadingStatus={loadingStatus}
                isThinking={isThinking}
              />
              {/* Invisible element to scroll to */}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>
      </div>

      {/* Floating Scroll Down Button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-32 right-6 z-20 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors"
            onClick={() => scrollToBottom()}
          >
            <ArrowDownIcon className="size-5" />
          </motion.button>
        )}
      </AnimatePresence>

      <ChatInput
        query={query}
        setQuery={setQuery}
        onSubmit={handleCreateChat}
        isLoading={isLoading}
        onStop={stopHelpers.stop}
        attachments={attachments}
        setAttachments={setAttachments}
        isListening={isListening}
        onSpeechToggle={handleSpeech}
        isEnhancing={isEnhancing}
        onEnhance={handleEnhance}
        isThinking={isThinking}
        onThinkingToggle={() => setIsThinking(!isThinking)}
        model={model}
        onModelChange={setModel}
        showModelSelector={true}
        placeholder={isListening ? "Listening..." : "Message AiBoT..."}
        className="absolute bottom-0 left-0"
      />
    </div>
  );
}
