/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { v4 } from "uuid";
import { toast } from "sonner";
import { useModel } from "@/hooks/use-model";
import { useSettings } from "@/contexts/settings-context";
import { useConversationById, saveConversation } from "@/hooks/useConversation";
import { useExecutionContext } from "@/contexts/execution-context";
import { Message, Role } from "@/lib/types";
import { AIBOT_SYSTEM_PROMPT } from "@/lib/prompts";
import {
  buildChatMessagesForThinkingStage,
  buildThinkingSystemAddon,
  normalizeThinkingStage1Output,
  type ThinkingStage,
} from "@/lib/chat/thinking-mode";
import {
  getConversationPersistId,
  shouldRegisterExecutionForSession,
} from "@/lib/chat/conversation-persist";
import {
  LONG_TASK_MS,
  playCompletionChime,
  showDesktopNotification,
} from "@/lib/desktop-notifications";
import { translate, localeReplyDirective } from "@/lib/i18n";

function httpErrorMessage(
  locale: Parameters<typeof translate>[0],
  status: number,
  detail: string,
) {
  return translate(locale, "errors.http", {
    status,
    detail: detail.substring(0, 200),
  });
}

export interface UseChatSessionOptions {
  conversationId?: string;
  storageKey?: string;
  sessionId?: string; // Persistence key for conversationId
  executionType?: any; // e.g. ExecutionType.ARENA
  viewMode?: "direct" | "side-by-side";
}

export function useChatSession({
  conversationId: initialConversationId,
  storageKey = "preferredModel",
  sessionId,
  executionType,
  viewMode,
}: UseChatSessionOptions = {}) {
  // --- State ---
  const { modelId: persistedModelId, setModelId } = useModel({
    storageKey,
    persistToLocalStorage: true,
  });

  const [model, setModel] = useState<string>(persistedModelId);
  const [query, setQuery] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<
    { name: string; content: string; type: string }[]
  >([]);
  const { apiKeys, ollamaUrl, desktopNotifications, completionSound, locale } =
    useSettings();
  const [executionCreated, setExecutionCreated] = useState(false);

  // Initialize conversationId with session persistence logic
  const [conversationId, setConversationId] = useState<string | null>(() => {
    if (initialConversationId) return initialConversationId;
    if (sessionId && typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem(`session-${sessionId}`);
        if (stored) return stored;
      } catch (e) {
        console.error("Session storage read error", e);
      }
    }
    return v4();
  });

  // Persist conversationId if sessionId is provided
  useEffect(() => {
    if (sessionId && conversationId && typeof window !== "undefined") {
      try {
        sessionStorage.setItem(`session-${sessionId}`, conversationId);
      } catch (e) {
        console.error("Session storage write error", e);
      }
    }
  }, [sessionId, conversationId]);

  // --- Refs ---
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestStartedAtRef = useRef<number | null>(null);
  const thinkingRequestedRef = useRef(false);

  const conversationPersistId = getConversationPersistId(conversationId, {
    sessionId,
    executionType,
  });

  // --- Hooks ---
  const { conversation } = useConversationById(conversationPersistId);
  const { refreshExecutions, addExecution } = useExecutionContext();

  // --- Effects ---
  useEffect(() => {
    if (persistedModelId !== model) {
      setModel(persistedModelId);
    }
  }, [persistedModelId, model]);

  useEffect(() => {
    if (conversation?.messages && conversationPersistId) {
      // Mark all restored messages as not needing animation
      const nonAnimatingMessages = conversation.messages.map((m) => ({
        ...m,
        shouldAnimate: false,
      }));
      setMessages(nonAnimatingMessages);
      setShowWelcome(false);
    }
  }, [conversation, conversationPersistId]);

  // --- Handlers ---
  const handleModelChange = useCallback(
    (newModel: string) => {
      setModel(newModel);
      setModelId(newModel);
    },
    [setModelId],
  );

  const processStream = async (
    response: globalThis.Response,
    isThinkingRequested: boolean = false,
    isOllama: boolean = false,
    options?: {
      finalize?: boolean;
      tempId?: string;
      contentPrefix?: string;
    },
  ) => {
    const finalize = options?.finalize ?? true;
    if (!response.ok || !response.body) {
      if (finalize) setIsLoading(false);
      return "";
    }

    const tempId = options?.tempId ?? `ai-${Date.now()}`;
    const shouldCreatePlaceholder = !options?.tempId;
    if (shouldCreatePlaceholder) {
      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          role: Role.Agent,
          content: "",
          isThinkingRequested,
        },
      ]);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";
    let buffer = "";
    let updateCounter = 0;
    const UPDATE_BATCH_SIZE = 3; // Smaller batch for smoother UI

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        // Keep the last partial line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          if (isOllama) {
            try {
              const data = JSON.parse(trimmedLine);
              const content = data.message?.content || data.response;
              if (content) accumulated += content;
            } catch (e) {
              // Silently ignore parse errors for partial/malformed JSON in stream
            }
          } else if (trimmedLine.startsWith("data: ")) {
            if (trimmedLine === "data: [DONE]") continue;
            try {
              const data = JSON.parse(trimmedLine.slice(6));
              const content = data.choices?.[0]?.delta?.content || data.content;
              if (content) accumulated += content;
            } catch (e) {
              // Silently ignore parse errors for partial/malformed JSON in stream
            }
          }
        }

        updateCounter++;
        if (updateCounter >= UPDATE_BATCH_SIZE || done) {
          updateCounter = 0;
          const prefix = options?.contentPrefix ?? "";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId
                ? {
                    ...m,
                    content: prefix + accumulated,
                    isThinkingRequested,
                  }
                : m,
            ),
          );
        }
      }

      setMessages((prev) => {
        const prefix = options?.contentPrefix ?? "";
        const updatedMessages = prev.map((m) =>
          m.id === tempId
            ? { ...m, content: prefix + accumulated, isThinkingRequested }
            : m,
        );

        if (finalize && conversationPersistId) {
          saveConversation({
            id: conversationPersistId,
            title:
              updatedMessages
                .find((m) => m.role === Role.User)
                ?.content.substring(0, 50) ||
              translate(locale, "chat.defaultTitle"),
            createdAt: new Date().toISOString(),
            messages: updatedMessages,
            updatedAt: new Date().toISOString(),
          });
        }
        return updatedMessages;
      });
      return (options?.contentPrefix ?? "") + accumulated;
    } catch (e) {
      console.error("Stream error", e);
      const errorContent = translate(locale, "errors.connectionInterrupted");
      if (options?.tempId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? { ...m, content: errorContent, isThinkingRequested }
              : m,
          ),
        );
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-stream-${Date.now()}`,
            role: Role.Agent,
            content: errorContent,
          },
        ]);
      }
      return "";
    } finally {
      if (finalize) {
        setIsLoading(false);
        refreshExecutions();

        const wasAborted = abortControllerRef.current?.signal.aborted;
        const startedAt = requestStartedAtRef.current;
        const elapsed = startedAt ? Date.now() - startedAt : 0;
        const wasLong = thinkingRequestedRef.current || elapsed >= LONG_TASK_MS;

        if (!wasAborted && wasLong) {
          if (desktopNotifications) {
            showDesktopNotification({
              title: translate(
                locale,
                thinkingRequestedRef.current
                  ? "notify.thinking.title"
                  : "notify.complete.title",
              ),
              body: translate(
                locale,
                thinkingRequestedRef.current
                  ? "notify.thinking.body"
                  : "notify.complete.body",
              ),
              tag: `aibot-${conversationId || "chat"}`,
            });
          }
          if (completionSound) {
            playCompletionChime();
          }
        }

        requestStartedAtRef.current = null;
        thinkingRequestedRef.current = false;
      }
    }
  };

  const handleSend = async (
    manualQuery?: string,
    manualAttachments?: { name: string; content: string; type: string }[],
    systemInstruction?: string,
    isThinking?: boolean,
  ) => {
    const inputQuery = manualQuery || query;
    if (!inputQuery.trim() || isLoading) return;

    const thinkingRequested = !!isThinking;
    thinkingRequestedRef.current = thinkingRequested;
    requestStartedAtRef.current = Date.now();
    setShowWelcome(false);
    const currentQuery = inputQuery.trim();
    const currentAttachments = manualAttachments || attachments;

    // Prepare content with attachments for the API
    let apiContent = currentQuery;
    if (currentAttachments.length > 0) {
      const aiContext = currentAttachments
        .map((a) =>
          a.type.startsWith("image/")
            ? `![${a.name}](${a.content})`
            : `\n\nFile: ${a.name}\n\`\`\`\n${a.content}\n\`\`\``,
        )
        .join("\n");
      apiContent = `${aiContext}\n\n${currentQuery}`;
    }

    // Append hidden instruction if provided
    if (systemInstruction) {
      apiContent = `${systemInstruction}\n\n${apiContent}`;
    }

    const userMessage: Message = {
      id: `user-${sessionId ?? "chat"}-${Date.now()}`,
      role: Role.User,
      content: currentQuery, // Keep visible content clean
      attachments: [...currentAttachments],
    };

    setMessages((prev) => [...prev, userMessage]);

    // Only clear local query state if we are depending on it.
    setQuery("");
    setAttachments([]);
    setIsLoading(true);

    if (
      !executionCreated &&
      conversationId &&
      shouldRegisterExecutionForSession(sessionId)
    ) {
      const title =
        currentQuery.length > 50
          ? currentQuery.substring(0, 50) + "..."
          : currentQuery;
      addExecution({
        id: conversationId,
        title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type: executionType || ("CONVERSATION" as any),
        mode: viewMode || "direct",
      });
      setExecutionCreated(true);
    }

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      const isOllama = model.startsWith("ollama/");
      const historyForThinking = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      if (isOllama) {
        const ollamaModelName = model.replace("ollama/", "");

        // Normalize URL
        let targetUrl = ollamaUrl.trim();
        if (!targetUrl) {
          targetUrl = "http://localhost:11434";
        }
        if (!/^https?:\/\//i.test(targetUrl)) {
          targetUrl = `http://${targetUrl}`;
        }

        const baseSystemPrompt = `You are a helpful AI assistant integrated within the AiBoT platform, developed by Suryanshu Nabheet.\n\n${AIBOT_SYSTEM_PROMPT}${localeReplyDirective(locale)}`;

        const buildOllamaPayload = (
          stage: ThinkingStage,
          priorReasoning?: string,
        ) => {
          const systemPrompt = `${baseSystemPrompt}\n\n${buildThinkingSystemAddon(stage)}`;
          const chatMessages = buildChatMessagesForThinkingStage({
            history: historyForThinking,
            userContent: apiContent,
            stage,
            priorReasoning,
          });
          return {
            model: ollamaModelName,
            messages: [
              { role: "system", content: systemPrompt },
              ...chatMessages,
            ],
            stream: true,
          };
        };

        // Stage 1 + Stage 2 (merged into one assistant message)
        if (thinkingRequested) {
          const tempId = `ai-${Date.now()}`;

          // Create the placeholder once so UI renders as a single message bubble.
          setMessages((prev) => [
            ...prev,
            {
              id: tempId,
              role: Role.Agent,
              content: "",
              isThinkingRequested: true,
            },
          ]);

          // Stage 1: thinking-only
          const chatPayload1 = buildOllamaPayload("thinking");
          let res1: Response;
          try {
            res1 = await fetch(`${targetUrl}/api/chat`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(chatPayload1),
              signal: abortControllerRef.current.signal,
            });
          } catch (err) {
            console.warn(
              "Primary Ollama chat connection failed (stage 1), trying loopback fallback...",
              err,
            );
            if (targetUrl.includes("localhost")) {
              const fallbackUrl = targetUrl.replace("localhost", "127.0.0.1");
              res1 = await fetch(`${fallbackUrl}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(chatPayload1),
                signal: abortControllerRef.current.signal,
              });
            } else {
              throw err;
            }
          }

          if (!res1.ok) {
            const errorText = await res1.text();
            setMessages((prev) => [
              ...prev,
              {
                id: `error-${Date.now()}`,
                role: Role.Agent,
                content: httpErrorMessage(locale, res1.status, errorText),
                isError: true,
              },
            ]);
            setIsLoading(false);
            return;
          }

          const stage1Raw = await processStream(res1, true, true, {
            finalize: false,
            tempId,
            contentPrefix: "",
          });
          const stage1Final = normalizeThinkingStage1Output(stage1Raw);

          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId
                ? { ...m, content: stage1Final, isThinkingRequested: true }
                : m,
            ),
          );

          // Stage 2: final-only (append to same message)
          const chatPayload2 = buildOllamaPayload("final", stage1Final);
          let res2: Response;
          try {
            res2 = await fetch(`${targetUrl}/api/chat`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(chatPayload2),
              signal: abortControllerRef.current.signal,
            });
          } catch (err) {
            console.warn(
              "Primary Ollama chat connection failed (stage 2), trying loopback fallback...",
              err,
            );
            if (targetUrl.includes("localhost")) {
              const fallbackUrl = targetUrl.replace("localhost", "127.0.0.1");
              res2 = await fetch(`${fallbackUrl}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(chatPayload2),
                signal: abortControllerRef.current.signal,
              });
            } else {
              throw err;
            }
          }

          if (!res2.ok) {
            const errorText = await res2.text();
            setMessages((prev) => [
              ...prev,
              {
                id: `error-${Date.now()}`,
                role: Role.Agent,
                content: httpErrorMessage(locale, res2.status, errorText),
                isError: true,
              },
            ]);
            setIsLoading(false);
            return;
          }

          await processStream(res2, false, true, {
            finalize: true,
            tempId,
            contentPrefix: stage1Final,
          });

          return;
        }

        // Non-thinking Ollama (single phase)
        const chatPayload = {
          model: ollamaModelName,
          messages: [
            { role: "system", content: baseSystemPrompt },
            ...messages,
            { ...userMessage, content: apiContent },
          ].map((m) => ({ role: m.role, content: m.content })),
          stream: true,
        };

        let res: Response;
        try {
          res = await fetch(`${targetUrl}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(chatPayload),
            signal: abortControllerRef.current.signal,
          });
        } catch (err) {
          console.warn(
            "Primary Ollama chat connection failed, trying loopback fallback...",
            err,
          );
          if (targetUrl.includes("localhost")) {
            const fallbackUrl = targetUrl.replace("localhost", "127.0.0.1");
            res = await fetch(`${fallbackUrl}/api/chat`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(chatPayload),
              signal: abortControllerRef.current.signal,
            });
          } else {
            throw err;
          }
        }

        if (!res.ok) {
          const errorText = await res.text();
          setMessages((prev) => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              role: Role.Agent,
              content: httpErrorMessage(locale, res.status, errorText),
              isError: true,
            },
          ]);
          setIsLoading(false);
          return;
        }

        await processStream(res, false, true);
        return;
      }

      // Non-Ollama provider (single OpenAI/OpenRouter proxy)
      if (thinkingRequested) {
        const tempId = `ai-${Date.now()}`;

        // Create placeholder once so Stage 1 + Stage 2 render as one bubble.
        setMessages((prev) => [
          ...prev,
          {
            id: tempId,
            role: Role.Agent,
            content: "",
            isThinkingRequested: true,
          },
        ]);

        // Stage 1: thinking-only
        const stage1Messages = buildChatMessagesForThinkingStage({
          history: historyForThinking,
          userContent: apiContent,
          stage: "thinking",
        });

        const res1 = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: stage1Messages,
            model,
            conversationId: conversationPersistId ?? conversationId,
            thinkingStage: "thinking",
            customKeys: apiKeys,
            locale,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!res1.ok) {
          const errorText = await res1.text();
          setMessages((prev) => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              role: Role.Agent,
              content: httpErrorMessage(locale, res1.status, errorText),
              isError: true,
            },
          ]);
          setIsLoading(false);
          return;
        }

        const stage1Raw = await processStream(res1, true, false, {
          finalize: false,
          tempId,
          contentPrefix: "",
        });
        const stage1Final = normalizeThinkingStage1Output(stage1Raw);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? { ...m, content: stage1Final, isThinkingRequested: true }
              : m,
          ),
        );

        const stage2Messages = buildChatMessagesForThinkingStage({
          history: historyForThinking,
          userContent: apiContent,
          stage: "final",
          priorReasoning: stage1Final,
        });

        // Stage 2: final-only (append to same message)
        const res2 = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: stage2Messages,
            model,
            conversationId: conversationPersistId ?? conversationId,
            thinkingStage: "final",
            priorReasoning: stage1Final,
            customKeys: apiKeys,
            locale,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!res2.ok) {
          const errorText = await res2.text();
          setMessages((prev) => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              role: Role.Agent,
              content: httpErrorMessage(locale, res2.status, errorText),
              isError: true,
            },
          ]);
          setIsLoading(false);
          return;
        }

        await processStream(res2, false, false, {
          finalize: true,
          tempId,
          contentPrefix: stage1Final,
        });
        return;
      }

      // Non-thinking single phase
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { ...userMessage, content: apiContent }].map(
            (m) => ({ role: m.role, content: m.content }),
          ),
          model,
          conversationId: conversationPersistId ?? conversationId,
          isThinking: false,
          customKeys: apiKeys,
          locale,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: Role.Agent,
            content: httpErrorMessage(locale, res.status, errorText),
            isError: true,
          },
        ]);
        setIsLoading(false);
        return;
      }

      await processStream(res, false, false);
    } catch (error: any) {
      if (error.name !== "AbortError") {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-fetch-${Date.now()}`,
            role: Role.Agent,
            content: translate(locale, "errors.network", {
              message: error.message,
            }),
          },
        ]);
      }
      setIsLoading(false);
    }
  };

  const stopHelpers = {
    stop: () => abortControllerRef.current?.abort(),
  };

  return {
    model,
    setModel: handleModelChange,
    query,
    setQuery,
    messages,
    setMessages,
    showWelcome,
    isLoading,
    attachments,
    setAttachments,
    handleSend,
    stopHelpers,
    conversationId,
  };
}
