/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { GlobeIcon, X as XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export type WebSearchPromptBarProps = {
  query?: string;
  onSearch: () => void;
  onSkip?: () => void;
  className?: string;
};

export function WebSearchPromptBar({
  query,
  onSearch,
  onSkip,
  className,
}: WebSearchPromptBarProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className={cn(
        "relative my-2.5 flex w-full flex-col overflow-hidden rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2 text-left shadow-xs transition-colors backdrop-blur-xs",
        className,
      )}
    >
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <GlobeIcon className="size-4 shrink-0 text-muted-foreground animate-pulse" />
          <div className="flex items-center gap-2 text-sm text-foreground truncate">
            <span className="font-medium text-xs sm:text-sm shrink-0">
              {t("chat.webSearch.promptLabel") || "Web search requested"}
            </span>
            {query && (
              <span className="truncate max-w-[140px] sm:max-w-[240px] text-xs text-muted-foreground font-normal">
                &quot;{query}&quot;
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            size="sm"
            onClick={onSearch}
            className="h-7.5 rounded-full bg-foreground text-background hover:bg-foreground/90 px-3.5 text-xs font-medium shadow-xs transition-all cursor-pointer"
          >
            <GlobeIcon className="size-3.5 mr-1.5" />
            {t("chat.webSearch.searchAction") || "Search Web"}
          </Button>
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              aria-label={t("chat.webSearch.skipAction") || "Skip web search"}
              className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
