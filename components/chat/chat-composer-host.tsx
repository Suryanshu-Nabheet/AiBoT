"use client";

import { ChatInput } from "./chat-input";
import type { QueuedPrompt } from "@/hooks/use-prompt-queue";
import type { ChatAttachment } from "@/lib/chat/attachments";
import type { ComposerLayoutContext } from "@/lib/chat/composer-mode";

export type ChatComposerHostProps = {
  query: string;
  setQuery: (query: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  onStop?: () => void;
  onSendWhileLoading?: (
    prompt: string,
    attachments: ChatAttachment[],
  ) => void;
  attachments: ChatAttachment[];
  setAttachments: React.Dispatch<React.SetStateAction<ChatAttachment[]>>;
  isListening?: boolean;
  onSpeechToggle?: () => void;
  isThinking?: boolean;
  onThinkingChange?: (enabled: boolean) => void;
  webSearchEnabled?: boolean;
  onWebSearchChange?: (enabled: boolean) => void;
  model?: string;
  onModelChange?: (model: string) => void;
  modelStorageKey?: string;
  showModelSelector?: boolean;
  placeholder?: string;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  /** Thread mode: docked compact composer with optional queue */
  variant: "hero" | "thread";
  layoutContext?: ComposerLayoutContext;
  onQueue?: (prompt: string, attachments: ChatAttachment[]) => void;
  queuedPrompts?: QueuedPrompt[];
  onRemoveQueuedPrompt?: (id: string) => void;
  onSendQueuedPromptNow?: (item: QueuedPrompt) => void;
  className?: string;
};

/**
 * Single integration surface for chat + arena: hero (empty) vs thread (compact) layout.
 */
export function ChatComposerHost({
  variant,
  layoutContext = "chat",
  className,
  onQueue,
  queuedPrompts,
  onRemoveQueuedPrompt,
  onSendQueuedPromptNow,
  ...props
}: ChatComposerHostProps) {
  const isThread = variant === "thread";

  return (
    <ChatInput
      {...props}
      layoutContext={layoutContext}
      dock={isThread ? "bottom" : "center"}
      compact={isThread}
      className={className}
      onQueue={onQueue}
      queuedPrompts={queuedPrompts}
      onRemoveQueuedPrompt={onRemoveQueuedPrompt}
      onSendQueuedPromptNow={onSendQueuedPromptNow}
    />
  );
}
