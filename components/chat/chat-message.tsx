/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

/* Attachment previews use data URLs, which next/image cannot optimize. */
/* eslint-disable @next/next/no-img-element */

"use client";

import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  CheckIcon,
  CopyIcon,
  DownloadSimple as DownloadIcon,
  FileText as FileTextIcon,
  PaperclipIcon,
  SpeakerHigh as SpeakerIcon,
  Stop as StopIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChatErrorBanner } from "@/components/chat/chat-error-banner";
import { ThinkingPanel } from "@/components/chat/thinking-panel";
import { AssistantMarkdown } from "@/components/chat/assistant-markdown";
import { useMarkdown } from "@/hooks/useMarkdown";
import { useSmoothTyping } from "@/hooks/use-smooth-typing";
import { useTranslation } from "@/hooks/use-translation";
import { Message, MODELS, Role } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  displayThinkingFields,
  isSubstantiveThinkingContent,
  parseLegacyThinkingContent,
} from "@/lib/chat/thinking-mode";
import { splitDocumentResponse } from "@/lib/chat/document-work";
import { chatMessageBodyClass } from "@/lib/chat/message-prose";
import { CHAT_THREAD_HORIZONTAL_INSET } from "@/lib/chat/thread-layout";

export type ChatMessageLayout = "thread" | "arena";

const shellPadding = cn("py-2.5", CHAT_THREAD_HORIZONTAL_INSET);

const innerWidth: Record<ChatMessageLayout, string> = {
  thread: "max-w-4xl mx-auto",
  arena: "max-w-full",
};

export const ChatMessage = memo(
  ({
    message,
    onCopy,
    onModelSelect,
    isGenerating,
    isDocumentRequest = false,
    layout = "thread",
    pdfFileName = "ai-response.pdf",
    pdfTitle = "AI Response",
  }: {
    message: Message;
    onCopy: (content: string) => void;
    onModelSelect?: (modelId: string) => void;
    isGenerating?: boolean;
    isDocumentRequest?: boolean;
    layout?: ChatMessageLayout;
    pdfFileName?: string;
    pdfTitle?: string;
  }) => {
    const { t } = useTranslation();
    const [isCopied, setIsCopied] = useState(false);
    const [speakingSegment, setSpeakingSegment] = useState<string | null>(null);

    const handleMessageCopy = useCallback(
      async (content?: string) => {
        const textToCopy =
          typeof content === "string" ? content : message.content;
        await onCopy(textToCopy);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      },
      [onCopy, message.content],
    );

    const handleSpeak = useCallback(
      (content: string, segmentId: string) => {
        if (typeof window === "undefined" || !window.speechSynthesis) {
          toast.error(t("toast.speech.playbackUnsupported"));
          return;
        }
        if (speakingSegment === segmentId) {
          window.speechSynthesis.cancel();
          setSpeakingSegment(null);
          return;
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(content);
        utterance.rate = 0.95;
        utterance.onend = () => setSpeakingSegment(null);
        utterance.onerror = () => {
          setSpeakingSegment(null);
          toast.error(t("toast.speech.playbackFail"));
        };
        window.speechSynthesis.speak(utterance);
        setSpeakingSegment(segmentId);
      },
      [speakingSegment, t],
    );

    useEffect(
      () => () => {
        if (typeof window !== "undefined") window.speechSynthesis?.cancel();
      },
      [],
    );

    const {
      preprocessMarkdown,
      markdownComponents,
      remarkPlugins,
      rehypePlugins,
    } = useMarkdown({
      onCopy: handleMessageCopy,
      copied: isCopied,
      isWrapped: false,
      resolvedTheme: "dark",
    });

    const isUser = message.role === Role.User;
    const isAssistantError = !isUser && Boolean(message.isError);
    const isStreaming = Boolean(isGenerating);
    const displayedContent = useSmoothTyping(
      message.content,
      5,
      Boolean(
        message.shouldAnimate && !isStreaming && !message.isThinkingRequested,
      ),
    );
    const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);
    const userToggledThinkingRef = useRef(false);
    const didAutoCollapseThinkingRef = useRef(false);

    useEffect(() => {
      userToggledThinkingRef.current = false;
      didAutoCollapseThinkingRef.current = false;
      setIsThinkingExpanded(true);
    }, [message.id]);

    const liveFields =
      !isUser && Boolean(message.isThinkingRequested)
        ? displayThinkingFields(message.thinkingText, message.content, {
            streaming: isStreaming,
          })
        : null;

    const legacyParsed =
      !isUser && !liveFields
        ? parseLegacyThinkingContent(
            isStreaming ? message.content : displayedContent,
          )
        : null;

    const thinkingContent = liveFields
      ? liveFields.thinkingText
      : (legacyParsed?.thinkingContent ?? "");

    const mainResponse = isUser
      ? message.content
      : liveFields
        ? liveFields.content
        : (legacyParsed?.mainResponse ??
          (isStreaming ? message.content : displayedContent));
    const parsedResponseSegments = isUser
      ? [{ kind: "conversation" as const, text: mainResponse }]
      : splitDocumentResponse(mainResponse);
    const hasMarkedDocumentSegment = parsedResponseSegments.some(
      (segment) => segment.kind === "document",
    );
    const unmarkedDeliverableHeading =
      !isUser && isDocumentRequest && !hasMarkedDocumentSegment
        ? mainResponse.match(/^\s{0,3}#{1,3}\s+([^\n]+)\s*\n+/)
        : null;
    const responseSegments =
      !isUser &&
      isDocumentRequest &&
      !hasMarkedDocumentSegment &&
      mainResponse.trim()
        ? [
            {
              kind: "document" as const,
              text: unmarkedDeliverableHeading
                ? mainResponse.slice(unmarkedDeliverableHeading[0].length)
                : mainResponse,
              ...(unmarkedDeliverableHeading
                ? { title: unmarkedDeliverableHeading[1].trim() }
                : {}),
            },
          ]
        : parsedResponseSegments;
    const documentSegments = responseSegments.filter(
      (segment) => segment.kind === "document",
    );
    const hasDocumentSegments = documentSegments.length > 0;

    useEffect(() => {
      if (
        userToggledThinkingRef.current ||
        didAutoCollapseThinkingRef.current ||
        isStreaming
      ) {
        return;
      }
      if (thinkingContent.trim() && mainResponse?.trim()) {
        didAutoCollapseThinkingRef.current = true;
        setIsThinkingExpanded(false);
      }
    }, [thinkingContent, mainResponse, isStreaming]);

    const handleThinkingToggle = useCallback(() => {
      userToggledThinkingRef.current = true;
      setIsThinkingExpanded((prev) => !prev);
    }, []);

    const hasThinkingPanel =
      !isUser &&
      Boolean(message.isThinkingRequested) &&
      (isSubstantiveThinkingContent(thinkingContent) ||
        (isStreaming && !mainResponse?.trim()));
    const showAnswer =
      isAssistantError || (!isUser && Boolean(mainResponse?.trim()));
    const compactAssistantContentClass =
      "bg-transparent text-foreground px-0 shadow-none border-none";

    return (
      <div className="w-full">
        <div className={shellPadding}>
          <div className={innerWidth[layout]}>
            <div className="flex w-full">
              <div
                className={cn(
                  "flex max-w-full flex-col",
                  isUser ? "ml-auto items-end" : "mr-auto items-start",
                  isUser ? "w-fit max-w-[min(100%,36rem)]" : "w-full",
                )}
              >
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {message.attachments.map((att, i) =>
                      att.type.startsWith("image/") ||
                      att.kind === "image" ||
                      att.kind === "video_frame" ? (
                        <div
                          key={i}
                          className="relative max-w-full overflow-hidden rounded-lg border border-border/50"
                        >
                          <img
                            src={att.content}
                            alt={att.name}
                            className="max-h-[300px] w-auto rounded-lg object-contain"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/50 p-2 text-xs"
                        >
                          <PaperclipIcon className="size-3" />
                          <span className="max-w-[150px] truncate font-medium">
                            {att.name}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                )}

                {hasThinkingPanel && (
                  <ThinkingPanel
                    thinkingContent={thinkingContent}
                    isExpanded={isThinkingExpanded}
                    onToggle={handleThinkingToggle}
                    isStreaming={isStreaming}
                    label={t("chat.thinking.label")}
                    remarkPlugins={remarkPlugins}
                    rehypePlugins={rehypePlugins}
                    markdownComponents={markdownComponents}
                    preprocessMarkdown={preprocessMarkdown}
                    className={showAnswer ? "pb-0" : "pb-1"}
                  />
                )}

                {(isUser || showAnswer) && (
                  <div className="w-full">
                    {isUser ? (
                      <div className="w-full max-w-full overflow-hidden break-words px-0 py-1.5 text-sm text-foreground md:py-2">
                        <div className="[overflow-wrap:anywhere] whitespace-pre-wrap break-words text-left text-[15px] font-medium leading-relaxed">
                          {mainResponse}
                        </div>
                      </div>
                    ) : isAssistantError ? (
                      <div className="w-full max-w-full overflow-hidden break-words py-1">
                        <ChatErrorBanner
                          body={message.content}
                          code={message.errorType}
                        />
                      </div>
                    ) : (
                      responseSegments.map((segment, index) => {
                        const segmentContent = segment.text.trim();
                        if (!segmentContent) return null;
                        const isDocument = segment.kind === "document";
                        const segmentId = `${message.id ?? "message"}-${index}`;
                        const isSegmentSpeaking = speakingSegment === segmentId;
                        const body = (
                          <AssistantMarkdown
                            content={segmentContent}
                            variant="answer"
                            remarkPlugins={remarkPlugins}
                            rehypePlugins={rehypePlugins}
                            components={markdownComponents}
                            preprocess={preprocessMarkdown}
                          />
                        );

                        return (
                          <React.Fragment key={segmentId}>
                            {isDocument ? (
                              <section
                                data-document-response="true"
                                className="my-3 w-full rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5"
                              >
                                <h3 className="mb-3 flex items-center gap-2 border-b border-border/60 pb-2.5 text-xs font-semibold text-muted-foreground">
                                  <FileTextIcon
                                    className="size-4"
                                    weight="duotone"
                                  />
                                  <span>
                                    {segment.title ||
                                      t("chat.message.documentAnalysis")}
                                  </span>
                                </h3>
                                <div
                                  className={cn(
                                    "w-full max-w-full overflow-hidden break-words py-1.5",
                                    compactAssistantContentClass,
                                    chatMessageBodyClass,
                                  )}
                                >
                                  {body}
                                </div>
                                {!isGenerating && (
                                  <div className="mt-3 flex items-center gap-1.5 self-start transition-opacity duration-200">
                                    <TooltipProvider delayDuration={0}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-full text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:text-foreground"
                                            onClick={() =>
                                              handleMessageCopy(segmentContent)
                                            }
                                            aria-label={t("chat.message.copy")}
                                          >
                                            {isCopied ? (
                                              <CheckIcon className="size-4 text-green-500" />
                                            ) : (
                                              <CopyIcon className="size-4" />
                                            )}
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent
                                          side="top"
                                          sideOffset={6}
                                        >
                                          {t("chat.message.copy")}
                                        </TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-full text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:text-foreground"
                                            onClick={() =>
                                              handleSpeak(
                                                segmentContent,
                                                segmentId,
                                              )
                                            }
                                            aria-label={
                                              isSegmentSpeaking
                                                ? t(
                                                    "chat.message.stopListening",
                                                  )
                                                : t("chat.message.listen")
                                            }
                                          >
                                            {isSegmentSpeaking ? (
                                              <StopIcon
                                                className="size-4"
                                                weight="fill"
                                              />
                                            ) : (
                                              <SpeakerIcon
                                                className="size-4"
                                                weight="fill"
                                              />
                                            )}
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent
                                          side="top"
                                          sideOffset={6}
                                        >
                                          {isSegmentSpeaking
                                            ? t("chat.message.stopListening")
                                            : t("chat.message.listen")}
                                        </TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-full text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:text-foreground"
                                            onClick={async () => {
                                              try {
                                                const { generatePDF } =
                                                  await import("@/lib/pdf-utils");
                                                const title =
                                                  segment.title ||
                                                  t(
                                                    "chat.message.documentAnalysis",
                                                  );
                                                const filename =
                                                  title
                                                    .toLowerCase()
                                                    .replace(/[^a-z0-9]+/g, "-")
                                                    .replace(/^-|-$/g, "") ||
                                                  "document";
                                                await generatePDF(
                                                  segmentContent,
                                                  `${filename}.pdf`,
                                                  title,
                                                );
                                                toast.success(
                                                  t("toast.pdf.success"),
                                                );
                                              } catch (error) {
                                                console.error(
                                                  "PDF generation error:",
                                                  error,
                                                );
                                                toast.error(
                                                  t("toast.pdf.fail"),
                                                );
                                              }
                                            }}
                                            aria-label={t(
                                              "chat.message.downloadPdf",
                                            )}
                                          >
                                            <DownloadIcon className="size-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent
                                          side="top"
                                          sideOffset={6}
                                        >
                                          {t("chat.message.downloadPdf")}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                )}
                              </section>
                            ) : (
                              <div
                                className={cn(
                                  "w-full max-w-full overflow-hidden break-words",
                                  compactAssistantContentClass,
                                  chatMessageBodyClass,
                                  hasThinkingPanel && showAnswer
                                    ? "mt-0.5 border-t border-border/45 pt-3.5 pb-1.5"
                                    : "py-1.5",
                                )}
                              >
                                {body}
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}

                    {!isUser &&
                      !isAssistantError &&
                      showAnswer &&
                      mainResponse.trim() &&
                      !hasDocumentSegments &&
                      !isGenerating && (
                        <div className="mt-3 flex items-center gap-1.5 self-start transition-opacity duration-200">
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:text-foreground"
                                  onClick={() =>
                                    handleMessageCopy(mainResponse)
                                  }
                                  aria-label={t("chat.message.copy")}
                                >
                                  {isCopied ? (
                                    <CheckIcon className="size-4 text-green-500" />
                                  ) : (
                                    <CopyIcon className="size-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" sideOffset={6}>
                                {t("chat.message.copy")}
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:text-foreground"
                                  onClick={async () => {
                                    try {
                                      const { generatePDF } =
                                        await import("@/lib/pdf-utils");
                                      await generatePDF(
                                        mainResponse,
                                        pdfFileName,
                                        pdfTitle,
                                      );
                                      toast.success(t("toast.pdf.success"));
                                    } catch (error) {
                                      console.error(
                                        "PDF generation error:",
                                        error,
                                      );
                                      toast.error(t("toast.pdf.fail"));
                                    }
                                  }}
                                  aria-label={t("chat.message.downloadPdf")}
                                >
                                  <DownloadIcon className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" sideOffset={6}>
                                {t("chat.message.downloadPdf")}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {message.isError &&
          message.errorType === "rate_limit" &&
          onModelSelect && (
            <div className={cn(shellPadding)}>
              <div className={innerWidth[layout]}>
                <div className="flex flex-col gap-2">
                  <p className="ml-1 text-xs font-medium text-muted-foreground">
                    {t("errors.chat.alternatives")}
                  </p>
                  <div className="flex max-h-[300px] flex-wrap gap-2 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                    {MODELS.map((m) => (
                      <Button
                        key={m.id}
                        variant="outline"
                        size="sm"
                        className="h-7 whitespace-nowrap border-primary/10 bg-background/50 text-[10px] hover:border-primary/50 hover:bg-background md:text-xs"
                        onClick={() => onModelSelect(m.id)}
                      >
                        {m.name.replace(" (Free)", "")}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>
    );
  },
);

ChatMessage.displayName = "ChatMessage";
