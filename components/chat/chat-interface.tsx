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
import { useChatSession } from "@/hooks/use-chat-session";
import { ChatInput } from "./chat-input";
import { useConversationById, saveConversation } from "@/hooks/useConversation";
import { useGlobalKeyPress } from "@/hooks/useGlobalKeyPress";
import { useExecutionContext } from "@/contexts/execution-context";
import { useMarkdown } from "@/hooks/useMarkdown";
import { useSmoothTyping } from "@/hooks/use-smooth-typing";
import { Message, Role, MODELS } from "@/lib/types";

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
    copied,
    onModelSelect,
  }: {
    message: Message;
    onCopy: (content: string) => void;
    copied: boolean;
    onModelSelect?: (modelId: string) => void;
  }) => {
    // Simplified Markdown usage for now, ensuring robustness
    const {
      preprocessMarkdown,
      markdownComponents,
      remarkPlugins,
      rehypePlugins,
    } = useMarkdown({
      onCopy,
      copied,
      isWrapped: false,
      // toggleWrap removed to hide useless button
      resolvedTheme: "dark",
      geistMono,
    });

    const isUser = message.role === Role.User;

    const displayedContent = useSmoothTyping(message.content, 5);
    const contentToShow = isUser ? message.content : displayedContent;

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

                {/* Message Content */}
                <div
                  className={cn(
                    "rounded-2xl px-5 py-3.5 text-sm shadow-md",
                    "w-full max-w-full overflow-hidden break-words",
                    isUser
                      ? "bg-primary text-primary-foreground rounded-tr-md"
                      : "bg-muted text-foreground rounded-tl-md border border-border/50"
                  )}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap break-words overflow-wrap-anywhere">
                      {contentToShow}
                    </div>
                  ) : (
                    <div className="w-full max-w-full">
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed prose-headings:mt-4 prose-headings:mb-2 prose-li:my-1 prose-pre:my-3 prose-pre:max-w-full prose-code:break-words">
                        <div className="w-full max-w-full overflow-hidden">
                          {/* Critical overflow container */}
                          <div className="w-full max-w-full [&_*]:max-w-full [&_table]:w-full [&_table]:table-auto [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:bg-muted/50 [&_th]:break-words [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5 [&_td]:break-words [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:text-xs [&_code]:break-words [&_code]:overflow-wrap-anywhere [&_p]:break-words [&_p]:overflow-wrap-anywhere [&_li]:break-words [&_h1]:break-words [&_h2]:break-words [&_h3]:break-words [&_h4]:break-words [&_span]:break-words [&_div]:break-words">
                            <ReactMarkdown
                              remarkPlugins={remarkPlugins}
                              rehypePlugins={rehypePlugins}
                              components={markdownComponents}
                            >
                              {contentToShow}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Copy and Download buttons */}
                {!isUser && (
                  <div className="mt-2 flex items-center gap-1 transition-opacity duration-200">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md"
                      onClick={() => onCopy(message.content)}
                    >
                      {copied ? (
                        <CheckIcon className="size-3.5" />
                      ) : (
                        <CopyIcon className="size-3.5" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md"
                      onClick={async () => {
                        try {
                          const { generatePDF } =
                            await import("@/lib/pdf-utils");
                          await generatePDF(
                            message.content,
                            "ai-response.pdf",
                            "AI Response"
                          );
                          toast.success("PDF downloaded successfully!");
                        } catch (error) {
                          console.error("PDF generation error:", error);
                          toast.error("Failed to generate PDF");
                        }
                      }}
                      title="Download as PDF"
                    >
                      <DownloadIcon className="size-3.5" />
                    </Button>
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
    copied,
    onModelSelect,
  }: {
    messages: Array<Message>;
    onCopy: (content: string) => void;
    copied: boolean;
    onModelSelect: (modelId: string) => void;
  }) => {
    return (
      <div className="flex flex-col gap-2 pb-4">
        {messages.map((message, i) => (
          <MessageComponent
            key={message.id || i}
            message={message}
            onCopy={onCopy}
            copied={copied}
            onModelSelect={onModelSelect}
          />
        ))}
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
  });

  const [copied, setCopied] = useState(false);

  // Enterprise Features State (UI only)
  const [isListening, setIsListening] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);

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
                content: `[Document: ${file.name}]\n\n${extractedText}\n\n---\n💡 *For detailed analysis of this document, use the Summarizer feature for comprehensive research-grade insights.*`,
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
    handleSend();
  };

  // NOTE: Logic successfully extracted to useChatSession
  // The rest of this file is purely UI Rendering

  const handleCopy = useCallback(async (content: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
                copied={copied}
                onModelSelect={setModel}
              />
              {isLoading && (
                <div className="flex items-center gap-2 px-4 text-muted-foreground py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                  <span className="text-xs font-medium animate-pulse">
                    AiBoT is thinking...
                  </span>
                </div>
              )}
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
        model={model}
        onModelChange={setModel}
        showModelSelector={true}
        placeholder={isListening ? "Listening..." : "Message AiBoT..."}
        className="absolute bottom-0 left-0"
      />
    </div>
  );
}
