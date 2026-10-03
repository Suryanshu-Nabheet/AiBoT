/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
import { v4 } from "uuid";
import { useModel } from "@/hooks/use-model";
import { useSettings } from "@/contexts/settings-context";
import {
  flushPersistConversationSnapshot,
  persistConversationSnapshot,
} from "@/lib/chat/persist-conversation-snapshot";
import {
  getConversationInitialState,
  loadConversationMessages,
  resolveConversationPersistId,
} from "@/lib/chat/load-conversation-messages";
import { runWebSearchForTurn } from "@/lib/web-search/client";
import { buildRunningWebSearchTrace } from "@/lib/web-search/trace";
import type { WebSearchTrace } from "@/lib/web-search/types";
import { sanitizeCustomKeysForRequest } from "@/lib/chat/sanitize-custom-keys";
import { postOllamaChat } from "@/lib/chat/ollama-url";
import { deltaFromOllamaLine, deltaFromSseLine } from "@/lib/chat/stream-delta";
import { useExecutionContext } from "@/contexts/execution-context";
import { ExecutionType } from "@/hooks/useExecution";
import { Message, Role } from "@/lib/types";
import { buildChatSystemPrompt } from "@/lib/prompts";
import { mapMessagesForModelHistory } from "@/lib/chat/message-history";
import {
  isDocumentWorkRequest,
  messageStartsDocumentWork,
} from "@/lib/chat/document-work";
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
  MAX_THINKING_ANSWER_RETRIES,
  MAX_THINKING_NOTE_RETRIES,
  reconcileTwoStageThinking,
  sanitizeAssistantStreamField,
  shouldSkipThinkingForTurn,
  resolveThinkingPanelNotes,
  shouldRetryThinkingAnswer,
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

function assistantErrorFields(
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

function queueConversationPersist(
  conversationPersistId: string,
  messages: Message[],
  locale: Locale,
) {
  queueMicrotask(() => {
    persistConversationSnapshot(conversationPersistId, messages, locale);
  });
}

export interface UseChatSessionOptions {
  conversationId?: string;
  storageKey?: string;
  sessionId?: string; // Persistence key for conversationId
  executionType?: ExecutionType;
  viewMode?: "direct" | "side-by-side";
  webSearchEnabled?: boolean;
}

export function useChatSession({
  conversationId: initialConversationId,
  storageKey = "preferredModel",
  sessionId,
  executionType,
  viewMode,
  webSearchEnabled = false,
}: UseChatSessionOptions = {}) {
  // --- State ---
  const { modelId: persistedModelId, setModelId } = useModel({
    storageKey,
    persistToLocalStorage: true,
  });

  const [model, setModel] = useState<string>(persistedModelId);
  const [query, setQuery] = useState<string>("");
  const [initialChat] = useState(() =>
    getConversationInitialState(initialConversationId, {
      sessionId,
      executionType,
    }),
  );
  const [messages, setMessages] = useState<Message[]>(initialChat.messages);
  const [showWelcome, setShowWelcome] = useState(initialChat.showWelcome);
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
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

  useEffect(() => {
    if (!initialConversationId) return;

    const nextPersistId = resolveConversationPersistId(initialConversationId, {
      sessionId,
      executionType,
    });
    if (!nextPersistId) return;

    setConversationId(initialConversationId);
    setQuery("");
    setAttachments([]);
    setIsLoading(false);

    if (hydratedConversationIdRef.current === nextPersistId) {
      return;
    }

    hydratedConversationIdRef.current = nextPersistId;
    const storedMessages = loadConversationMessages(initialConversationId, {
      sessionId,
      executionType,
    });

    if (storedMessages.length > 0) {
      setMessages(storedMessages);
      setShowWelcome(false);
    } else {
      setMessages([]);
      setShowWelcome(true);
    }
  }, [initialConversationId, sessionId, executionType]);

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
  const requestSequenceRef = useRef(0);
  const requestStartedAtRef = useRef<number | null>(null);
  const thinkingRequestedRef = useRef(false);
  /** Avoid re-applying stored messages after every request (was wiping new replies). */
  const hydratedConversationIdRef = useRef<string | null>(null);
  const messagesRef = useRef(messages);
  const streamPersistTickRef = useRef(0);

  const conversationPersistId = getConversationPersistId(conversationId, {
    sessionId,
    executionType,
  });

  // --- Hooks ---
  const { refreshExecutions, addExecution } = useExecutionContext();

  // --- Effects ---
  useLayoutEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (conversationPersistId && messagesRef.current.length > 0) {
        flushPersistConversationSnapshot(
          conversationPersistId,
          messagesRef.current,
          locale,
        );
      }
    };
  }, [conversationPersistId, locale]);

  useEffect(() => {
    if (persistedModelId !== model) {
      setModel(persistedModelId);
    }
  }, [persistedModelId, model]);

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
      requestId?: number;
      webSearchTrace?: WebSearchTrace;
    },
  ) => {
    const finalize = options?.finalize ?? true;
    const requestId = options?.requestId;
    const isCurrentRequest = () =>
      requestId === undefined || requestSequenceRef.current === requestId;
    if (!response.ok || !response.body) {
      if (finalize && isCurrentRequest()) setIsLoading(false);
      return "";
    }

    const tempId = options?.tempId ?? `ai-${Date.now()}`;
    const shouldCreatePlaceholder = !options?.tempId;
    if (shouldCreatePlaceholder) {
      setMessages((prev) => {
        const next: Message[] = [
          ...prev,
          {
            id: tempId,
            role: Role.Assistant,
            content: "",
            isThinkingRequested,
            webSearchTrace: options?.webSearchTrace,
          },
        ];
        if (conversationPersistId) {
          queueConversationPersist(conversationPersistId, next, locale);
        }
        return next;
      });
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
      if (!isCurrentRequest()) return;
      let live = sanitizeAssistantStreamField(streamField, accumulated, false);
      if (streamField === "thinkingText") {
        const preview = thinkingPanelPreview(live);
        live = preview || (live.length > 0 && live.length < 280 ? live : "");
      }
      setMessages((prev) => {
        if (!isCurrentRequest()) return prev;
        const next = prev.map((m) =>
          m.id === tempId
            ? {
                ...m,
                [streamField]: live,
                isThinkingRequested,
              }
            : m,
        );
        streamPersistTickRef.current += 1;
        if (conversationPersistId && streamPersistTickRef.current % 4 === 0) {
          queueConversationPersist(conversationPersistId, next, locale);
        }
        return next;
      });
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

      let messagesToPersist: Message[] | null = null;
      setMessages((prev) => {
        if (!isCurrentRequest()) return prev;
        const updatedMessages = prev.map((m) => {
          if (m.id !== tempId) return m;
          if (
            !hasText &&
            streamField === "content" &&
            !options?.allowEmptyContent
          ) {
            const err = assistantErrorFields(
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

        if (finalize && conversationPersistId) {
          messagesToPersist = updatedMessages;
        }
        return updatedMessages;
      });
      if (messagesToPersist && conversationPersistId) {
        queueConversationPersist(
          conversationPersistId,
          messagesToPersist,
          locale,
        );
      }
      return sanitized;
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        const partial = accumulated;
        const sanitizedPartial = partial.trim()
          ? sanitizeAssistantStreamField(streamField, partial, true)
          : "";
        if (options?.tempId) {
          setMessages((prev) => {
            let next: Message[];
            if (!sanitizedPartial.trim()) {
              next = prev.filter(
                (m) =>
                  m.id !== tempId ||
                  m.content.trim().length > 0 ||
                  Boolean(m.thinkingText?.trim()) ||
                  Boolean(m.webSearchTrace),
              );
            } else {
              next = prev.map((m) =>
                m.id === tempId
                  ? {
                      ...m,
                      [streamField]: sanitizedPartial,
                      isThinkingRequested,
                    }
                  : m,
              );
            }
            if (conversationPersistId && finalize) {
              queueConversationPersist(conversationPersistId, next, locale);
            }
            return next;
          });
        }
        return partial;
      }
      if (!isCurrentRequest()) return "";
      console.error("Stream error", e);
      const streamErr = assistantErrorFields(
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
            role: Role.Assistant,
            content: streamErr.content,
            errorTitle: streamErr.errorTitle,
            errorType: streamErr.errorType,
            isError: true,
          },
        ]);
      }
      return "";
    } finally {
      if (finalize && isCurrentRequest()) {
        setIsLoading(false);
        refreshExecutions();

        const wasAborted =
          !isCurrentRequest() || abortControllerRef.current?.signal.aborted;
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
    interruptCurrent = false,
  ) => {
    const inputQuery = manualQuery || query;
    const currentAttachments = (manualAttachments || attachments).map((a) =>
      normalizeLegacyAttachment(a),
    );
    if (
      (!inputQuery.trim() && currentAttachments.length === 0) ||
      (isLoading && !interruptCurrent)
    )
      return;

    abortControllerRef.current?.abort();
    const requestId = ++requestSequenceRef.current;
    const requestController = new AbortController();
    abortControllerRef.current = requestController;
    const isCurrentRequest = () => requestSequenceRef.current === requestId;
    const finishRequest = () => {
      if (isCurrentRequest()) setIsLoading(false);
    };

    const thinkingRequested =
      !!isThinking &&
      !shouldSkipThinkingForTurn({
        query: inputQuery,
        hasAttachments: currentAttachments.length > 0,
        hasSystemInstruction: Boolean(systemInstruction),
      });
    thinkingRequestedRef.current = thinkingRequested;
    requestStartedAtRef.current = Date.now();
    streamPersistTickRef.current = 0;
    setShowWelcome(false);
    const currentQuery = inputQuery.trim();

    let apiContent = buildMultimodalUserContent(
      currentQuery,
      currentAttachments,
    );

    const documentWorkActive =
      isDocumentWorkRequest(currentQuery, currentAttachments) ||
      messages.some(messageStartsDocumentWork);

    // Append task-specific context if provided
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

    setMessages((prev) => {
      const next = [...prev, userMessage];
      if (conversationPersistId) {
        queueConversationPersist(conversationPersistId, next, locale);
      }
      return next;
    });

    // Only clear local query state if we are depending on it.
    setQuery("");
    setAttachments([]);
    setIsLoading(true);

    let webSearchTrace: WebSearchTrace | undefined;
    if (webSearchEnabled && currentQuery.trim()) {
      webSearchTrace = buildRunningWebSearchTrace(currentQuery);
      try {
        const searchResult = await runWebSearchForTurn(currentQuery, {
          signal: requestController.signal,
          locale,
        });
        webSearchTrace = searchResult.trace;
        const contextBlock = searchResult.context;
        if (typeof apiContent === "string") {
          apiContent = `${contextBlock}\n\n---\n\n${apiContent}`;
        } else {
          apiContent = [
            { type: "text", text: `${contextBlock}\n\n---\n\n` },
            ...apiContent,
          ];
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Web search failed";
        webSearchTrace = {
          status: "error",
          queriedAt: new Date().toISOString(),
          errorMessage: message,
          steps: [
            {
              kind: "summary",
              label: "Web search failed",
              meta: message,
            },
          ],
        };
      }
    }

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

    const newAssistantMessageId = () =>
      `ai-${sessionId ?? "chat"}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const pushAssistantHttpError = (status: number, errorText: string) => {
      if (!isCurrentRequest()) return;
      const err = assistantErrorFields(
        locale,
        status,
        model,
        apiKeys,
        errorText,
      );
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: Role.Assistant,
          content: err.content,
          errorTitle: err.errorTitle,
          errorType: err.errorType,
          isError: true,
        },
      ]);
      finishRequest();
    };

    const runTwoStageThinking = async (
      tempId: string,
      isOllama: boolean,
      userQuery: string,
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

      const commitThinkingReconciled = (reconciled: {
        thinkingText: string;
        content: string;
      }) => {
        if (!isCurrentRequest()) return;
        let messagesToPersist: Message[] | null = null;
        setMessages((prev) => {
          const updatedMessages = prev.map((m) => {
            if (m.id !== tempId) return m;
            if (!reconciled.content.trim()) {
              const err = assistantErrorFields(
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

          if (conversationPersistId) {
            messagesToPersist = updatedMessages;
          }
          return updatedMessages;
        });
        if (messagesToPersist && conversationPersistId) {
          queueConversationPersist(
            conversationPersistId,
            messagesToPersist,
            locale,
          );
        }

        finishRequest();
        refreshExecutions();

        const wasAborted =
          !isCurrentRequest() || requestController.signal.aborted;
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

      const streamThinkingAttempt = async (
        priorForRepair?: string,
      ): Promise<string | null> => {
        const res = await requestStage("thinking", priorForRepair);
        if (!res.ok) {
          if (!isCurrentRequest()) return null;
          if (!priorForRepair) {
            const errorText = await res.text();
            pushAssistantHttpError(res.status, errorText);
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
          }
          return null;
        }
        const raw = await processStream(res, true, isOllama, {
          finalize: false,
          tempId,
          streamField: "thinkingText",
          requestId,
        });
        return cleanThinkingText(raw);
      };

      const attempts: string[] = [];
      const first = await streamThinkingAttempt();
      if (first === null) return;
      attempts.push(first);
      applyThinkingPreview(resolveThinkingPanelNotes(first, userQuery));

      let current = first;
      let repairs = 0;
      while (
        shouldRetryThinkingNotes(current) &&
        repairs < MAX_THINKING_NOTE_RETRIES
      ) {
        const repaired = await streamThinkingAttempt(current);
        if (repaired === null) break;
        attempts.push(repaired);
        current = repaired;
        repairs += 1;
      }

      const stage1 = finalizeStage1Attempts(attempts, { userQuery });
      applyThinkingPreview(
        stage1.notes || resolveThinkingPanelNotes(current, userQuery),
      );

      const stage2Prior = buildStage2PriorReasoning(
        stage1.notes,
        stage1.answerDraft,
      );
      const res2 = await requestStage("final", stage2Prior);
      if (!res2.ok) {
        if (!isCurrentRequest()) return;
        const fallback = reconcileTwoStageThinking(stage1.notes, "", {
          answerDraft: stage1.answerDraft,
        });
        if (fallback.content.trim()) {
          commitThinkingReconciled(fallback);
          return;
        }
        const errorText = await res2.text();
        pushAssistantHttpError(res2.status, errorText);
        finishRequest();
        return;
      }

      let stage2Raw = await processStream(res2, true, isOllama, {
        finalize: false,
        tempId,
        streamField: "content",
        allowEmptyContent: true,
        requestId,
      });

      // A model can obey the first stage but leak the protocol in stage 2.
      // Give it one clean rewrite opportunity before reconciliation; keeping
      // this bounded prevents retry loops and runaway provider cost.
      let answerRepairs = 0;
      while (
        shouldRetryThinkingAnswer(stage2Raw) &&
        answerRepairs < MAX_THINKING_ANSWER_RETRIES
      ) {
        const repairPrior = buildStage2PriorReasoning(stage1.notes, stage2Raw);
        const repairResponse = await requestStage("final", repairPrior);
        if (!repairResponse.ok) break;
        stage2Raw = await processStream(repairResponse, true, isOllama, {
          finalize: false,
          tempId,
          streamField: "content",
          allowEmptyContent: true,
          requestId,
        });
        answerRepairs += 1;
      }

      commitThinkingReconciled(
        reconcileTwoStageThinking(stage1.notes, stage2Raw, {
          answerDraft: stage1.answerDraft,
        }),
      );
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
            documentWork: documentWorkActive,
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
          const tempId = newAssistantMessageId();
          setMessages((prev) => {
            const next: Message[] = [
              ...prev,
              {
                id: tempId,
                role: Role.Assistant,
                content: "",
                isThinkingRequested: true,
                webSearchTrace,
              },
            ];
            if (conversationPersistId) {
              queueConversationPersist(conversationPersistId, next, locale);
            }
            return next;
          });

          await runTwoStageThinking(
            tempId,
            true,
            currentQuery,
            (stage, prior) =>
              postOllamaChat(
                ollamaUrl,
                buildOllamaPayload(stage, prior),
                requestController.signal,
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
              content: buildChatSystemPrompt({
                modelId: model,
                locale,
                documentWork: documentWorkActive,
              }),
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
          requestController.signal,
        );

        if (!res.ok) {
          if (!isCurrentRequest()) return;
          const errorText = await res.text();
          const err = assistantErrorFields(
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
              role: Role.Assistant,
              content: err.content,
              errorTitle: err.errorTitle,
              errorType: err.errorType,
              isError: true,
            },
          ]);
          finishRequest();
          return;
        }

        await processStream(res, false, true, {
          requestId,
          webSearchTrace,
        });
        return;
      }

      if (thinkingRequested) {
        const tempId = newAssistantMessageId();
        const apiHistory = [
          ...historyForModel,
          { role: "user", content: apiContent },
        ];

        setMessages((prev) => {
          const next: Message[] = [
            ...prev,
            {
              id: tempId,
              role: Role.Assistant,
              content: "",
              isThinkingRequested: true,
              webSearchTrace,
            },
          ];
          if (conversationPersistId) {
            queueConversationPersist(conversationPersistId, next, locale);
          }
          return next;
        });

        await runTwoStageThinking(tempId, false, currentQuery, (stage, prior) =>
          fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: apiHistory,
              model,
              conversationId: conversationPersistId ?? conversationId,
              thinkingStage: stage,
              priorReasoning: prior,
              documentWork: documentWorkActive,
              customKeys: sanitizeCustomKeysForRequest(apiKeys),
              locale,
            }),
            signal: requestController.signal,
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
          documentWork: documentWorkActive,
          customKeys: sanitizeCustomKeysForRequest(apiKeys),
          locale,
        }),
        signal: requestController.signal,
      });

      if (!res.ok) {
        if (!isCurrentRequest()) return;
        const errorText = await res.text();
        const err = assistantErrorFields(
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
            role: Role.Assistant,
            content: err.content,
            errorTitle: err.errorTitle,
            errorType: err.errorType,
            isError: true,
          },
        ]);
        finishRequest();
        return;
      }

      await processStream(res, false, false, { requestId, webSearchTrace });
    } catch (error: unknown) {
      if (!isCurrentRequest()) return;
      const isAbort = error instanceof Error && error.name === "AbortError";
      if (!isAbort) {
        const message = error instanceof Error ? error.message : String(error);
        const err = assistantErrorFields(
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
            role: Role.Assistant,
            content: err.content,
            errorTitle: err.errorTitle,
            errorType: err.errorType,
            isError: true,
          },
        ]);
      }
      finishRequest();
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
