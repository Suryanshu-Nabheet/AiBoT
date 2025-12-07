/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { v4 } from "uuid";
import React, { useState, useRef, useEffect, useCallback, memo } from "react";
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
} from "@phosphor-icons/react";
import { Response } from "@/components/ai-elements/response";
import Image from "next/image";
import { Geist_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { ModelSelector } from "@/components/ui/model-selector";
import { useModel } from "@/hooks/use-model";
import { useConversationById } from "@/hooks/useConversation";
import { useGlobalKeyPress } from "@/hooks/useGlobalKeyPress";
import { useExecutionContext } from "@/contexts/execution-context";
import { useMarkdown } from "@/hooks/useMarkdown";
import { useSmoothTyping } from "@/hooks/use-smooth-typing";
import { Message, Role } from "@/lib/types";

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
  }: {
    message: Message;
    onCopy: (content: string) => void;
    copied: boolean;
  }) => {
    // Simplified Markdown usage for now, ensuring robustness
    const { preprocessMarkdown } = useMarkdown({
      onCopy,
      copied,
      isWrapped: false,
      toggleWrap: () => {},
      resolvedTheme: "dark", // Defaulting to dark/system for stability
      geistMono,
    });

    const isUser = message.role === Role.User;

    const displayedContent = useSmoothTyping(message.content, 5); // 5 chars per frame = blazing fast yet smooth
    const contentToShow = isUser ? message.content : displayedContent;

    return (
      <div className="w-full">
        {/* Outer wrapper with EXACT same padding as floating input */}
        <div className="px-4 md:px-8 lg:px-12 py-2.5">
          {/* Inner container with same max-width as input */}
          <div className="max-w-4xl mx-auto">
            {/* Message alignment wrapper */}
            <div
              className={cn(
                "flex w-full",
                isUser ? "justify-end" : "justify-start"
              )}
            >
              {/* Message bubble container */}
              <div
                className={cn(
                  "flex flex-col max-w-[85%] md:max-w-[75%] lg:max-w-[65%]",
                  isUser ? "items-end" : "items-start"
                )}
              >
                {/* Message bubble */}
                <div
                  className={cn(
                    "rounded-2xl px-5 py-3.5 text-sm shadow-md",
                    "break-words overflow-hidden",
                    isUser
                      ? "bg-primary text-primary-foreground rounded-tr-md"
                      : "bg-muted text-foreground rounded-tl-md border border-border/50"
                  )}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap break-words">
                      {contentToShow}
                    </div>
                  ) : (
                    <div className="w-full">
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed prose-headings:mt-4 prose-headings:mb-2 prose-li:my-1">
                        <div className="[&_table]:w-full [&_table]:my-4 [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:bg-muted/50 [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_pre]:my-3 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_code]:text-xs [&_code]:break-words [&_ul]:my-2 [&_ol]:my-2">
                          <Response>
                            {preprocessMarkdown(contentToShow)}
                          </Response>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Copy button */}
                {!isUser && (
                  <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
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
  }: {
    messages: Array<Message>;
    onCopy: (content: string) => void;
    copied: boolean;
  }) => {
    return (
      <div className="flex flex-col gap-2 pb-4">
        {messages.map((message, i) => (
          <MessageComponent
            key={message.id || i}
            message={message}
            onCopy={onCopy}
            copied={copied}
          />
        ))}
      </div>
    );
  }
);
MessagesList.displayName = "MessagesList";

interface ChatInterfaceProps {
  conversationId?: string;
}

export default function ChatInterface({
  conversationId: initialConversationId,
}: ChatInterfaceProps = {}) {
  const { modelId: persistedModelId, setModelId } = useModel({
    storageKey: "preferredModel",
    persistToLocalStorage: true,
  });

  const [model, setModel] = useState<string>(persistedModelId);
  const [query, setQuery] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [conversationId] = useState<string | null>(
    initialConversationId || v4()
  );
  const { conversation, loading: conversationLoading } = useConversationById(
    initialConversationId
  );
  const { refreshExecutions } = useExecutionContext();

  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    if (persistedModelId !== model) {
      setModel(persistedModelId);
    }
  }, [persistedModelId, model]);

  const handleModelChange = useCallback(
    (newModel: string) => {
      setModel(newModel);
      setModelId(newModel);
    },
    [setModelId]
  );

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
    // Use instant scroll for better UX during streaming if near bottom
    scrollToBottom("instant");
  }, [messages.length, scrollToBottom]);

  // Load conversation history
  useEffect(() => {
    if (conversation?.messages && initialConversationId) {
      setMessages(conversation.messages);
      setShowWelcome(false);
      // Small delay to allow render before scrolling
      setTimeout(() => scrollToBottom("instant"), 10);
    }
  }, [conversation, initialConversationId, scrollToBottom]);

  useGlobalKeyPress({
    inputRef: textareaRef,
    onKeyPress: (key: string) => setQuery((prev) => prev + key),
    disabled: isLoading,
    loading: isLoading,
  });

  const processStream = async (response: globalThis.Response) => {
    if (!response.ok || !response.body) {
      setIsLoading(false);
      return;
    }

    const tempId = `ai-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: Role.Agent, content: "" },
    ]);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";
    let updateCounter = 0;
    const UPDATE_BATCH_SIZE = 5; // Update UI every 5 chunks for performance

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Simple parsing for this example, adjust based on actual API format (SSE vs raw)
        // Assuming consistent SSE format from route
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices?.[0]?.delta?.content || data.content; // Handle both OpenAI standard and simplified formats
              if (content) accumulated += content;
            } catch (e) {}
          }
        }

        // Batch updates: only update state every N chunks or on last chunk
        updateCounter++;
        if (updateCounter >= UPDATE_BATCH_SIZE || done) {
          updateCounter = 0;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId ? { ...m, content: accumulated } : m
            )
          );
        }
      }

      // Final update to ensure we display everything
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, content: accumulated } : m))
      );
    } catch (e) {
      console.error("Stream error", e);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-stream-${Date.now()}`,
          role: Role.Agent,
          content:
            "**Connection Error:** The stream was interrupted. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
      refreshExecutions();
    }
  };

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setShowWelcome(false);
    const currentQuery = query.trim();
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: Role.User,
      content: currentQuery,
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setIsLoading(true);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          model,
          conversationId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        let errorMessage = "An unexpected error occurred.";
        try {
          // Try to parse as JSON first
          const errorData = await res.json();
          errorMessage = errorData.message || JSON.stringify(errorData);
        } catch {
          // Fallback to text (e.g. for HTML 500 pages)
          errorMessage = await res.text();
          if (errorMessage.includes("<!DOCTYPE html>")) {
            errorMessage = "Service unavailable (500). Please try again later.";
          } else {
            errorMessage = errorMessage.substring(0, 100); // Truncate long text
          }
        }

        console.error(`Chat Request Failed (${res.status}):`, errorMessage);

        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: Role.Agent,
            content: `**Error (${res.status}):** ${errorMessage}`,
          },
        ]);
        setIsLoading(false);
        return;
      }

      await processStream(res);
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Request aborted");
      } else {
        console.error("Chat error", error);
        setMessages((prev) => [
          ...prev,
          {
            id: `error-fetch-${Date.now()}`,
            role: Role.Agent,
            content: `**Network Error:** Failed to connect to the server. Please check your connection.`,
          },
        ]);
      }
      setIsLoading(false);
    }
  };

  const handleCopy = useCallback(async (content: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  if (initialConversationId && conversationLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center p-4">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden bg-background">
      {/* Scrollable Message Area - independent scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 w-full overflow-y-auto scroll-smooth"
      >
        <div className="w-full max-w-4xl mx-auto pb-48 pt-6 md:pt-8">
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
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>
      </div>

      {/* Scroll To Bottom Button */}
      {showScrollButton && (
        <Button
          size="icon"
          variant="secondary"
          className="absolute bottom-32 right-8 z-30 rounded-full shadow-lg opacity-90 hover:opacity-100 transition-all border border-border"
          onClick={() => scrollToBottom()}
        >
          <ArrowDownIcon className="size-4" />
        </Button>
      )}

      {/* Floating Input Area - Perfectly Positioned */}
      <div className="absolute bottom-0 left-0 right-0 w-full z-20 px-4 md:px-8 lg:px-12 pb-4 md:pb-6 bg-gradient-to-t from-background via-background to-transparent">
        <div className="max-w-4xl mx-auto w-full">
          <form
            onSubmit={handleCreateChat}
            className="relative flex w-full flex-col gap-3 rounded-2xl border border-border/20 dark:border-border/10 bg-background/95 dark:bg-background/95 backdrop-blur-xl p-4 md:p-5 shadow-2xl ring-1 ring-border/10 transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/30 focus-within:shadow-primary/10 focus-within:border-primary/30"
          >
            <div className="relative px-2 pt-2">
              <Textarea
                ref={textareaRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleCreateChat(e);
                  }
                }}
                placeholder="Ask something..."
                className="min-h-[24px] w-full resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 max-h-[200px] text-base placeholder:text-muted-foreground/50"
                rows={1}
              />
            </div>

            <div className="flex items-center justify-between pt-1 px-1">
              <div className="flex-1 max-w-[200px] md:max-w-xs">
                <ModelSelector
                  value={model}
                  onValueChange={handleModelChange}
                  disabled={isLoading}
                />
              </div>
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-full transition-transform duration-200 hover:scale-105"
                    onClick={() => abortControllerRef.current?.abort()}
                  >
                    <StopIcon weight="bold" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="icon"
                    className="h-9 w-9 rounded-full shadow-lg bg-gradient-to-br from-primary to-primary/80 hover:brightness-110 transition-all duration-300 hover:scale-110 active:scale-95 translate-y-0"
                    disabled={!query.trim()}
                  >
                    <PaperPlaneRightIcon
                      weight="fill"
                      className="size-4 text-primary-foreground"
                    />
                  </Button>
                )}
              </div>
            </div>
          </form>
          <div className="text-center text-[10px] text-muted-foreground mt-3 opacity-60">
            AiBoT can make mistakes. Check important info.
          </div>
        </div>
      </div>
    </div>
  );
}
