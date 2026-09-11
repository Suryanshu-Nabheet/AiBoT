"use client";

import type { RefObject, ReactNode } from "react";
import {
  CHAT_THREAD_SCROLL_CLASS,
  chatThreadContentWrapClass,
} from "@/lib/chat/thread-layout";
import { cn } from "@/lib/utils";

type ChatThreadViewportProps = {
  children: ReactNode;
  scrollRef?: RefObject<HTMLDivElement | null>;
  variant?: "thread" | "arena";
  className?: string;
  contentClassName?: string;
};

/** Scrollable message column shared by direct chat and arena panels. */
export function ChatThreadViewport({
  children,
  scrollRef,
  variant = "thread",
  className,
  contentClassName,
}: ChatThreadViewportProps) {
  return (
    <div ref={scrollRef} className={cn(CHAT_THREAD_SCROLL_CLASS, className)}>
      <div
        className={cn(chatThreadContentWrapClass(variant), contentClassName)}
      >
        {children}
      </div>
    </div>
  );
}
