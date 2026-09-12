/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import Link from "next/link";
import { useTranslation } from "@/hooks/use-translation";
import type { ChatErrorCode } from "@/lib/chat/chat-error";
import { cn } from "@/lib/utils";

type ChatErrorBannerProps = {
  body: string;
  code?: ChatErrorCode;
  className?: string;
};

export function ChatErrorBanner({
  body,
  code,
  className,
}: ChatErrorBannerProps) {
  const { t } = useTranslation();
  const showSettings =
    code === "byok_key_required" || code === "byok_invalid_key";

  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-[13px] leading-snug text-muted-foreground",
        className,
      )}
    >
      <p>{body}</p>
      {showSettings && (
        <Link
          href="/settings"
          className="mt-1.5 inline-block text-xs font-medium text-foreground underline-offset-2 hover:underline"
        >
          {t("errors.chat.action.settings")}
        </Link>
      )}
    </div>
  );
}
