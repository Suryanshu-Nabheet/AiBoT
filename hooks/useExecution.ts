import { useEffect, useState } from "react";

export interface Execution {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    type: ExecutionType;
}
  
enum ExecutionType {
    CONVERSATION = "CONVERSATION"
}
  
export function useExecution() {
    const [executions, setExecutions] = useState<Execution[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createNewExecution = () => {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const newExecution: Execution = {
            id,
            title: "New Chat",
            createdAt: now,
            updatedAt: now,
            type: ExecutionType.CONVERSATION
        };
        
        const updated = [newExecution, ...executions];
        setExecutions(updated);
        localStorage.setItem("executions", JSON.stringify(updated));
        return id;
    }

    const fetchExecutions = () => {
        const stored = localStorage.getItem("executions");
        if (stored) {
            try {
                setExecutions(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse executions", e);
            }
        }
    }

    const refreshExecutions = fetchExecutions;

    useEffect(() => {
        fetchExecutions();
    }, []);

    return { executions, loading, error, refreshExecutions, createNewExecution };
}