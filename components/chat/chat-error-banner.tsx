/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { useTranslation } from "@/hooks/use-translation";
import type { ChatErrorCode } from "@/lib/chat/chat-error";
import { useSettingsModal } from "@/contexts/settings-modal-context";
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
  const { openSettings } = useSettingsModal();
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
        <button
          type="button"
          onClick={() => openSettings("api-keys")}
          className="mt-1.5 inline-block text-xs font-medium text-foreground underline-offset-2 hover:underline"
        >
          {t("errors.chat.action.settings")}
        </button>
      )}
    </div>
  );
}
