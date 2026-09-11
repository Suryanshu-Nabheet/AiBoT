/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import {
  PaperPlaneRightIcon,
  StopIcon,
  PaperclipIcon,
  MagicWandIcon,
  MicrophoneIcon,
  X as XIcon,
} from "@phosphor-icons/react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ModelSelector } from "@/components/ui/model-selector";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/use-translation";

interface ChatInputProps {
  query: string;
  setQuery: (query: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  onStop?: () => void;
  attachments: { name: string; content: string; type: string }[];
  setAttachments: React.Dispatch<
    React.SetStateAction<{ name: string; content: string; type: string }[]>
  >;
  isListening?: boolean;
  onSpeechToggle?: () => void;
  isEnhancing?: boolean;
  onEnhance?: () => void;
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
}

export function ChatInput({
  query,
  setQuery,
  onSubmit,
  isLoading,
  onStop,
  attachments,
  setAttachments,
  isListening = false,
  onSpeechToggle,
  isEnhancing = false,
  onEnhance,
  isThinking = false,
  onThinkingChange,
  model,
  onModelChange,
  modelStorageKey,
  showModelSelector = false,
  placeholder,
  className,
  dock = "bottom",
}: ChatInputProps) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t("composer.placeholder");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showComposerModel = showModelSelector && model && onModelChange;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newAttachments: { name: string; content: string; type: string }[] =
        [];

      const { extractTextFromFile } = await import("@/lib/file-utils");

      for (const file of files) {
        try {
          if (file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            await new Promise<void>((resolve) => {
              reader.onload = () => {
                if (typeof reader.result === "string") {
                  newAttachments.push({
                    name: file.name,
                    content: reader.result,
                    type: file.type,
                  });
                }
                resolve();
              };
            });
          } else if (
            file.name.endsWith(".pdf") ||
            file.name.endsWith(".docx") ||
            file.name.endsWith(".doc") ||
            file.name.endsWith(".pptx") ||
            file.name.endsWith(".xlsx") ||
            file.name.endsWith(".xls")
          ) {
            try {
              const extractedText = await extractTextFromFile(file);
              newAttachments.push({
                name: file.name,
                content: `[Document: ${file.name}]\n\n${extractedText}\n\n---\n*For detailed analysis of this document, use the Summarizer feature for comprehensive research-grade insights.*`,
                type: "text/plain",
              });
              toast.success(t("toast.file.extracted", { name: file.name }));
            } catch (extractError) {
              console.error(`Failed to extract ${file.name}:`, extractError);
              toast.error(t("toast.file.extractFail", { name: file.name }));
            }
          } else {
            const text = await file.text();
            newAttachments.push({
              name: file.name,
              content: text,
              type: file.type,
            });
          }
        } catch (err) {
          console.error(`Error reading ${file.name}:`, err);
          toast.error(t("toast.file.readFail", { name: file.name }));
        }
      }

      setAttachments((prev) => [...prev, ...newAttachments]);
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
        dock === "bottom"
          ? "bg-gradient-to-t from-background via-background to-transparent px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))] sm:pt-4 md:pt-6"
          : "px-0 pb-0 pt-0",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-4xl">
        <motion.form
          initial={dock === "center" ? { opacity: 0 } : { y: 20, opacity: 0 }}
          animate={dock === "center" ? { opacity: 1 } : { y: 0, opacity: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          onSubmit={onSubmit}
          className="relative flex w-full max-w-full min-w-0 flex-col gap-0 overflow-hidden rounded-2xl border border-border/50 bg-muted/40 shadow-xl ring-1 ring-white/10 backdrop-blur-xl sm:rounded-3xl dark:ring-white/5"
        >
          {attachments.length > 0 && (
            <div className="flex gap-2 overflow-x-auto px-4 pt-3 scrollbar-none">
              {attachments.map((att, i) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={i}
                  className="relative group flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-background/50"
                >
                  {att.type.startsWith("image/") ? (
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
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    className="absolute top-0.5 right-0.5 rounded-full bg-black/50 p-0.5 text-white opacity-0 backdrop-blur-sm transition-all hover:bg-red-500 group-hover:opacity-100"
                  >
                    <XIcon className="size-3" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          <Textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={resolvedPlaceholder}
            className="min-h-[48px] max-h-[min(35dvh,240px)] w-full min-w-0 resize-none border-0 bg-transparent px-3 py-2.5 font-sans text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-0 sm:min-h-[56px] sm:px-4 sm:py-3 sm:text-base md:px-5 md:py-4 scrollbar-thin scrollbar-thumb-muted-foreground/20"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e);
              }
            }}
          />

          <div className="flex min-w-0 items-center gap-1 px-2 pb-2 pt-0 sm:gap-2 sm:px-3 sm:pb-3">
            {showComposerModel && (
              <ModelSelector
                value={model}
                onValueChange={onModelChange}
                modelStorageKey={modelStorageKey}
                thinkingEnabled={isThinking}
                onThinkingChange={onThinkingChange}
                showModelList={showModelSelector}
                triggerVariant="compact"
              />
            )}

            <div className="flex min-w-0 flex-1 items-center justify-end gap-0.5 overflow-x-auto overscroll-x-contain scrollbar-none [-webkit-overflow-scrolling:touch] sm:justify-start sm:gap-1">
              <input
                type="file"
                multiple
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
              />

              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-9 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground sm:size-8"
                onClick={() => fileInputRef.current?.click()}
                title={t("composer.attach")}
              >
                <PaperclipIcon className="size-[18px]" />
              </Button>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn(
                  "size-9 shrink-0 rounded-full sm:size-8",
                  isListening
                    ? "animate-pulse bg-red-500/10 text-red-500"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                onClick={onSpeechToggle}
                title={t("composer.voice")}
              >
                {isListening ? (
                  <StopIcon weight="fill" className="size-[18px]" />
                ) : (
                  <MicrophoneIcon className="size-[18px]" />
                )}
              </Button>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn(
                  "size-9 shrink-0 rounded-full max-[360px]:hidden sm:size-8",
                  isEnhancing
                    ? "bg-purple-400/10 text-purple-400"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                onClick={onEnhance}
                disabled={isEnhancing || !query.trim()}
                title={t("composer.enhance")}
              >
                <MagicWandIcon
                  className={cn("size-[18px]", isEnhancing && "animate-pulse")}
                />
              </Button>
            </div>

            <div className="flex shrink-0 items-center">
              {isLoading ? (
                <Button
                  type="button"
                  size="icon"
                  className="size-9 rounded-full border border-red-500/20 bg-red-500/10 p-0 text-red-500 shadow-none hover:bg-red-500/20 sm:size-8"
                  onClick={onStop}
                  aria-label={t("composer.stop")}
                >
                  <StopIcon weight="fill" className="size-[14px]" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  className="size-9 rounded-full p-0 sm:size-8"
                  disabled={!query.trim() && attachments.length === 0}
                  aria-label={t("composer.send")}
                >
                  <PaperPlaneRightIcon weight="fill" className="size-[14px]" />
                </Button>
              )}
            </div>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
