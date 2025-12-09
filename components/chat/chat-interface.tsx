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
  PaperclipIcon,
  X as XIcon,
} from "@phosphor-icons/react";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import { Geist_Mono } from "next/font/google";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ModelSelector } from "@/components/ui/model-selector";
import { useModel } from "@/hooks/use-model";
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
              {/* Message bubble container with max-width */}
              <div
                className={cn(
                  "flex flex-col max-w-[85%] md:max-w-[75%] lg:max-w-[65%]",
                  isUser ? "items-end" : "items-start"
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
                              {preprocessMarkdown(contentToShow)}
                            </ReactMarkdown>
                          </div>
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

  // Enterprise Features State
  const [attachments, setAttachments] = useState<
    { name: string; content: string; type: string }[]
  >([]);
  const [isListening, setIsListening] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null); // Store recognition instance
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [conversationId] = useState<string | null>(
    initialConversationId || v4()
  );
  const { conversation, loading: conversationLoading } = useConversationById(
    initialConversationId
  );
  const { refreshExecutions, addExecution } = useExecutionContext();

  const [showScrollButton, setShowScrollButton] = useState(false);
  const [executionCreated, setExecutionCreated] = useState(false);

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

  // --- Enterprise Feature Handlers ---

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newAttachments: { name: string; content: string; type: string }[] =
        [];

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
                    content: reader.result, // This is the base64 data URL
                    type: file.type, // "image/png", etc.
                  });
                }
                resolve();
              };
            });
          } else {
            // Text based files
            const text = await file.text();
            newAttachments.push({
              name: file.name,
              content: text,
              type: file.type,
            });
          }
        } catch (err) {
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

    setIsEnhancing(true);
    try {
      const res = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: query }),
      });

      if (!res.ok) throw new Error("Enhancement failed");

      const data = await res.json();
      if (data.enhanced) {
        setQuery(data.enhanced);
        toast.success("Prompt enhanced!");
      }
    } catch (error) {
      toast.error("Failed to enhance prompt");
    } finally {
      setIsEnhancing(false);
    }
  };

  // -----------------------------------

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
      setMessages((prev) => {
        const updatedMessages = prev.map((m) =>
          m.id === tempId ? { ...m, content: accumulated } : m
        );

        // Save conversation to sessionStorage
        if (conversationId) {
          saveConversation({
            id: conversationId,
            title:
              updatedMessages
                .find((m) => m.role === Role.User)
                ?.content.substring(0, 50) || "New Chat",
            createdAt: new Date().toISOString(),
            messages: updatedMessages,
            updatedAt: new Date().toISOString(),
          });
        }

        return updatedMessages;
      });
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

    // Construct API payload content (Text + Attachments Context)
    // We do NOT clutter the visible user message with huge base64 strings anymore.
    // Instead dependencies are handled via the `attachments` property on the message object (which we will add).

    // For the API capability, we still need to send the context.
    let apiContent = currentQuery;
    if (attachments.length > 0) {
      const fileContext = attachments
        .map((a) =>
          a.type.startsWith("image/")
            ? `[Image Uploaded: ${a.name}]` // Placeholder for text history if needed
            : `<details><summary>Reference File: ${a.name}</summary>\n\n\`\`\`\n${a.content}\n\`\`\`\n</details>`
        )
        .join("\n\n");

      // However, for the AI to "see" it, we must include the data.
      // For this "Pro" fix, we will simply append the data for the API only,
      // but keep the user UI clean.

      const aiContext = attachments
        .map((a) =>
          a.type.startsWith("image/")
            ? `![${a.name}](${a.content})`
            : `\n\nFile: ${a.name}\n\`\`\`\n${a.content}\n\`\`\``
        )
        .join("\n");

      apiContent = `${aiContext}\n\n${currentQuery}`;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: Role.User,
      content: currentQuery, // Clean text only for UI
      attachments: attachments, // Store full attachments here for UI rendering
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setAttachments([]);
    setIsLoading(true);

    // Create execution entry in sidebar on first message
    if (!executionCreated && conversationId) {
      const title =
        currentQuery.length > 50
          ? currentQuery.substring(0, 50) + "..."
          : currentQuery;

      addExecution({
        id: conversationId,
        title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type: "CONVERSATION" as any,
      });
      setExecutionCreated(true);
    }

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { ...userMessage, content: apiContent }].map(
            (m) => ({
              role: m.role,
              content: m.content,
            })
          ),
          model,
          conversationId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        let errorMessage = "An unexpected error occurred.";
        let errorTitle = "Error";

        try {
          // Try to parse as JSON first
          const errorData = await res.json();

          // Handle specific error cases
          if (res.status === 429) {
            errorTitle = "⏱️ Rate Limit Reached";
            errorMessage =
              errorData.error?.message ||
              "You've sent too many requests. Please wait a moment and try again.";
          } else if (res.status === 400) {
            errorTitle = "⚠️ Invalid Request";
            if (errorData.error?.message?.includes("not a valid model")) {
              errorMessage =
                "The selected AI model is not available. Please try a different model from the dropdown.";
            } else {
              errorMessage =
                errorData.error?.message ||
                errorData.message ||
                errorData.message ||
                "Bad request. Please check your input.";
            }
          } else if (res.status === 401) {
            errorTitle = "🔐 Authentication Failed";
            errorMessage =
              "API key is invalid or missing. Please check your configuration.";
          } else if (res.status === 500) {
            errorTitle = "🔧 Server Error";
            errorMessage =
              "The AI service is temporarily unavailable. Please try again in a moment.";
          } else {
            errorMessage =
              errorData.error?.message ||
              errorData.message ||
              JSON.stringify(errorData);
          }
        } catch {
          // Fallback to text (e.g. for HTML 500 pages)
          const textError = await res.text();
          if (textError.includes("<!DOCTYPE html>")) {
            errorTitle = "🔧 Service Error";
            errorMessage =
              "Service temporarily unavailable. Please try again later.";
          } else {
            errorMessage = textError.substring(0, 200); // Truncate long text
          }
        }

        console.error(`Chat Request Failed (${res.status}):`, errorMessage);

        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: Role.Agent,
            content: `**${errorTitle}**\n\n${errorMessage}`,
            isError: true,
            errorType: res.status === 429 ? "rate_limit" : "general",
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
                onModelSelect={handleModelChange}
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
            className="relative flex w-full flex-col gap-3 rounded-2xl bg-background/95 dark:bg-background/95 backdrop-blur-xl p-4 md:p-5 shadow-2xl ring-1 ring-border/10 transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/30 focus-within:shadow-primary/10 focus-within:border-primary/30"
          >
            {/* File Upload Hidden Input */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              onChange={handleFileSelect}
            />

            {/* File Preview Chips */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 px-2 pb-2">
                {attachments.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground border border-border"
                  >
                    <PaperclipIcon className="size-3" />
                    <span className="max-w-[100px] truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="ml-1 rounded-full p-0.5 hover:bg-background text-muted-foreground hover:text-foreground"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative px-2">
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

            <div className="flex items-center justify-between px-1">
              <div className="flex-1 max-w-[200px] md:max-w-xs">
                <ModelSelector
                  value={model}
                  onValueChange={handleModelChange}
                  disabled={isLoading}
                />
              </div>
              <div className="flex items-center gap-1">
                {/* Enterprise Tools Toolbar */}
                <div className="flex items-center gap-0.5 mr-2 pr-2 border-r border-border/40">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach File"
                  >
                    <PaperclipIcon className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 text-muted-foreground hover:text-foreground rounded-full",
                      isListening && "text-red-500 animate-pulse bg-red-500/10"
                    )}
                    onClick={handleSpeech}
                    title="Voice Input"
                  >
                    <MicrophoneIcon
                      className={cn("size-4", isListening && "weight-fill")}
                    />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 text-muted-foreground hover:text-foreground rounded-full",
                      isEnhancing && "animate-spin text-primary"
                    )}
                    onClick={handleEnhance}
                    disabled={isEnhancing || !query.trim()}
                    title="Enhance Prompt (AI)"
                  >
                    <MagicWandIcon className="size-4" />
                  </Button>
                </div>

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
