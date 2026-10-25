/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { useState, useCallback, useLayoutEffect } from "react";
import {
  deleteConversation,
  listConversations,
  readConversation,
  saveConversation,
} from "@/lib/chat/conversation-store";

export interface Execution {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  type: ExecutionType;
  mode?: "direct" | "side-by-side";
}

export enum ExecutionType {
  CONVERSATION = "CONVERSATION",
  ARENA = "ARENA",
}

// Rebuild the sidebar index from durable conversation snapshots when available.
const getInitialExecutions = (): Execution[] => {
  const saved: Execution[] = [];
  if (typeof window !== "undefined") {
    try {
      let stored: string | null = null;
      try {
        stored = window.localStorage.getItem("chat-sessions");
      } catch {
        // Fall back to the session-only index below.
      }
      if (!stored) {
        try {
          stored = window.sessionStorage.getItem("chat-sessions");
        } catch {
          // Conversation snapshots can still rebuild the sidebar index.
        }
      }
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed)) {
        saved.push(
          ...parsed.filter(
            (item): item is Execution =>
              Boolean(item) &&
              typeof item.id === "string" &&
              typeof item.title === "string" &&
              typeof item.updatedAt === "string" &&
              (item.type === ExecutionType.CONVERSATION ||
                item.type === ExecutionType.ARENA),
          ),
        );
      }
    } catch (e) {
      console.error("Failed to parse chat sessions", e);
    }
  }

  const indexed = new Map(saved.map((execution) => [execution.id, execution]));
  for (const conversation of listConversations()) {
    const arenaMatch = conversation.id.match(/^(.*)::arena-(?:a|b)$/);
    const id = arenaMatch?.[1] || conversation.id;
    const stored = indexed.get(id);
    const type = arenaMatch ? ExecutionType.ARENA : ExecutionType.CONVERSATION;
    const current = indexed.get(id);
    indexed.set(id, {
      id,
      title: stored?.title || conversation.title,
      createdAt: stored?.createdAt || conversation.createdAt,
      updatedAt:
        !current ||
        Date.parse(conversation.updatedAt) > Date.parse(current.updatedAt)
          ? conversation.updatedAt
          : current.updatedAt,
      type: stored?.type ?? type,
      mode: stored?.mode,
    });
  }

  return Array.from(indexed.values())
    .filter((execution) => {
      if (execution.type === ExecutionType.ARENA) {
        return Boolean(
          readConversation(`${execution.id}::arena-a`)?.messages?.length ||
          readConversation(`${execution.id}::arena-b`)?.messages?.length ||
          readConversation(execution.id)?.messages?.length,
        );
      }
      return Boolean(readConversation(execution.id)?.messages?.length);
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

export const useExecution = () => {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useLayoutEffect(() => {
    const withHistory = getInitialExecutions();
    setExecutions(withHistory);
    saveToStorage(withHistory);
    setHydrated(true);
  }, []);

  const loading = !hydrated;

  const saveToStorage = (newExecutions: Execution[]) => {
    if (typeof window !== "undefined") {
      const serialized = JSON.stringify(newExecutions);
      try {
        window.localStorage.setItem("chat-sessions", serialized);
      } catch {
        // Keep the sidebar usable for the current session if durable storage
        // is unavailable; full conversations are persisted independently.
      }
      try {
        window.sessionStorage.setItem("chat-sessions", serialized);
      } catch {
        // The persistent index remains authoritative when session storage fails.
      }
    }
  };

  const addExecution = useCallback((execution: Execution) => {
    setExecutions((prev) => {
      // Avoid duplicates
      if (prev.some((e) => e.id === execution.id)) return prev;
      const newExecutions = [execution, ...prev];
      saveToStorage(newExecutions);
      return newExecutions;
    });
  }, []);

  const removeExecution = useCallback((id: string) => {
    deleteConversation(id);
    setExecutions((prev) => {
      const newExecutions = prev.filter((e) => e.id !== id);
      saveToStorage(newExecutions);
      return newExecutions;
    });
  }, []);

  const updateExecution = useCallback(
    (id: string, updates: Partial<Execution>) => {
      const savedConversation = readConversation(id);
      if (savedConversation && updates.title) {
        saveConversation({ ...savedConversation, title: updates.title });
      }
      setExecutions((prev) => {
        const newExecutions = prev.map((e) =>
          e.id === id ? { ...e, ...updates } : e,
        );
        saveToStorage(newExecutions);
        return newExecutions;
      });
    },
    [],
  );

  const refreshExecutions = useCallback(() => {
    setExecutions(getInitialExecutions());
  }, []);

  return {
    executions,
    loading,
    addExecution,
    removeExecution,
    updateExecution,
    refreshExecutions,
  };
};
