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
import { buildChatSystemPrompt } from "@/lib/prompts";
import { mapMessagesForModelHistory } from "@/lib/chat/message-history";
import {
  buildMultimodalUserContent,
  normalizeLegacyAttachment,
  toOllamaMessage,
  type ChatAttachment,
} from "@/lib/chat/attachments";
import {
  buildChatMessagesForThinkingStage,
  buildStage2PriorReasoning,
  cleanThinkingText,
  finalizeStage1Attempts,
  MAX_THINKING_NOTE_RETRIES,
  reconcileTwoStageThinking,
  sanitizeAssistantStreamField,
  shouldRetryThinkingNotes,
  thinkingPanelPreview,
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
import { translate, type Locale } from "@/lib/i18n";
import { resolveChatError, type ChatErrorCode } from "@/lib/chat/chat-error";
import type { CustomKeys } from "@/lib/chat/resolve-provider";

function agentErrorFields(
  locale: Locale,
  status: number,
  modelId: string,
  customKeys: CustomKeys,
  rawBody?: string,
  explicitCode?: ChatErrorCode,
) {
  const resolved = resolveChatError(locale, status, rawBody, explicitCode, {
    modelId,
    customKeys,
  });
  return {
    content: resolved.body,
    errorTitle: resolved.title,
    errorType: resolved.code,
  };
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
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
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
  /** Avoid re-applying stored messages after every request (was wiping new replies). */
  const hydratedConversationIdRef = useRef<string | null>(null);

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
    if (!conversationPersistId || !conversation?.messages?.length) return;
    if (conversation.id !== conversationPersistId) return;
    if (hydratedConversationIdRef.current === conversationPersistId) return;

    hydratedConversationIdRef.current = conversationPersistId;
    setMessages(
      conversation.messages.map((m) => ({
        ...m,
        shouldAnimate: false,
      })),
    );
    setShowWelcome(false);
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
      /** Which message field streaming deltas update (default: content). */
      streamField?: "content" | "thinkingText";
      /** Thinking stage 2 may be empty; reconcile instead of showing a stream error. */
      allowEmptyContent?: boolean;
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

    const consumeBufferedLines = (flushRemainder: boolean) => {
      const lines = buffer.split("\n");
      if (flushRemainder) {
        buffer = "";
      } else {
        buffer = lines.pop() || "";
      }

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        const delta = isOllama
          ? deltaFromOllamaLine(trimmedLine)
          : deltaFromSseLine(trimmedLine);
        if (delta) accumulated += delta;
      }
    };

    const streamField = options?.streamField ?? "content";

    const pushContentToUi = () => {
      const live = sanitizeAssistantStreamField(
        streamField,
        accumulated,
        false,
      );
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                ...m,
                [streamField]: live,
                isThinkingRequested,
              }
            : m,
        ),
      );
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        consumeBufferedLines(false);

        updateCounter++;
        if (updateCounter >= UPDATE_BATCH_SIZE) {
          updateCounter = 0;
          pushContentToUi();
        }

        if (done) {
          consumeBufferedLines(true);
          break;
        }
      }

      const hasRawText = accumulated.trim().length > 0;
      const sanitized = hasRawText
        ? sanitizeAssistantStreamField(streamField, accumulated, true)
        : "";
      const hasText = sanitized.trim().length > 0;

      setMessages((prev) => {
        const updatedMessages = prev.map((m) => {
          if (m.id !== tempId) return m;
          if (
            !hasText &&
            streamField === "content" &&
            !options?.allowEmptyContent
          ) {
            const err = agentErrorFields(
              locale,
              0,
              model,
              apiKeys,
              undefined,
              "network",
            );
            return {
              ...m,
              content: err.content,
              errorTitle: err.errorTitle,
              errorType: err.errorType,
              isThinkingRequested,
              isError: true,
            };
          }
          return {
            ...m,
            [streamField]: hasText
              ? sanitized
              : streamField === "thinkingText"
                ? (m.thinkingText ?? "")
                : m.content,
            isThinkingRequested,
          };
        });

        if (finalize && conversationPersistId && hasText) {
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
      return sanitized;
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        const partial = accumulated;
        if (!accumulated.trim() && options?.tempId) {
          setMessages((prev) =>
            prev.filter((m) => m.id !== tempId || m.content.trim().length > 0),
          );
        }
        return partial;
      }
      console.error("Stream error", e);
      const streamErr = agentErrorFields(
        locale,
        0,
        model,
        apiKeys,
        undefined,
        "network",
      );
      if (options?.tempId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  content: streamErr.content,
                  errorTitle: streamErr.errorTitle,
                  errorType: streamErr.errorType,
                  isThinkingRequested,
                  isError: true,
                }
              : m,
          ),
        );
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-stream-${Date.now()}`,
            role: Role.Agent,
            content: streamErr.content,
            errorTitle: streamErr.errorTitle,
            errorType: streamErr.errorType,
            isError: true,
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
    manualAttachments?: ChatAttachment[],
    systemInstruction?: string,
    isThinking?: boolean,
  ) => {
    const inputQuery = manualQuery || query;
    const currentAttachments = (manualAttachments || attachments).map((a) =>
      normalizeLegacyAttachment(a),
    );
    if ((!inputQuery.trim() && currentAttachments.length === 0) || isLoading)
      return;

    const thinkingRequested = !!isThinking;
    thinkingRequestedRef.current = thinkingRequested;
    requestStartedAtRef.current = Date.now();
    setShowWelcome(false);
    const currentQuery = inputQuery.trim();

    let apiContent = buildMultimodalUserContent(
      currentQuery,
      currentAttachments,
    );

    // Append hidden instruction if provided
    if (systemInstruction) {
      if (typeof apiContent === "string") {
        apiContent = `${systemInstruction}\n\n${apiContent}`;
      } else {
        apiContent = [{ type: "text", text: systemInstruction }, ...apiContent];
      }
    }

    const userMessage: Message = {
      id: `user-${sessionId ?? "chat"}-${Date.now()}`,
      role: Role.User,
      content: currentQuery || "(attachment)",
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

    const pushAgentHttpError = (status: number, errorText: string) => {
      const err = agentErrorFields(locale, status, model, apiKeys, errorText);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: Role.Agent,
          content: err.content,
          errorTitle: err.errorTitle,
          errorType: err.errorType,
          isError: true,
        },
      ]);
      setIsLoading(false);
    };

    const runTwoStageThinking = async (
      tempId: string,
      isOllama: boolean,
      requestStage: (
        stage: ThinkingStage,
        priorReasoning?: string,
      ) => Promise<Response>,
    ) => {
      const applyThinkingPreview = (text: string) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  thinkingText: text,
                  content: "",
                  isThinkingRequested: true,
                }
              : m,
          ),
        );
      };

      const streamThinkingAttempt = async (
        priorForRepair?: string,
      ): Promise<string | null> => {
        const res = await requestStage("thinking", priorForRepair);
        if (!res.ok) {
          if (!priorForRepair) {
            const errorText = await res.text();
            pushAgentHttpError(res.status, errorText);
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
          }
          return null;
        }
        const raw = await processStream(res, true, isOllama, {
          finalize: false,
          tempId,
          streamField: "thinkingText",
        });
        return cleanThinkingText(raw);
      };

      const attempts: string[] = [];
      const first = await streamThinkingAttempt();
      if (first === null) return;
      attempts.push(first);
      applyThinkingPreview(thinkingPanelPreview(first));

      let current = first;
      let repairs = 0;
      while (
        shouldRetryThinkingNotes(current) &&
        repairs < MAX_THINKING_NOTE_RETRIES
      ) {
        applyThinkingPreview("");
        const repaired = await streamThinkingAttempt(current);
        if (repaired === null) break;
        attempts.push(repaired);
        current = repaired;
        repairs += 1;
        applyThinkingPreview(thinkingPanelPreview(current));
      }

      const stage1 = finalizeStage1Attempts(attempts);
      applyThinkingPreview(stage1.notes);

      const stage2Prior = buildStage2PriorReasoning(
        stage1.notes,
        stage1.answerDraft,
      );
      const res2 = await requestStage("final", stage2Prior);
      if (!res2.ok) {
        const fallback = reconcileTwoStageThinking(stage1.notes, "", {
          answerDraft: stage1.answerDraft,
        });
        if (fallback.content.trim()) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId
                ? {
                    ...m,
                    thinkingText: fallback.thinkingText,
                    content: fallback.content,
                    isThinkingRequested: true,
                    isError: false,
                  }
                : m,
            ),
          );
          setIsLoading(false);
          refreshExecutions();
          return;
        }
        const errorText = await res2.text();
        pushAgentHttpError(res2.status, errorText);
        setIsLoading(false);
        return;
      }

      const stage2Raw = await processStream(res2, true, isOllama, {
        finalize: false,
        tempId,
        streamField: "content",
        allowEmptyContent: true,
      });

      const reconciled = reconcileTwoStageThinking(stage1.notes, stage2Raw, {
        answerDraft: stage1.answerDraft,
      });

      setMessages((prev) => {
        const updatedMessages = prev.map((m) => {
          if (m.id !== tempId) return m;
          if (!reconciled.content.trim()) {
            const err = agentErrorFields(
              locale,
              0,
              model,
              apiKeys,
              undefined,
              "network",
            );
            return {
              ...m,
              thinkingText: reconciled.thinkingText,
              content: err.content,
              errorTitle: err.errorTitle,
              errorType: err.errorType,
              isThinkingRequested: true,
              isError: true,
            };
          }
          return {
            ...m,
            thinkingText: reconciled.thinkingText,
            content: reconciled.content,
            isThinkingRequested: true,
            isError: false,
          };
        });

        if (conversationPersistId && reconciled.content.trim()) {
          saveConversation({
            id: conversationPersistId,
            title:
              updatedMessages
                .find((msg) => msg.role === Role.User)
                ?.content.substring(0, 50) ||
              translate(locale, "chat.defaultTitle"),
            createdAt: new Date().toISOString(),
            messages: updatedMessages,
            updatedAt: new Date().toISOString(),
          });
        }
        return updatedMessages;
      });

      setIsLoading(false);
      refreshExecutions();

      const wasAborted = abortControllerRef.current?.signal.aborted;
      const startedAt = requestStartedAtRef.current;
      const elapsed = startedAt ? Date.now() - startedAt : 0;
      const wasLong = thinkingRequestedRef.current || elapsed >= LONG_TASK_MS;

      if (!wasAborted && wasLong) {
        if (desktopNotifications) {
          showDesktopNotification({
            title: translate(locale, "notify.thinking.title"),
            body: translate(locale, "notify.thinking.body"),
            tag: `aibot-${conversationId || "chat"}`,
          });
        }
        if (completionSound) {
          playCompletionChime();
        }
      }

      requestStartedAtRef.current = null;
      thinkingRequestedRef.current = false;
    };

    try {
      const isOllama = model.startsWith("ollama/");
      const historyForModel = mapMessagesForModelHistory(messages);

      if (isOllama) {
        const ollamaModelName = model.replace("ollama/", "");
        const ollamaUser = toOllamaMessage(apiContent);
        const historyForOllama = historyForModel.map((m) => {
          const converted = toOllamaMessage(m.content);
          return {
            role: m.role,
            content: converted.content,
            ...(converted.images ? { images: converted.images } : {}),
          };
        });

        const buildOllamaPayload = (
          stage: ThinkingStage,
          priorReasoning?: string,
        ) => {
          const systemPrompt = buildChatSystemPrompt({
            modelId: model,
            locale,
            thinkingStage: stage,
          });
          const chatMessages = buildChatMessagesForThinkingStage({
            history: historyForOllama.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            userContent: ollamaUser.content,
            stage,
            priorReasoning,
          });
          return {
            model: ollamaModelName,
            messages: [
              { role: "system", content: systemPrompt },
              ...chatMessages.map((m, index) => {
                if (
                  index === chatMessages.length - 1 &&
                  m.role === "user" &&
                  ollamaUser.images?.length
                ) {
                  return { ...m, images: ollamaUser.images };
                }
                return m;
              }),
            ],
            stream: true,
          };
        };

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

          await runTwoStageThinking(tempId, true, (stage, prior) =>
            postOllamaChat(
              ollamaUrl,
              buildOllamaPayload(stage, prior),
              abortControllerRef.current!.signal,
            ),
          );
          return;
        }

        // Non-thinking Ollama (single phase)
        const chatPayload = {
          model: ollamaModelName,
          messages: [
            {
              role: "system",
              content: buildChatSystemPrompt({ modelId: model, locale }),
            },
            ...historyForOllama,
            {
              role: "user",
              content: ollamaUser.content,
              ...(ollamaUser.images ? { images: ollamaUser.images } : {}),
            },
          ],
          stream: true,
        };

        const res = await postOllamaChat(
          ollamaUrl,
          chatPayload,
          abortControllerRef.current.signal,
        );

        if (!res.ok) {
          const errorText = await res.text();
          const err = agentErrorFields(
            locale,
            res.status,
            model,
            apiKeys,
            errorText,
            "ollama",
          );
          setMessages((prev) => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              role: Role.Agent,
              content: err.content,
              errorTitle: err.errorTitle,
              errorType: err.errorType,
              isError: true,
            },
          ]);
          setIsLoading(false);
          return;
        }

        await processStream(res, false, true);
        return;
      }

      if (thinkingRequested) {
        const tempId = newAgentMessageId();
        const apiHistory = [
          ...historyForModel,
          { role: "user", content: apiContent },
        ];

        setMessages((prev) => [
          ...prev,
          {
            id: tempId,
            role: Role.Agent,
            content: "",
            isThinkingRequested: true,
          },
        ]);

        await runTwoStageThinking(tempId, false, (stage, prior) =>
          fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: apiHistory,
              model,
              conversationId: conversationPersistId ?? conversationId,
              thinkingStage: stage,
              priorReasoning: prior,
              customKeys: sanitizeCustomKeysForRequest(apiKeys),
              locale,
            }),
            signal: abortControllerRef.current!.signal,
          }),
        );
        return;
      }

      // Non-thinking single phase
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...historyForModel, { role: "user", content: apiContent }],
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
        const err = agentErrorFields(
          locale,
          res.status,
          model,
          apiKeys,
          errorText,
        );
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: Role.Agent,
            content: err.content,
            errorTitle: err.errorTitle,
            errorType: err.errorType,
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
        const err = agentErrorFields(
          locale,
          0,
          model,
          apiKeys,
          message,
          "network",
        );
        setMessages((prev) => [
          ...prev,
          {
            id: `error-fetch-${Date.now()}`,
            role: Role.Agent,
            content: err.content,
            errorTitle: err.errorTitle,
            errorType: err.errorType,
            isError: true,
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
