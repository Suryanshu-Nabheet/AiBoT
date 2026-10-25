/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { Brain, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

export function ThinkingModePromptBar({
  reason,
  onEnable,
  onContinue,
  className,
}: {
  reason?: string;
  onEnable: () => void;
  onContinue: () => void;
  className?: string;
}) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "relative my-2.5 flex w-full flex-col overflow-hidden rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2 text-left shadow-xs",
        className,
      )}
    >
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Brain
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground sm:text-sm">
              {t("chat.thinking.promptLabel")}
            </p>
            {reason ? (
              <p className="text-xs text-muted-foreground">{reason}</p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={onEnable}
            className="h-7.5 rounded-full bg-foreground px-3.5 text-xs font-medium text-background shadow-xs hover:bg-foreground/90"
          >
            <Brain className="mr-1.5 size-3.5" aria-hidden="true" />
            {t("chat.thinking.enableAction")}
          </Button>
          <button
            type="button"
            onClick={onContinue}
            aria-label={t("chat.thinking.continueWithoutAction")}
            className="inline-flex min-h-8 items-center gap-1 rounded-full px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden="true" />
            <span>{t("chat.thinking.continueWithoutAction")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
