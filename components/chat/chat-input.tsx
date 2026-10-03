/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

/* Attachment previews use data URLs, which next/image cannot optimize. */
/* eslint-disable @next/next/no-img-element */

"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  PaperclipIcon,
  PlusIcon,
  CircleNotchIcon,
  X as XIcon,
} from "@phosphor-icons/react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/use-translation";
import { useComposerTextarea } from "@/hooks/use-composer-textarea";
import { ATTACH_ACCEPT, type ChatAttachment } from "@/lib/chat/attachments";
import { processFilesForChat } from "@/lib/chat/process-files";
import {
  composerDockShellClassName,
  composerFormClassName,
  composerSurfaceClassName,
  resolveComposerDensity,
  type ComposerLayoutContext,
} from "@/lib/chat/composer-mode";
import { PromptQueue } from "./prompt-queue";
import { ComposerModelSlot } from "./composer-model-slot";
import { ComposerPrimaryAction } from "./composer-primary-action";
import type { QueuedPrompt } from "@/hooks/use-prompt-queue";

interface ChatInputProps {
  query: string;
  setQuery: (query: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  onStop?: () => void;
  onQueue?: (prompt: string) => void;
  onSendWhileLoading?: (prompt: string) => void;
  queuedPrompts?: QueuedPrompt[];
  onRemoveQueuedPrompt?: (id: string) => void;
  onSendQueuedPromptNow?: (item: QueuedPrompt) => void;
  attachments: ChatAttachment[];
  setAttachments: React.Dispatch<React.SetStateAction<ChatAttachment[]>>;
  isListening?: boolean;
  onSpeechToggle?: () => void;
  isThinking?: boolean;
  onThinkingChange?: (enabled: boolean) => void;
  model?: string;
  onModelChange?: (model: string) => void;
  modelStorageKey?: string;
  showModelSelector?: boolean;
  placeholder?: string;
  className?: string;
  /** Centered on empty home vs docked to bottom during a thread */
  dock?: "bottom" | "center";
  /** Use the single-row follow-up composer in an active home chat. */
  compact?: boolean;
  /** Optional ref for global typing / focus helpers */
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  /** Arena uses a full-width dock with tighter vertical padding */
  layoutContext?: ComposerLayoutContext;
}

export function ChatInput({
  query,
  setQuery,
  onSubmit,
  isLoading,
  onStop,
  onQueue,
  onSendWhileLoading,
  queuedPrompts = [],
  onRemoveQueuedPrompt,
  onSendQueuedPromptNow,
  attachments,
  setAttachments,
  isListening = false,
  onSpeechToggle,
  isThinking = false,
  onThinkingChange,
  model,
  onModelChange,
  modelStorageKey,
  showModelSelector = false,
  placeholder,
  className,
  dock = "bottom",
  compact = false,
  textareaRef: textareaRefProp,
  layoutContext = "chat",
}: ChatInputProps) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t("composer.placeholder");
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = textareaRefProp ?? internalTextareaRef;
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [voiceModifierHeld, setVoiceModifierHeld] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);

  const density = resolveComposerDensity(dock, compact);
  const isThread = density === "thread";
  const hasQueuedInThread = isThread && queuedPrompts.length > 0;

  const showComposerModel = Boolean(
    showModelSelector && model && onModelChange,
  );
  const hasDraft = Boolean(query.trim()) || attachments.length > 0;
  const useVoiceAction =
    !isProcessingFiles &&
    (isListening ||
      voiceModifierHeld ||
      (!isLoading && !query.trim() && !attachments.length));

  useComposerTextarea(
    textareaRef,
    query,
    true,
    isThread ? "compact" : "default",
  );

  useEffect(() => {
    const handleModifier = (event: KeyboardEvent) => {
      setVoiceModifierHeld(event.metaKey || event.ctrlKey);
    };
    const clearModifier = () => setVoiceModifierHeld(false);

    window.addEventListener("keydown", handleModifier);
    window.addEventListener("keyup", handleModifier);
    window.addEventListener("blur", clearModifier);
    return () => {
      window.removeEventListener("keydown", handleModifier);
      window.removeEventListener("keyup", handleModifier);
      window.removeEventListener("blur", clearModifier);
    };
  }, []);

  const handleFormSubmit = (event: React.FormEvent) => {
    if (isLoading) {
      event.preventDefault();
      if (query.trim()) {
        onQueue?.(query);
        if (onQueue) setQuery("");
      }
      return;
    }
    if (isProcessingFiles) {
      event.preventDefault();
      return;
    }
    onSubmit(event);
  };

  const requestFormSubmit = () => {
    formRef.current?.requestSubmit();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;

    const files = Array.from(list);
    setIsProcessingFiles(true);
    try {
      const { attachments: next, errors } = await processFilesForChat(
        files,
        attachments,
      );

      if (next.length > 0) {
        setAttachments((prev) => [...prev, ...next]);
        const docs = next.filter(
          (a) => a.kind === "document" || a.kind === "text",
        );
        const frames = next.filter((a) => a.kind === "video_frame");
        if (docs.length > 0) {
          toast.success(
            t("toast.file.extracted", {
              name: docs.map((d) => d.name).join(", "),
            }),
          );
        } else if (frames.length > 0) {
          toast.success(
            t("toast.file.videoFrames", {
              count: frames.length,
              name: files[0]?.name ?? "video",
            }),
          );
        } else {
          toast.success(t("toast.file.attached", { count: next.length }));
        }
      }

      for (const err of errors) {
        toast.error(err);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not process selected files",
      );
    } finally {
      setIsProcessingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div
      className={cn(
        "z-10 w-full max-w-full shrink-0",
        composerDockShellClassName(dock, layoutContext),
        className,
      )}
    >
      <div
        data-testid="composer-surface"
        className={composerSurfaceClassName(
          density,
          hasQueuedInThread,
          layoutContext,
        )}
      >
        {hasQueuedInThread && (
          <div className="border-b border-border/50">
            <PromptQueue
              items={queuedPrompts}
              onRemove={onRemoveQueuedPrompt ?? (() => {})}
              onSendNow={onSendQueuedPromptNow}
            />
          </div>
        )}
        <motion.form
          ref={formRef}
          data-testid="chat-composer-form"
          initial={dock === "center" ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          onSubmit={handleFormSubmit}
          className={composerFormClassName(
            density,
            hasQueuedInThread,
            attachments.length > 0,
          )}
        >
          {isProcessingFiles && (
            <div
              className="flex items-center gap-2 px-4 pt-3 text-xs text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <CircleNotchIcon className="size-3.5 animate-spin" />
              {t("composer.files.processing")}
            </div>
          )}

          {attachments.length > 0 && (
            <div className="flex gap-2 overflow-x-auto px-4 pt-3 scrollbar-none">
              {attachments.map((att, i) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={`${att.name}-${i}`}
                  className="relative group flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-background/50"
                >
                  {att.type.startsWith("image/") ||
                  att.kind === "image" ||
                  att.kind === "video_frame" ? (
                    <img
                      src={att.content}
                      alt={att.name}
                      className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-1 text-center">
                      <PaperclipIcon className="size-5 text-muted-foreground" />
                      <span className="mt-1 w-full truncate px-1 text-[8px] leading-tight text-muted-foreground">
                        {att.name}
                      </span>
                    </div>
                  )}
                  <IconTooltip
                    label={t("composer.removeAttachment", { name: att.name })}
                  >
                    <button
                      type="button"
                      aria-label={t("composer.removeAttachment", {
                        name: att.name,
                      })}
                      onClick={() => removeAttachment(i)}
                      className="absolute top-0.5 right-0.5 rounded-full bg-black/50 p-0.5 text-white opacity-0 backdrop-blur-sm transition-all hover:bg-red-500 group-hover:opacity-100"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </IconTooltip>
                </motion.div>
              ))}
            </div>
          )}

          <div
            className={cn(
              "flex min-w-0 items-center",
              isThread
                ? "min-h-12 gap-1 px-3 py-0.5 sm:min-h-[52px] sm:gap-2 sm:px-4"
                : "flex-col gap-0",
            )}
          >
            <Textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={resolvedPlaceholder}
              rows={isThread ? 1 : undefined}
              className={cn(
                "min-w-0 resize-none border-0 bg-transparent font-sans text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-0 scrollbar-thin scrollbar-thumb-muted-foreground/20",
                isThread
                  ? "order-2 min-h-8 max-h-[min(30dvh,160px)] flex-1 content-center px-2 py-1 text-base leading-5 sm:px-3 sm:text-[17px]"
                  : "min-h-[48px] max-h-[min(35dvh,240px)] w-full px-3 py-2.5 text-[15px] leading-relaxed sm:min-h-[56px] sm:px-4 sm:py-3 sm:text-base md:px-5 md:py-4",
              )}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  requestFormSubmit();
                }
              }}
            />

            <div
              className={cn(
                "flex min-w-0 items-center",
                isThread
                  ? "contents"
                  : "w-full gap-1 px-2 pb-2 pt-0 sm:gap-2 sm:px-3 sm:pb-3",
              )}
            >
              <div
                className={cn(
                  "flex min-w-0 items-center justify-start gap-0.5 overscroll-x-contain scrollbar-none [-webkit-overflow-scrolling:touch] sm:gap-1",
                  isThread ? "order-1 shrink-0" : "flex-1 overflow-x-auto",
                )}
              >
                <input
                  type="file"
                  multiple
                  accept={ATTACH_ACCEPT}
                  ref={fileInputRef}
                  disabled={isProcessingFiles}
                  className="hidden"
                  onChange={handleFileSelect}
                />

                <IconTooltip label={t("composer.attach")}>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t("composer.attach")}
                    disabled={isProcessingFiles || isLoading}
                    className={cn(
                      "shrink-0 rounded-full border border-border/50 bg-muted/70 text-muted-foreground transition-[background-color,border-color,box-shadow,color] duration-200 hover:border-foreground/20 hover:bg-muted hover:text-foreground hover:shadow-[0_1px_4px_rgb(0_0_0/0.12)] dark:hover:shadow-[0_1px_4px_rgb(0_0_0/0.3)]",
                      isThread ? "size-8 sm:size-9" : "size-9 sm:size-8",
                    )}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <PlusIcon className="size-[18px]" />
                  </Button>
                </IconTooltip>

                {showComposerModel && !isThread && (
                  <ComposerModelSlot
                    visible
                    model={model!}
                    onModelChange={onModelChange!}
                    modelStorageKey={modelStorageKey}
                    isThinking={isThinking}
                    onThinkingChange={onThinkingChange}
                    showModelSelector={showModelSelector}
                  />
                )}
              </div>

              <div
                className={cn(
                  "flex shrink-0 items-center",
                  isThread ? "order-4 gap-1 sm:gap-2" : "ml-auto",
                )}
              >
                {showComposerModel && isThread && (
                  <ComposerModelSlot
                    visible
                    model={model!}
                    onModelChange={onModelChange!}
                    modelStorageKey={modelStorageKey}
                    isThinking={isThinking}
                    onThinkingChange={onThinkingChange}
                    showModelSelector={showModelSelector}
                  />
                )}

                <ComposerPrimaryAction
                  t={t}
                  density={density}
                  isProcessingFiles={isProcessingFiles}
                  isLoading={isLoading}
                  useVoiceAction={useVoiceAction}
                  isListening={isListening}
                  voiceModifierHeld={voiceModifierHeld}
                  hasDraft={hasDraft}
                  query={query}
                  onSpeechToggle={onSpeechToggle}
                  onStop={onStop}
                  onSendWhileLoading={onSendWhileLoading}
                  onClearQuery={() => setQuery("")}
                />
              </div>
            </div>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
