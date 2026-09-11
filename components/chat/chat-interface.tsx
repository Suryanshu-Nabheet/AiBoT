/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { v4 } from "uuid";
import React, { useState, useRef, useEffect, useCallback } from "react";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useChatSession } from "@/hooks/use-chat-session";
import { ChatInput } from "./chat-input";
import { ChatThread } from "./chat-thread";
import { useConversationById, saveConversation } from "@/hooks/useConversation";
import { useGlobalKeyPress } from "@/hooks/useGlobalKeyPress";
import { useExecutionContext } from "@/contexts/execution-context";
import { Role } from "@/lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "@/hooks/use-translation";
import { useThinkingMode } from "@/hooks/use-thinking-mode";
import { PageShell } from "@/components/layout/page-shell";
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
    <PageShell
      className={cn(
        "relative h-full min-h-0 w-full flex-col bg-background",
        className,
      )}
    >
      {isEmptyChat ? (
        <div className="grid min-h-0 w-full flex-1 place-items-center overflow-y-auto overscroll-contain px-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-4">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative w-full max-w-4xl"
          >
            <p className="chat-welcome-line pointer-events-none absolute bottom-full left-0 right-0 mb-4 max-w-xl mx-auto text-balance px-2 text-center sm:mb-5 md:mb-6">
              {t("chat.welcome.greeting")}
            </p>

            <ChatInput {...chatInputProps} dock="center" className="w-full" />
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
                <ChatThread
                  messages={messages}
                  onCopy={handleCopy}
                  onModelSelect={setModel}
                  isLoading={isLoading}
                  loadingStatus={loadingStatus}
                  thinkingRequested={isThinking}
                  endRef={messagesEndRef}
                />
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
