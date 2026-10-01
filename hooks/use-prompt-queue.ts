"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type QueuedPrompt = { id: string; prompt: string };

export function usePromptQueue(
  isBusy: boolean,
  runPrompt: (prompt: string) => void | Promise<void>,
) {
  const [queue, setQueue] = useState<QueuedPrompt[]>([]);
  const runningRef = useRef(false);

  const enqueue = useCallback((prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setQueue((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        prompt: trimmed,
      },
    ]);
  }, []);

  const remove = useCallback((id: string) => {
    setQueue((current) => current.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    if (isBusy || runningRef.current || queue.length === 0) return;
    const [next, ...rest] = queue;
    runningRef.current = true;
    setQueue(rest);
    void Promise.resolve(runPrompt(next.prompt)).finally(() => {
      runningRef.current = false;
    });
  }, [isBusy, queue, runPrompt]);

  return { queue, enqueue, remove };
}
