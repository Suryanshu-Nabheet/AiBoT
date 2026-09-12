/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { v4 } from "uuid";
import { motion } from "framer-motion";
import { ModelSelector } from "@/components/ui/model-selector";
import { useChatSession } from "@/hooks/use-chat-session";
import { ExecutionType } from "@/hooks/useExecution";
import { ChatInput } from "./chat-input";
import { ChatThread } from "./chat-thread";
import { ChatThreadViewport } from "./chat-thread-viewport";
import { Message } from "@/lib/types";
import { useTranslation } from "@/hooks/use-translation";
import { PageShell } from "@/components/layout/page-shell";
import { useThinkingMode } from "@/hooks/use-thinking-mode";
import { useRotatingChatStatus } from "@/hooks/use-rotating-chat-status";
import {
  useChatComposerClipboard,
  useChatComposerEnhance,
  useChatComposerSpeech,
} from "@/hooks/use-chat-composer";
import { useGlobalKeyPress } from "@/hooks/useGlobalKeyPress";

function ArenaPanel({
  model,
  onModelChange,
  modelStorageKey,
  thinkingEnabled,
  onThinkingChange,
  triggerClassName,
  messages,
  isLoading,
  loadingStatus,
  onCopy,
}: {
  model: string;
  onModelChange: (model: string) => void;
  modelStorageKey: string;
  thinkingEnabled: boolean;
  onThinkingChange: (enabled: boolean) => void;
  triggerClassName: string;
  messages: Message[];
  isLoading: boolean;
  loadingStatus: string;
  onCopy: (content: string) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col basis-0 bg-background">
      <div className="z-10 shrink-0 border-b border-border/40 bg-background/95 px-3 py-2.5 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 sm:px-4">
        <ModelSelector
          value={model}
          onValueChange={onModelChange}
          modelStorageKey={modelStorageKey}
          thinkingEnabled={thinkingEnabled}
          onThinkingChange={onThinkingChange}
          triggerClassName={triggerClassName}
          enablePickerShortcut={modelStorageKey === "arena-a"}
        />
      </div>
      <ChatThreadViewport scrollRef={scrollRef} variant="arena">
        <ChatThread
          layout="arena"
          messages={messages}
          isLoading={isLoading}
          loadingStatus={loadingStatus}
          thinkingRequested={thinkingEnabled}
          onCopy={onCopy}
          onModelSelect={onModelChange}
          pdfFileName="arena-response.pdf"
          pdfTitle="Arena Response"
          endRef={endRef}
        />
      </ChatThreadViewport>
    </div>
  );
}

export default function ArenaInterface({
  conversationId: initialConversationId,
}: {
  conversationId?: string;
}) {
  const { t, locale } = useTranslation();
  // Shared conversation ID for both panels to keep history unified
  const [arenaConversationId] = useState(() => initialConversationId || v4());

  // --- Dual Sessions ---
  const leftChat = useChatSession({
    storageKey: "arena-a",
    sessionId: "arena-a",
    conversationId: arenaConversationId,
    executionType: ExecutionType.ARENA,
    viewMode: "side-by-side",
  });
  const rightChat = useChatSession({
    storageKey: "arena-b",
    sessionId: "arena-b",
    conversationId: arenaConversationId,
    executionType: ExecutionType.ARENA,
    viewMode: "side-by-side",
  });

  // --- Shared Input State ---
  const [query, setQuery] = useState("");
  const [attachments, setAttachments] = useState<
    { name: string; content: string; type: string }[]
  >([]);
  const leftThinking = useThinkingMode("aibot_arena_a_thinking_enabled");
  const rightThinking = useThinkingMode("aibot_arena_b_thinking_enabled");
  const isEmptyArena =
    leftChat.messages.length === 0 && rightChat.messages.length === 0;

  const leftLoadingStatus = useRotatingChatStatus(
    leftChat.isLoading,
    leftThinking.thinkingEnabled,
    t,
  );
  const rightLoadingStatus = useRotatingChatStatus(
    rightChat.isLoading,
    rightThinking.thinkingEnabled,
    t,
  );

  const { isListening, onSpeechToggle } = useChatComposerSpeech(
    setQuery,
    t,
    locale,
  );
  const { isEnhancing, onEnhance } = useChatComposerEnhance(query, setQuery, t);
  const handleCopy = useChatComposerClipboard();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isLoadingEither = leftChat.isLoading || rightChat.isLoading;

  useGlobalKeyPress({
    inputRef: textareaRef,
    onKeyPress: (key: string) => setQuery((prev) => prev + key),
    disabled: isLoadingEither,
    loading: isLoadingEither,
  });

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

    void Promise.all([
      leftChat.handleSend(
        currentQuery,
        currentAttachments,
        undefined,
        leftThinking.thinkingEnabled,
      ),
      rightChat.handleSend(
        currentQuery,
        currentAttachments,
        undefined,
        rightThinking.thinkingEnabled,
      ),
    ]);
  };

  const handleStopArena = useCallback(() => {
    if (leftChat.isLoading) leftChat.stopHelpers.stop();
    if (rightChat.isLoading) rightChat.stopHelpers.stop();
  }, [
    leftChat.isLoading,
    leftChat.stopHelpers,
    rightChat.isLoading,
    rightChat.stopHelpers,
  ]);

  const arenaModelTriggerClass =
    "h-8 w-full max-w-full justify-between sm:w-fit sm:max-w-[min(42vw,160px)]";

  const sharedChatInput = (
    <ChatInput
      query={query}
      setQuery={setQuery}
      onSubmit={handleSharedSubmit}
      isLoading={leftChat.isLoading || rightChat.isLoading}
      onStop={handleStopArena}
      attachments={attachments}
      setAttachments={setAttachments}
      isListening={isListening}
      onSpeechToggle={onSpeechToggle}
      isEnhancing={isEnhancing}
      onEnhance={onEnhance}
      textareaRef={textareaRef}
      showModelSelector={false}
      placeholder={
        isListening
          ? t("composer.placeholder.listening")
          : isEmptyArena
            ? t("composer.placeholder")
            : t("composer.placeholder.arena")
      }
      dock={isEmptyArena ? "center" : "bottom"}
      className={isEmptyArena ? "w-full" : "shrink-0"}
    />
  );

  if (isEmptyArena) {
    return (
      <PageShell className="relative h-full min-h-0 w-full flex-col bg-background">
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

            <div
              className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2"
              data-testid="arena-empty-models"
            >
              <ModelSelector
                value={leftChat.model}
                onValueChange={leftChat.setModel}
                modelStorageKey="arena-a"
                thinkingEnabled={leftThinking.thinkingEnabled}
                onThinkingChange={leftThinking.setThinkingEnabled}
                triggerClassName={arenaModelTriggerClass}
                enablePickerShortcut
              />
              <ModelSelector
                value={rightChat.model}
                onValueChange={rightChat.setModel}
                modelStorageKey="arena-b"
                thinkingEnabled={rightThinking.thinkingEnabled}
                onThinkingChange={rightThinking.setThinkingEnabled}
                triggerClassName={arenaModelTriggerClass}
              />
            </div>

            {sharedChatInput}
          </motion.div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="relative flex h-full min-h-0 flex-col bg-background">
      <div className="flex min-h-0 flex-1 flex-col divide-y divide-border/60 overflow-hidden md:flex-row md:divide-x md:divide-y-0">
        <ArenaPanel
          model={leftChat.model}
          onModelChange={leftChat.setModel}
          modelStorageKey="arena-a"
          thinkingEnabled={leftThinking.thinkingEnabled}
          onThinkingChange={leftThinking.setThinkingEnabled}
          triggerClassName={arenaModelTriggerClass}
          messages={leftChat.messages}
          isLoading={leftChat.isLoading}
          loadingStatus={leftLoadingStatus}
          onCopy={handleCopy}
        />
        <ArenaPanel
          model={rightChat.model}
          onModelChange={rightChat.setModel}
          modelStorageKey="arena-b"
          thinkingEnabled={rightThinking.thinkingEnabled}
          onThinkingChange={rightThinking.setThinkingEnabled}
          triggerClassName={arenaModelTriggerClass}
          messages={rightChat.messages}
          isLoading={rightChat.isLoading}
          loadingStatus={rightLoadingStatus}
          onCopy={handleCopy}
        />
      </div>

      {sharedChatInput}
    </PageShell>
  );
}
