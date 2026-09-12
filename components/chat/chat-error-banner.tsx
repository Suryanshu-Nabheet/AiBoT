/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import Link from "next/link";
import { WarningCircleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import type { ChatErrorCode } from "@/lib/chat/chat-error";
import { cn } from "@/lib/utils";

type ChatErrorBannerProps = {
  title: string;
  body: string;
  code?: ChatErrorCode;
  className?: string;
};

export function ChatErrorBanner({
  title,
  body,
  code,
  className,
}: ChatErrorBannerProps) {
  const { t } = useTranslation();
  const showSettings =
    code === "missing_api_key" || code === "auth" || code === "validation";

  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3.5 text-sm shadow-sm",
        className,
      )}
    >
      <WarningCircleIcon
        className="mt-0.5 size-5 shrink-0 text-destructive"
        aria-hidden
      />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="font-semibold leading-snug text-foreground">{title}</p>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {body}
        </p>
        {showSettings && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2 h-8 border-destructive/20 bg-background/80 text-xs"
            asChild
          >
            <Link href="/settings">{t("errors.chat.action.settings")}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
