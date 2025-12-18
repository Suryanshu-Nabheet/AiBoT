"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { v4 } from "uuid";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  PaperPlaneRightIcon,
  StopIcon,
  PaperclipIcon,
  MagicWandIcon,
  MicrophoneIcon,
  X as XIcon,
  CheckIcon,
  CopyIcon,
  DownloadSimple as DownloadIcon,
} from "@phosphor-icons/react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ModelSelector } from "@/components/ui/model-selector";
import { cn } from "@/lib/utils";
import { useChatSession } from "@/hooks/use-chat-session";
import ReactMarkdown from "react-markdown";
import { ChatInput } from "./chat-input";
import { Geist_Mono } from "next/font/google";
import { useSmoothTyping } from "@/hooks/use-smooth-typing";
import { Message, Role } from "@/lib/types";
import { useMarkdown } from "@/hooks/useMarkdown";

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  preload: true,
  display: "swap",
});

// Reusing Message Component logic but simplified for import/export if needed
// For speed, I'm duplicating the display logic or I should export it from chat-interface.
// To keep it clean and robust, I'll inline a simplified version here or duplicate for safety.
// Given strict instructions, I will duplicate the MessageComponent logic to ensure isolation.

const MessageComponent = memo(
  ({
    message,
    onCopy,
  }: {
    message: Message;
    onCopy: (content: string) => void;
  }) => {
    // Simplified Markdown setup
    const { markdownComponents, remarkPlugins, rehypePlugins } = useMarkdown({
      onCopy,
      copied: false,
      isWrapped: false,
      resolvedTheme: "dark",
      geistMono,
    });

    const isUser = message.role === Role.User;
    const displayedContent = useSmoothTyping(
      message.content,
      5,
      message.shouldAnimate
    );
    const contentToShow = isUser ? message.content : displayedContent;

    // Simple copy for now
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
      onCopy(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div
        className={cn(
          "flex flex-col max-w-full px-4 py-2",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm shadow-sm max-w-[90%]",
            "break-words overflow-hidden",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-md"
              : "bg-muted text-foreground rounded-tl-md border border-border/50"
          )}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap">{contentToShow}</div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={remarkPlugins}
                rehypePlugins={rehypePlugins}
                components={markdownComponents}
              >
                {contentToShow}
              </ReactMarkdown>
            </div>
          )}
        </div>
        {!isUser && (
          <div className="flex items-center gap-1 mt-1 pl-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleCopy}
            >
              {copied ? (
                <CheckIcon className="size-3" />
              ) : (
                <CopyIcon className="size-3" />
              )}
            </Button>
          </div>
        )}
      </div>
    );
  }
);
MessageComponent.displayName = "MessageComponent";

export default function ArenaInterface() {
  // --- Dual Sessions ---
  const leftChat = useChatSession({
    storageKey: "arena-a",
    sessionId: "arena-a",
  });
  const rightChat = useChatSession({
    storageKey: "arena-b",
    sessionId: "arena-b",
  });

  // --- Shared Input State ---
  const [query, setQuery] = useState("");
  const [attachments, setAttachments] = useState<
    { name: string; content: string; type: string }[]
  >([]);
  const [isListening, setIsListening] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // --- Refs ---
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // --- Handlers ---
  const handleSharedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      (!query.trim() && attachments.length === 0) ||
      leftChat.isLoading ||
      rightChat.isLoading
    )
      return;

    const currentQuery = query;
    const currentAttachments = [...attachments]; // Capture current state

    setQuery("");
    setAttachments([]); // Clear immediately

    await Promise.all([
      leftChat.handleSend(currentQuery, currentAttachments),
      rightChat.handleSend(currentQuery, currentAttachments),
    ]);
  };

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

  const handleSpeech = useCallback(() => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    if (!("webkitSpeechRecognition" in window)) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      toast.info("Listening...");
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = (event: any) => {
      console.error("Speech error", event.error);
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery((prev) => (prev ? prev + " " + transcript : transcript));
    };

    recognition.start();
  }, [isListening]);

  const handleEnhance = async () => {
    if (!query.trim()) {
      toast.warning("Please type something to enhance first.");
      return;
    }

    const originalQuery = query;
    setIsEnhancing(true);

    try {
      const res = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: query }),
      });

      if (!res.ok) {
        toast.error("Failed to enhance prompt. Please try again.");
        return;
      }

      const data = await res.json();

      if (data.enhanced) {
        const enhanced = data.enhanced.trim();
        const isErrorMessage =
          enhanced.toLowerCase().includes("please provide") ||
          enhanced.length < originalQuery.length;

        if (isErrorMessage) {
          toast.info(enhanced, { duration: 4000 });
        } else {
          setQuery(enhanced);
          toast.success("Prompt enhanced!");
        }
      } else {
        toast.error("No enhancement received.");
      }
    } catch (error) {
      console.error("Enhancement error:", error);
      toast.error("Failed to enhance.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="flex flex-col h-full w-full bg-background relative overflow-hidden">
      {/* Split Area */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border">
        {/* LEFT PANEL */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
          <div className="absolute top-2 left-4 z-10">
            <ModelSelector
              value={leftChat.model}
              onValueChange={leftChat.setModel}
            />
          </div>
          <div className="flex-1 overflow-y-auto pt-12 pb-32 scrollbar-thin">
            {leftChat.messages.map((m, i) => (
              <MessageComponent
                key={m.id || i}
                message={m}
                onCopy={handleCopy}
              />
            ))}
            {leftChat.isLoading && (
              <div className="px-4 py-2 text-xs text-muted-foreground animate-pulse">
                Model A is generating...
              </div>
            )}
            <div
              ref={(el) => {
                el?.scrollIntoView({ behavior: "smooth" });
              }}
            />
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
          <div className="absolute top-2 left-4 z-10">
            <ModelSelector
              value={rightChat.model}
              onValueChange={rightChat.setModel}
            />
          </div>
          <div className="flex-1 overflow-y-auto pt-12 pb-32 scrollbar-thin">
            {rightChat.messages.map((m, i) => (
              <MessageComponent
                key={m.id || i}
                message={m}
                onCopy={handleCopy}
              />
            ))}
            {rightChat.isLoading && (
              <div className="px-4 py-2 text-xs text-muted-foreground animate-pulse">
                Model B is generating...
              </div>
            )}
            <div
              ref={(el) => {
                el?.scrollIntoView({ behavior: "smooth" });
              }}
            />
          </div>
        </div>
      </div>

      {/* Shared Input Area - Fixed at bottom */}
      <ChatInput
        query={query}
        setQuery={setQuery}
        onSubmit={handleSharedSubmit}
        isLoading={leftChat.isLoading || rightChat.isLoading}
        attachments={attachments}
        setAttachments={setAttachments}
        isListening={isListening}
        onSpeechToggle={handleSpeech}
        isEnhancing={isEnhancing}
        onEnhance={handleEnhance}
        // No Model Selector for Arena
        showModelSelector={false}
        placeholder={isListening ? "Listening..." : "Message both models..."}
        className="absolute bottom-0 left-0" // Ensure positioning is correct
      />
    </div>
  );
}
