/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { useState, useCallback, useLayoutEffect } from "react";
import { readConversation } from "@/lib/chat/conversation-store";

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

// Initial load from sessionStorage if available (client-side only)
const getInitialExecutions = (): Execution[] => {
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem("chat-sessions");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to parse chat sessions", e);
    }
  }
  return [];
};

export const useExecution = () => {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useLayoutEffect(() => {
    const stored = getInitialExecutions();
    const withHistory = stored.filter((execution) => {
      const direct = readConversation(execution.id);
      if (direct?.messages?.length) return true;
      if (execution.type === ExecutionType.ARENA) {
        return Boolean(
          readConversation(`${execution.id}::arena-a`)?.messages?.length ||
          readConversation(`${execution.id}::arena-b`)?.messages?.length,
        );
      }
      return false;
    });
    setExecutions(withHistory);
    if (withHistory.length !== stored.length) {
      saveToStorage(withHistory);
    }
    setHydrated(true);
  }, []);

  const loading = !hydrated;

  const saveToStorage = (newExecutions: Execution[]) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("chat-sessions", JSON.stringify(newExecutions));
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
    setExecutions((prev) => {
      const newExecutions = prev.filter((e) => e.id !== id);
      saveToStorage(newExecutions);
      return newExecutions;
    });
  }, []);

  const updateExecution = useCallback(
    (id: string, updates: Partial<Execution>) => {
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
