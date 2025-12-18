"use client";

import { useRef, useState } from "react";
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
  model?: string;
  onModelChange?: (model: string) => void;
  showModelSelector?: boolean;
  placeholder?: string;
  className?: string; // Allow override
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
  model,
  onModelChange,
  showModelSelector = false,
  placeholder = "Message...",
  className,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
                content: `[Document: ${file.name}]\n\n${extractedText}\n\n---\n💡 *For detailed analysis of this document, use the Summarizer feature for comprehensive research-grade insights.*`,
                type: "text/plain",
              });
              toast.success(`Extracted text from ${file.name}`);
            } catch (extractError) {
              console.error(`Failed to extract ${file.name}:`, extractError);
              toast.error(
                `Could not extract text from ${file.name}. Try the Summarizer feature.`
              );
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
          toast.error(`Failed to read ${file.name}`);
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
        "w-full bg-gradient-to-t from-background via-background to-transparent pt-10 pb-6 px-4 z-10",
        className
      )}
    >
      <div className="max-w-4xl mx-auto">
        <motion.form
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          onSubmit={onSubmit}
          className="relative flex flex-col gap-2 bg-muted/40 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/10 dark:ring-white/5"
        >
          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="flex px-4 pt-3 gap-2 overflow-x-auto scrollbar-none">
              {attachments.map((att, i) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={i}
                  className="relative group flex items-center justify-center bg-background/50 border border-white/10 rounded-xl overflow-hidden w-16 h-16 flex-shrink-0"
                >
                  {att.type.startsWith("image/") ? (
                    <img
                      src={att.content}
                      alt={att.name}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-1 text-center">
                      <PaperclipIcon className="size-5 text-muted-foreground" />
                      <span className="text-[8px] leading-tight truncate w-full px-1 text-muted-foreground mt-1">
                        {att.name}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    className="absolute top-0.5 right-0.5 bg-black/50 hover:bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
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
            placeholder={placeholder}
            className="min-h-[60px] max-h-[200px] w-full bg-transparent border-0 focus-visible:ring-0 resize-none py-4 px-4 md:px-5 text-base md:text-[15px] placeholder:text-muted-foreground/60 leading-relaxed scrollbar-thin scrollbar-thumb-muted-foreground/20"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e);
              }
            }}
          />

          {/* Toolbar */}
          <div className="flex items-center justify-between px-3 pb-3 pt-0">
            {/* Left Tools: Input & AI */}
            <div className="flex items-center gap-1.5">
              {/* Model Selector - First */}
              {showModelSelector && model && onModelChange && (
                <>
                  <ModelSelector value={model} onValueChange={onModelChange} />
                  {/* Divider - Only shown if model selector is present */}
                  <div className="h-4 w-[1px] bg-border/50 mx-1" />
                </>
              )}

              <input
                type="file"
                multiple
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
              />

              {/* Attachment */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                onClick={() => fileInputRef.current?.click()}
                title="Attach files"
              >
                <PaperclipIcon className="size-[18px]" />
              </Button>

              {/* Voice Input */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn(
                  "size-8 rounded-full transition-all duration-300",
                  isListening
                    ? "text-red-500 bg-red-500/10 animate-pulse"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                onClick={onSpeechToggle}
                title="Voice input"
              >
                {isListening ? (
                  <StopIcon weight="fill" className="size-[18px]" />
                ) : (
                  <MicrophoneIcon className="size-[18px]" />
                )}
              </Button>

              {/* Enhance Prompt */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn(
                  "size-8 rounded-full transition-all duration-300",
                  isEnhancing
                    ? "text-purple-400 bg-purple-400/10"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                onClick={onEnhance}
                disabled={isEnhancing || !query.trim()}
                title="Enhance prompt"
              >
                <MagicWandIcon
                  className={cn("size-[18px]", isEnhancing && "animate-pulse")}
                />
              </Button>
            </div>

            {/* Right Tools: Submit */}
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Button
                  type="button"
                  size="icon"
                  className="size-8 rounded-full p-0 bg-red-500/10 text-red-500 hover:bg-red-500/20 shadow-none border border-red-500/20"
                  onClick={onStop}
                >
                  <StopIcon weight="fill" className="size-[14px]" />
                </Button>
              ) : (
                <Button
                  asChild
                  type="submit"
                  size="icon"
                  className="size-8 rounded-full p-0"
                  disabled={!query.trim() && attachments.length === 0}
                >
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <PaperPlaneRightIcon
                      weight="fill"
                      className="size-[14px]"
                    />
                  </motion.button>
                </Button>
              )}
            </div>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
