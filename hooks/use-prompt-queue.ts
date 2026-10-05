"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatAttachment } from "@/lib/chat/attachments";

export type QueuedPrompt = {
  id: string;
  prompt: string;
  attachments: ChatAttachment[];
};

export function usePromptQueue(
  isBusy: boolean,
  runPrompt: (item: QueuedPrompt) => void | Promise<void>,
) {
  const [queue, setQueue] = useState<QueuedPrompt[]>([]);
  const runningRef = useRef(false);

  const enqueue = useCallback(
    (prompt: string, attachments: ChatAttachment[] = []) => {
      const trimmed = prompt.trim();
      if (!trimmed && attachments.length === 0) return;
      setQueue((current) => [
        ...current,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          prompt: trimmed,
          attachments: attachments.map((attachment) => ({ ...attachment })),
        },
      ]);
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setQueue((current) => current.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    if (isBusy || runningRef.current || queue.length === 0) return;
    const [next, ...rest] = queue;
    runningRef.current = true;
    setQueue(rest);
    void Promise.resolve(runPrompt(next)).finally(() => {
      runningRef.current = false;
    });
  }, [isBusy, queue, runPrompt]);

  return { queue, enqueue, remove };
}
