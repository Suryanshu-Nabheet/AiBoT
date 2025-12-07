import { useEffect, useState, useCallback } from "react";

export interface Execution {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  type: ExecutionType;
}

enum ExecutionType {
  CONVERSATION = "CONVERSATION",
}

export const useExecution = () => {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadExecutions = useCallback(() => {
    try {
      // Use sessionStorage instead of localStorage - clears on browser refresh/close
      if (typeof window !== "undefined") {
        const stored = sessionStorage.getItem("chat-sessions");
        if (stored) {
          const parsed = JSON.parse(stored) as Execution[];
          setExecutions(parsed);
        } else {
          setExecutions([]);
        }
      }
    } catch (error) {
      console.error("Error loading chat sessions:", error);
      setExecutions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveExecutions = useCallback((newExecutions: Execution[]) => {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("chat-sessions", JSON.stringify(newExecutions));
        setExecutions(newExecutions);
      }
    } catch (error) {
      console.error("Error saving chat sessions:", error);
    }
  }, []);

  const addExecution = useCallback(
    (execution: Execution) => {
      const newExecutions = [execution, ...executions];
      saveExecutions(newExecutions);
    },
    [executions, saveExecutions]
  );

  const removeExecution = useCallback(
    (id: string) => {
      const newExecutions = executions.filter((e) => e.id !== id);
      saveExecutions(newExecutions);
    },
    [executions, saveExecutions]
  );

  const updateExecution = useCallback(
    (id: string, updates: Partial<Execution>) => {
      const newExecutions = executions.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      );
      saveExecutions(newExecutions);
    },
    [executions, saveExecutions]
  );

  useEffect(() => {
    loadExecutions();
  }, [loadExecutions]);

  const refreshExecutions = useCallback(() => {
    loadExecutions();
  }, [loadExecutions]);

  return {
    executions,
    loading,
    addExecution,
    removeExecution,
    updateExecution,
    refreshExecutions,
  };
};
