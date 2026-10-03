"use client";

import {
  PaperPlaneRightIcon,
  StopIcon,
  MicrophoneIcon,
  CircleNotchIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/lib/i18n";

type Translate = (
  key: TranslationKey,
  vars?: Record<string, string | number>,
) => string;

interface ComposerPrimaryActionProps {
  t: Translate;
  density: "hero" | "thread";
  isProcessingFiles: boolean;
  isLoading: boolean;
  useVoiceAction: boolean;
  isListening: boolean;
  voiceModifierHeld: boolean;
  hasDraft: boolean;
  query: string;
  onSpeechToggle?: () => void;
  onStop?: () => void;
  onSendWhileLoading?: (prompt: string) => void;
  onClearQuery: () => void;
}

function actionButtonSize(density: "hero" | "thread") {
  return density === "thread" ? "size-8 sm:size-9" : "size-9 sm:size-8";
}

export function ComposerPrimaryAction({
  t,
  density,
  isProcessingFiles,
  isLoading,
  useVoiceAction,
  isListening,
  voiceModifierHeld,
  hasDraft,
  query,
  onSpeechToggle,
  onStop,
  onSendWhileLoading,
  onClearQuery,
}: ComposerPrimaryActionProps) {
  const sizeClass = actionButtonSize(density);

  if (useVoiceAction) {
    return (
      <IconTooltip
        label={
          voiceModifierHeld && hasDraft
            ? t("composer.voice.modifierHint")
            : isListening
              ? t("composer.voice.stop")
              : t("composer.voice")
        }
      >
        <Button
          type="button"
          size="icon"
          className={cn(
            "rounded-full p-0",
            sizeClass,
            isListening &&
              "animate-pulse border border-red-500/20 bg-red-500/10 text-red-500 shadow-none hover:bg-red-500/20",
          )}
          onClick={onSpeechToggle}
          aria-label={
            isListening ? t("composer.voice.stop") : t("composer.voice")
          }
        >
          {isListening ? (
            <StopIcon weight="fill" className="size-[14px]" />
          ) : (
            <MicrophoneIcon className="size-[18px]" />
          )}
        </Button>
      </IconTooltip>
    );
  }

  if (isLoading && query.trim() && onSendWhileLoading) {
    return (
      <IconTooltip label={t("composer.sendNow")}>
        <Button
          type="button"
          size="icon"
          onClick={() => {
            onSendWhileLoading(query);
            onClearQuery();
          }}
          aria-label={t("composer.sendNow")}
          title={t("composer.sendNow")}
          className={cn("rounded-full p-0", sizeClass)}
        >
          <PaperPlaneRightIcon weight="fill" className="size-[14px]" />
        </Button>
      </IconTooltip>
    );
  }

  if (isLoading) {
    return (
      <IconTooltip label={t("composer.stop")}>
        <Button
          type="button"
          size="icon"
          className={cn(
            "rounded-full border border-red-500/20 bg-red-500/10 p-0 text-red-500 shadow-none hover:bg-red-500/20",
            sizeClass,
          )}
          onClick={onStop}
          aria-label={t("composer.stop")}
        >
          <StopIcon weight="fill" className="size-[14px]" />
        </Button>
      </IconTooltip>
    );
  }

  return (
    <IconTooltip
      label={`${t("composer.send")} · ${t("composer.voice.modifierHint")}`}
    >
      <Button
        type="submit"
        size="icon"
        disabled={isProcessingFiles}
        className={cn("rounded-full p-0", sizeClass)}
        aria-label={t("composer.send")}
      >
        {isProcessingFiles ? (
          <CircleNotchIcon className="size-[15px] animate-spin" />
        ) : (
          <PaperPlaneRightIcon weight="fill" className="size-[14px]" />
        )}
      </Button>
    </IconTooltip>
  );
}
