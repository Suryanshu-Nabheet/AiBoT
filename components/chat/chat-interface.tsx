/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useChatSession } from "@/hooks/use-chat-session";
import { ChatInput } from "./chat-input";
import { ChatThread } from "./chat-thread";
import { ChatThreadViewport } from "./chat-thread-viewport";
import { useGlobalKeyPress } from "@/hooks/useGlobalKeyPress";
import { useTranslation } from "@/hooks/use-translation";
import { useThinkingMode } from "@/hooks/use-thinking-mode";
import { PageShell } from "@/components/layout/page-shell";
import { useRotatingChatStatus } from "@/hooks/use-rotating-chat-status";
import {
  useChatComposerClipboard,
  useChatComposerEnhance,
  useChatComposerSpeech,
} from "@/hooks/use-chat-composer";

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
    stopHelpers,
  } = useChatSession({
    conversationId: initialConversationId,
    storageKey,
    viewMode: "direct",
  });

  const { thinkingEnabled: isThinking, setThinkingEnabled: setIsThinking } =
    useThinkingMode("aibot_thinking_enabled");
  const loadingStatus = useRotatingChatStatus(isLoading, isThinking, t);
  const { isListening, onSpeechToggle } = useChatComposerSpeech(
    setQuery,
    t,
    locale,
  );
  const { isEnhancing, onEnhance } = useChatComposerEnhance(query, setQuery, t);
  const handleCopy = useChatComposerClipboard();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollRafRef.current !== null) return;

    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = null;

      const container = scrollContainerRef.current;
      if (!container) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
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

  const handleCreateChat = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(undefined, undefined, undefined, isThinking);
  };

  const chatInputProps = {
    query,
    setQuery,
    onSubmit: handleCreateChat,
    isLoading,
    onStop: stopHelpers.stop,
    attachments,
    setAttachments,
    isListening,
    onSpeechToggle,
    isEnhancing,
    onEnhance,
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
          <ChatThreadViewport scrollRef={scrollContainerRef} variant="thread">
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
          </ChatThreadViewport>

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
