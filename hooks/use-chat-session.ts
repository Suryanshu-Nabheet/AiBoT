/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { v4 } from "uuid";
import { useModel } from "@/hooks/use-model";
import { useSettings } from "@/contexts/settings-context";
import { useConversationById, saveConversation } from "@/hooks/useConversation";
import { sanitizeCustomKeysForRequest } from "@/lib/chat/sanitize-custom-keys";
import { postOllamaChat } from "@/lib/chat/ollama-url";
import { deltaFromOllamaLine, deltaFromSseLine } from "@/lib/chat/stream-delta";
import { useExecutionContext } from "@/contexts/execution-context";
import { ExecutionType } from "@/hooks/useExecution";
import { Message, Role } from "@/lib/types";
import { AIBOT_SYSTEM_PROMPT } from "@/lib/prompts";
import {
  buildChatMessagesForThinkingStage,
  buildThinkingSystemAddon,
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
  executionType?: ExecutionType;
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
  const [conversationId] = useState<string | null>(() => {
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
    if (conversation?.messages && conversationPersistId && !isLoading) {
      // Mark all restored messages as not needing animation
      const nonAnimatingMessages = conversation.messages.map((m) => ({
        ...m,
        shouldAnimate: false,
      }));
      setMessages(nonAnimatingMessages);
      setShowWelcome(false);
    }
  }, [conversation, conversationPersistId, isLoading]);

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

          const delta = isOllama
            ? deltaFromOllamaLine(trimmedLine)
            : deltaFromSseLine(trimmedLine);
          if (delta) accumulated += delta;
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
      if ((e as Error).name === "AbortError") {
        return (options?.contentPrefix ?? "") + accumulated;
      }
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
        type: executionType ?? ExecutionType.CONVERSATION,
        mode: viewMode || "direct",
      });
      setExecutionCreated(true);
    }

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    const newAgentMessageId = () =>
      `ai-${sessionId ?? "chat"}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      const isOllama = model.startsWith("ollama/");
      const historyForThinking = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      if (isOllama) {
        const ollamaModelName = model.replace("ollama/", "");

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

        // Single stream: brief <thinking> block, then answer (same path as direct /api chat)
        if (thinkingRequested) {
          const tempId = newAgentMessageId();

          setMessages((prev) => [
            ...prev,
            {
              id: tempId,
              role: Role.Agent,
              content: "",
              isThinkingRequested: true,
            },
          ]);

          const chatPayload = buildOllamaPayload("combined");
          const res = await postOllamaChat(
            ollamaUrl,
            chatPayload,
            abortControllerRef.current.signal,
          );

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

          await processStream(res, true, true, {
            finalize: true,
            tempId,
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

        const res = await postOllamaChat(
          ollamaUrl,
          chatPayload,
          abortControllerRef.current.signal,
        );

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
        const tempId = newAgentMessageId();

        setMessages((prev) => [
          ...prev,
          {
            id: tempId,
            role: Role.Agent,
            content: "",
            isThinkingRequested: true,
          },
        ]);

        const combinedMessages = buildChatMessagesForThinkingStage({
          history: historyForThinking,
          userContent: apiContent,
          stage: "combined",
        });

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: combinedMessages,
            model,
            conversationId: conversationPersistId ?? conversationId,
            thinkingStage: "combined",
            customKeys: sanitizeCustomKeysForRequest(apiKeys),
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

        await processStream(res, true, false, {
          finalize: true,
          tempId,
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
          customKeys: sanitizeCustomKeysForRequest(apiKeys),
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
    } catch (error: unknown) {
      const isAbort = error instanceof Error && error.name === "AbortError";
      if (!isAbort) {
        const message = error instanceof Error ? error.message : String(error);
        setMessages((prev) => [
          ...prev,
          {
            id: `error-fetch-${Date.now()}`,
            role: Role.Agent,
            content: translate(locale, "errors.network", { message }),
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
