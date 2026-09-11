/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { v4 } from "uuid";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ModelSelector } from "@/components/ui/model-selector";
import { useChatSession } from "@/hooks/use-chat-session";
import { ChatInput } from "./chat-input";
import { ChatThread } from "./chat-thread";
import { Message } from "@/lib/types";
import { useTranslation } from "@/hooks/use-translation";
import { PageShell } from "@/components/layout/page-shell";
import { useThinkingMode } from "@/hooks/use-thinking-mode";

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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col basis-0 bg-background">
      <div className="z-10 shrink-0 border-b border-border/40 bg-background/95 px-3 py-2.5 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
        <ModelSelector
          value={model}
          onValueChange={onModelChange}
          modelStorageKey={modelStorageKey}
          thinkingEnabled={thinkingEnabled}
          onThinkingChange={onThinkingChange}
          triggerClassName={triggerClassName}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin">
        <ChatThread
          layout="arena"
          messages={messages}
          isLoading={isLoading}
          loadingStatus={loadingStatus}
          thinkingRequested={thinkingEnabled && isLoading}
          onCopy={onCopy}
          pdfFileName="arena-response.pdf"
          pdfTitle="Arena Response"
          endRef={endRef}
          className="pt-1 sm:pt-2"
        />
      </div>
    </div>
  );
}

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
  const leftThinking = useThinkingMode("aibot_arena_a_thinking_enabled");
  const rightThinking = useThinkingMode("aibot_arena_b_thinking_enabled");
  const isEmptyArena =
    leftChat.messages.length === 0 && rightChat.messages.length === 0;

  const [leftLoadingStatus, setLeftLoadingStatus] = useState(
    "AiBoT is thinking...",
  );
  const [rightLoadingStatus, setRightLoadingStatus] = useState(
    "AiBoT is thinking...",
  );

  useEffect(() => {
    if (!leftChat.isLoading) {
      setLeftLoadingStatus(
        leftThinking.thinkingEnabled
          ? "AiBoT is thinking..."
          : "AiBoT is generating...",
      );
      return;
    }
    const statuses = leftThinking.thinkingEnabled
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
  }, [leftChat.isLoading, leftThinking.thinkingEnabled]);

  useEffect(() => {
    if (!rightChat.isLoading) {
      setRightLoadingStatus(
        rightThinking.thinkingEnabled
          ? "AiBoT is thinking..."
          : "AiBoT is generating...",
      );
      return;
    }
    const statuses = rightThinking.thinkingEnabled
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
  }, [rightChat.isLoading, rightThinking.thinkingEnabled]);

  const recognitionRef = useRef<SpeechRecognition | null>(null);

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

  const handleStopBoth = useCallback(() => {
    leftChat.stopHelpers.stop();
    rightChat.stopHelpers.stop();
  }, [leftChat.stopHelpers, rightChat.stopHelpers]);

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

  const arenaEmptyModelTriggerClass =
    "h-9 w-full min-w-0 max-w-none shrink justify-start";
  const arenaPanelModelTriggerClass =
    "h-8 w-full min-w-0 max-w-full shrink justify-start";

  const sharedChatInput = (
    <ChatInput
      query={query}
      setQuery={setQuery}
      onSubmit={handleSharedSubmit}
      isLoading={leftChat.isLoading || rightChat.isLoading}
      onStop={handleStopBoth}
      attachments={attachments}
      setAttachments={setAttachments}
      isListening={isListening}
      onSpeechToggle={handleSpeech}
      isEnhancing={isEnhancing}
      onEnhance={handleEnhance}
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
              <div className="min-w-0">
                <ModelSelector
                  value={leftChat.model}
                  onValueChange={leftChat.setModel}
                  modelStorageKey="arena-a"
                  thinkingEnabled={leftThinking.thinkingEnabled}
                  onThinkingChange={leftThinking.setThinkingEnabled}
                  triggerClassName={arenaEmptyModelTriggerClass}
                />
              </div>
              <div className="min-w-0">
                <ModelSelector
                  value={rightChat.model}
                  onValueChange={rightChat.setModel}
                  modelStorageKey="arena-b"
                  thinkingEnabled={rightThinking.thinkingEnabled}
                  onThinkingChange={rightThinking.setThinkingEnabled}
                  triggerClassName={arenaEmptyModelTriggerClass}
                />
              </div>
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
          triggerClassName={arenaPanelModelTriggerClass}
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
          triggerClassName={arenaPanelModelTriggerClass}
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
