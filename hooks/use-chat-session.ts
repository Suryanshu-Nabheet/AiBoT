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
import { listConversations } from "@/lib/chat/conversation-store";
import { buildSharedChatContext } from "@/lib/chat/shared-chat-context";
import { isSharedChatMemoryEnabled } from "@/lib/chat/shared-chat-memory";
import {
  getConversationInitialState,
  loadConversationMessages,
  resolveConversationPersistId,
} from "@/lib/chat/load-conversation-messages";
import { runWebSearchForTurn } from "@/lib/web-search/client";
import { evaluateWebSearchIntent } from "@/lib/web-search/intent";
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
import { toast } from "sonner";
import {
  applyExplicitUserGuidanceCommand,
  buildUserGuidanceContext,
  type UserGuidanceCommandResult,
} from "@/lib/chat/user-guidance";

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
  onWebSearchChange?: (enabled: boolean) => void;
}

export function useChatSession({
  conversationId: initialConversationId,
  storageKey = "preferredModel",
  sessionId,
  executionType,
  viewMode,
  webSearchEnabled = false,
  onWebSearchChange,
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
  const persistedMessagesRef = useRef(messages);
  const streamPersistTickRef = useRef(0);
  const webSearchDecisionResolverRef = useRef<
    ((approved: boolean) => void) | null
  >(null);

  const confirmWebSearchPrompt = useCallback((approved: boolean) => {
    if (webSearchDecisionResolverRef.current) {
      webSearchDecisionResolverRef.current(approved);
      webSearchDecisionResolverRef.current = null;
    }
  }, []);

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
    if (persistedMessagesRef.current === messages) return;
    persistedMessagesRef.current = messages;
    if (conversationPersistId && messages.length > 0) {
      queueConversationPersist(conversationPersistId, messages, locale);
    }
  }, [conversationPersistId, locale, messages]);

  useEffect(() => {
    return () => {
      if (webSearchDecisionResolverRef.current) {
        webSearchDecisionResolverRef.current(false);
        webSearchDecisionResolverRef.current = null;
      }
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
      userQuery?: string;
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
    } else {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                ...m,
                isThinkingRequested,
                ...(options?.webSearchTrace
                  ? { webSearchTrace: options.webSearchTrace }
                  : {}),
                webSearchPrompt: undefined,
              }
            : m,
        ),
      );
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
      let live = sanitizeAssistantStreamField(streamField, accumulated, false, {
        thinkingMode: isThinkingRequested,
      });
      if (streamField === "thinkingText") {
        live = thinkingPanelPreview(live, options?.userQuery);
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
        ? sanitizeAssistantStreamField(streamField, accumulated, true, {
            thinkingMode: isThinkingRequested,
          })
        : "";
      const hasText = sanitized.trim().length > 0;

      const finalizeMessage = (message: Message): Message => {
        if (message.id !== tempId) return message;
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
            ...message,
            content: err.content,
            errorTitle: err.errorTitle,
            errorType: err.errorType,
            isThinkingRequested,
            isError: true,
          };
        }
        return {
          ...message,
          [streamField]: hasText
            ? sanitized
            : streamField === "thinkingText"
              ? (message.thinkingText ?? "")
              : message.content,
          isThinkingRequested,
        };
      };

      setMessages((prev) =>
        isCurrentRequest() ? prev.map(finalizeMessage) : prev,
      );
      return sanitized;
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        const partial = accumulated;
        const sanitizedPartial = partial.trim()
          ? sanitizeAssistantStreamField(streamField, partial, true, {
              thinkingMode: isThinkingRequested,
            })
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
    sendOptions?: {
      forceWebSearch?: boolean;
      isRetry?: boolean;
    },
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

    const thinkingRequested = !!isThinking;
    thinkingRequestedRef.current = thinkingRequested;
    requestStartedAtRef.current = Date.now();
    streamPersistTickRef.current = 0;
    setShowWelcome(false);
    const currentQuery = inputQuery.trim();
    let userMessageId: string | null = null;
    let guidanceUpdate: UserGuidanceCommandResult = null;
    if (!sendOptions?.isRetry) {
      try {
        guidanceUpdate = applyExplicitUserGuidanceCommand(currentQuery);
      } catch {
        toast.error(translate(locale, "general.guidance.commandFailed"));
      }
    }
    const userGuidanceContext = buildUserGuidanceContext(
      undefined,
      guidanceUpdate,
      currentQuery,
    );
    if (
      guidanceUpdate &&
      ["added", "updated", "removed"].includes(guidanceUpdate.action)
    ) {
      const toastKey =
        guidanceUpdate.action === "added"
          ? "general.guidance.commandAdded"
          : guidanceUpdate.action === "updated"
            ? "general.guidance.commandUpdated"
            : "general.guidance.commandRemoved";
      toast.success(
        translate(locale, toastKey, {
          kind: guidanceUpdate.kind,
          count: "count" in guidanceUpdate ? guidanceUpdate.count : 1,
        }),
      );
    }

    let apiContent = buildMultimodalUserContent(
      currentQuery,
      currentAttachments,
    );
    const sharedChatContext = isSharedChatMemoryEnabled()
      ? buildSharedChatContext(currentQuery, listConversations(), [
          conversationId ?? "",
          conversationPersistId ?? "",
        ])
      : null;
    const sharedHistory = (sharedChatContext?.userMessages ?? []).map(
      (content) => ({ role: Role.User, content }),
    );
    const searchConversationHistory = [...sharedHistory, ...messages];
    const searchRecentUserMessages = [
      ...(sharedChatContext?.userMessages ?? []),
      ...messages
        .filter((message) => message.role === Role.User)
        .map((message) => message.content)
        .slice(-6),
    ].slice(-10);

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

    if (sharedChatContext) {
      if (typeof apiContent === "string") {
        apiContent = `${apiContent}\n\n${sharedChatContext.text}`;
      } else {
        apiContent = [
          { type: "text", text: sharedChatContext.text },
          ...apiContent,
        ];
      }
    }

    if (userGuidanceContext) {
      if (typeof apiContent === "string") {
        apiContent = `${apiContent}\n\n${userGuidanceContext}`;
      } else {
        apiContent = [
          { type: "text", text: userGuidanceContext },
          ...apiContent,
        ];
      }
    }

    if (!sendOptions?.isRetry) {
      const userMessage: Message = {
        id: `user-${sessionId ?? "chat"}-${Date.now()}`,
        role: Role.User,
        content: currentQuery || "(attachment)",
        attachments: [...currentAttachments],
      };
      userMessageId = userMessage.id ?? null;

      setMessages((prev) => {
        const next = [...prev, userMessage];
        if (conversationPersistId) {
          queueConversationPersist(conversationPersistId, next, locale);
        }
        return next;
      });
    }

    // Only clear local query state if we are depending on it.
    setQuery("");
    setAttachments([]);
    setIsLoading(true);

    const newAssistantMessageId = () =>
      `ai-${sessionId ?? "chat"}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    let webSearchTrace: WebSearchTrace | undefined;
    const recentUserMessages = searchRecentUserMessages;

    let activeWebSearch = Boolean(
      sendOptions?.forceWebSearch || (sendOptions?.isRetry && webSearchEnabled),
    );
    let promptApproved = false;
    let pendingAssistantId: string | null = null;

    if (!activeWebSearch && Boolean(currentQuery) && !sendOptions?.isRetry) {
      const searchIntent = evaluateWebSearchIntent(currentQuery, {
        recentUserMessages,
        conversationHistory: searchConversationHistory,
      });

      if (searchIntent.shouldSearch && webSearchEnabled) {
        activeWebSearch = true;
      } else if (searchIntent.shouldSearch) {
        const promptId = newAssistantMessageId();
        pendingAssistantId = promptId;
        const searchTopic = searchIntent.queries[0] ?? currentQuery;

        setMessages((prev) => [
          ...prev,
          {
            id: promptId,
            role: Role.Assistant,
            content: "",
            webSearchPrompt: {
              active: true,
              query: searchTopic,
            },
          },
        ]);

        const decisionPromise = new Promise<boolean>((resolve) => {
          let timer: NodeJS.Timeout | null = null;
          const handleResolve = (approved: boolean) => {
            if (timer) clearTimeout(timer);
            resolve(approved);
          };
          webSearchDecisionResolverRef.current = handleResolve;
          timer = setTimeout(() => {
            if (webSearchDecisionResolverRef.current === handleResolve) {
              webSearchDecisionResolverRef.current = null;
              resolve(false);
            }
          }, 5000);
        });

        promptApproved = await decisionPromise;
        webSearchDecisionResolverRef.current = null;

        if (promptApproved) {
          activeWebSearch = true;
          onWebSearchChange?.(true);
        }

        if (!isCurrentRequest()) return;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === promptId ? { ...m, webSearchPrompt: undefined } : m,
          ),
        );
      }
    }

    if (activeWebSearch && Boolean(currentQuery)) {
      try {
        const forceWebSearch = Boolean(
          sendOptions?.forceWebSearch || promptApproved,
        );
        const intent = evaluateWebSearchIntent(currentQuery, {
          recentUserMessages,
          conversationHistory: searchConversationHistory,
          force: forceWebSearch,
        });

        if (intent.shouldSearch) {
          const displayQuery = intent.queries[0] ?? currentQuery;
          webSearchTrace = buildRunningWebSearchTrace(displayQuery);

          if (pendingAssistantId) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === pendingAssistantId ? { ...m, webSearchTrace } : m,
              ),
            );
          }

          const searchResult = await runWebSearchForTurn(currentQuery, {
            signal: requestController.signal,
            locale,
            recentUserMessages,
            conversationHistory: searchConversationHistory,
            queriesOverride:
              intent.queries.length > 0 ? intent.queries : undefined,
            force: forceWebSearch,
          });

          if (!searchResult.skipped) {
            webSearchTrace = searchResult.trace;
            const contextBlock = searchResult.context;
            if (contextBlock) {
              if (typeof apiContent === "string") {
                apiContent = `${apiContent}\n\n${contextBlock}`;
              } else {
                apiContent = [
                  ...apiContent,
                  { type: "text", text: contextBlock },
                ];
              }

              // Retain the exact bounded evidence block so follow-up turns can
              // still answer questions about these sources after reload.
              if (userMessageId) {
                setMessages((prev) => {
                  const next = prev.map((message) =>
                    message.id === userMessageId
                      ? { ...message, webSearchContext: contextBlock }
                      : message,
                  );
                  if (conversationPersistId) {
                    queueConversationPersist(
                      conversationPersistId,
                      next,
                      locale,
                    );
                  }
                  return next;
                });
              }
            }
          } else {
            webSearchTrace = undefined;
          }

          if (pendingAssistantId) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === pendingAssistantId ? { ...m, webSearchTrace } : m,
              ),
            );
          }
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
        if (pendingAssistantId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === pendingAssistantId ? { ...m, webSearchTrace } : m,
            ),
          );
        }
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

    const pushAssistantHttpError = (status: number, errorText: string) => {
      if (!isCurrentRequest()) return;
      const err = assistantErrorFields(
        locale,
        status,
        model,
        apiKeys,
        errorText,
      );
      setMessages((prev) => {
        const filtered = pendingAssistantId
          ? prev.filter((m) => m.id !== pendingAssistantId)
          : prev;
        return [
          ...filtered,
          {
            id: `error-${Date.now()}`,
            role: Role.Assistant,
            content: err.content,
            errorTitle: err.errorTitle,
            errorType: err.errorType,
            isError: true,
          },
        ];
      });
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
        const safeThinkingText = resolveThinkingPanelNotes(
          reconciled.thinkingText,
          userQuery,
        );
        const reconcileMessage = (message: Message): Message => {
          if (message.id !== tempId) return message;
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
              ...message,
              thinkingText: safeThinkingText,
              content: err.content,
              errorTitle: err.errorTitle,
              errorType: err.errorType,
              isThinkingRequested: true,
              isError: true,
            };
          }
          return {
            ...message,
            thinkingText: safeThinkingText,
            content: reconciled.content,
            isThinkingRequested: true,
            isError: false,
          };
        };
        setMessages((prev) => prev.map(reconcileMessage));
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
          userQuery,
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
        resolveThinkingPanelNotes(stage1.notes || current, userQuery),
      );

      const stage2Prior = buildStage2PriorReasoning(
        stage1.notes,
        stage1.answerDraft,
        isOllama ? 4_000 : 10_000,
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
        const repairPrior = buildStage2PriorReasoning(
          stage1.notes,
          stage2Raw,
          isOllama ? 4_000 : 10_000,
        );
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
      const historyForModel = mapMessagesForModelHistory(messages, {
        query: currentQuery,
        maxTextChars: isOllama ? 8_000 : 20_000,
      });

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
            options: {
              num_ctx: 8192,
            },
          };
        };

        if (thinkingRequested) {
          const tempId = pendingAssistantId ?? newAssistantMessageId();
          setMessages((prev) => {
            if (
              pendingAssistantId &&
              prev.some((m) => m.id === pendingAssistantId)
            ) {
              return prev.map((m) =>
                m.id === tempId
                  ? {
                      ...m,
                      isThinkingRequested: true,
                      webSearchTrace,
                      webSearchPrompt: undefined,
                    }
                  : m,
              );
            }
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
          options: {
            num_ctx: 8192,
          },
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
          tempId: pendingAssistantId ?? undefined,
          webSearchTrace,
        });
        return;
      }

      if (thinkingRequested) {
        const tempId = pendingAssistantId ?? newAssistantMessageId();
        const apiHistory = [
          ...historyForModel,
          { role: "user", content: apiContent },
        ];

        setMessages((prev) => {
          if (
            pendingAssistantId &&
            prev.some((m) => m.id === pendingAssistantId)
          ) {
            return prev.map((m) =>
              m.id === tempId
                ? {
                    ...m,
                    isThinkingRequested: true,
                    webSearchTrace,
                    webSearchPrompt: undefined,
                  }
                : m,
            );
          }
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

      await processStream(res, false, false, {
        requestId,
        tempId: pendingAssistantId ?? undefined,
        webSearchTrace,
      });
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
        setMessages((prev) => {
          const filtered = pendingAssistantId
            ? prev.filter((m) => m.id !== pendingAssistantId)
            : prev;
          return [
            ...filtered,
            {
              id: `error-fetch-${Date.now()}`,
              role: Role.Assistant,
              content: err.content,
              errorTitle: err.errorTitle,
              errorType: err.errorType,
              isError: true,
            },
          ];
        });
      } else if (pendingAssistantId) {
        setMessages((prev) => prev.filter((m) => m.id !== pendingAssistantId));
      }
      finishRequest();
    }
  };

  const stopHelpers = {
    stop: () => {
      if (webSearchDecisionResolverRef.current) {
        webSearchDecisionResolverRef.current(false);
        webSearchDecisionResolverRef.current = null;
      }
      abortControllerRef.current?.abort();
    },
  };

  const handleSendRef = useRef(handleSend);
  useEffect(() => {
    handleSendRef.current = handleSend;
  });

  const retryWithWebSearch = useCallback(
    async (assistantMessageId: string, fallbackQuery?: string) => {
      let targetUserQuery = fallbackQuery?.trim() ?? "";
      let targetAttachments: ChatAttachment[] = [];

      setMessages((prev) => {
        const assistantIndex = prev.findIndex(
          (m) => m.id === assistantMessageId,
        );
        if (assistantIndex > 0) {
          const prevMsg = prev[assistantIndex - 1];
          if (prevMsg && prevMsg.role === Role.User) {
            targetUserQuery = prevMsg.content;
            targetAttachments = (prevMsg.attachments ?? []).map((a) =>
              normalizeLegacyAttachment(a),
            );
          }
        }
        return prev.filter((m) => m.id !== assistantMessageId);
      });

      if (!targetUserQuery) {
        targetUserQuery = fallbackQuery?.trim() ?? "";
      }
      if (!targetUserQuery) return;

      await handleSendRef.current(
        targetUserQuery,
        targetAttachments,
        undefined,
        thinkingRequestedRef.current,
        true,
        { forceWebSearch: true, isRetry: true },
      );
    },
    [],
  );

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
    retryWithWebSearch,
    confirmWebSearchPrompt,
    stopHelpers,
    conversationId,
  };
}
