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

// In-memory storage ONLY - no persistence
let memoryExecutions: Execution[] = [];

export const useExecution = () => {
  const [executions, setExecutions] = useState<Execution[]>(memoryExecutions);
  const [loading, setLoading] = useState<boolean>(false);

  const addExecution = useCallback(
    (execution: Execution) => {
      const newExecutions = [execution, ...executions];
      memoryExecutions = newExecutions;
      setExecutions(newExecutions);
    },
    [executions]
  );

  const removeExecution = useCallback(
    (id: string) => {
      const newExecutions = executions.filter((e) => e.id !== id);
      memoryExecutions = newExecutions;
      setExecutions(newExecutions);
    },
    [executions]
  );

  const updateExecution = useCallback(
    (id: string, updates: Partial<Execution>) => {
      const newExecutions = executions.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      );
      memoryExecutions = newExecutions;
      setExecutions(newExecutions);
    },
    [executions]
  );

  const refreshExecutions = useCallback(() => {
    setExecutions([...memoryExecutions]);
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
