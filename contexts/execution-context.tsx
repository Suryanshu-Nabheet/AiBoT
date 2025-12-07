"use client";

import React, { createContext, useContext } from "react";
import { useExecution, type Execution } from "@/hooks/useExecution";

interface ExecutionContextType {
  executions: Execution[];
  loading: boolean;
  addExecution: (execution: Execution) => void;
  removeExecution: (id: string) => void;
  updateExecution: (id: string, updates: Partial<Execution>) => void;
  refreshExecutions: () => void;
}

const ExecutionContext = createContext<ExecutionContextType | undefined>(
  undefined
);

export const ExecutionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const executionData = useExecution();

  return (
    <ExecutionContext.Provider value={executionData}>
      {children}
    </ExecutionContext.Provider>
  );
};

export const useExecutionContext = () => {
  const context = useContext(ExecutionContext);
  if (!context) {
    throw new Error(
      "useExecutionContext must be used within ExecutionProvider"
    );
  }
  return context;
};
