"use client";

import {
  CaretDownIcon,
  PaperclipIcon,
  PaperPlaneRightIcon,
  X as XIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { useTranslation } from "@/hooks/use-translation";
import type { QueuedPrompt } from "@/hooks/use-prompt-queue";

export function PromptQueue({
  items,
  onRemove,
  onSendNow,
}: {
  items: QueuedPrompt[];
  onRemove: (id: string) => void;
  onSendNow?: (item: QueuedPrompt) => void;
}) {
  const { t } = useTranslation();
  const [expandedByUser, setExpandedByUser] = useState<boolean | null>(null);
  const expanded = expandedByUser ?? items.length < 2;
  if (items.length === 0) return null;

  const describeItem = (item: QueuedPrompt) => {
    const text = item.prompt.trim();
    if (text) return text;
    if (item.attachments.length === 1) return item.attachments[0].name;
    return `${item.attachments.length} files`;
  };

  return (
    <section
      aria-label={t("composer.queue.title")}
      aria-live="polite"
      className="w-full overflow-hidden"
      data-testid="prompt-queue"
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
        aria-expanded={expanded}
        onClick={() => setExpandedByUser(!expanded)}
      >
        <CaretDownIcon
          className={`size-3.5 transition-transform ${expanded ? "" : "-rotate-90"}`}
        />
        {t("composer.queue.title")} · {items.length}
      </button>
      {expanded && (
        <ol className="divide-y divide-border/50">
          {items.map((item, index) => {
            const label = describeItem(item);
            return (
            <li
              key={item.id}
              className="group flex min-w-0 items-center gap-2 px-3 py-2 text-sm"
            >
              <span className="shrink-0 text-xs text-muted-foreground">
                {index + 1}.
              </span>
              {item.attachments.length > 0 && (
                <PaperclipIcon
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              )}
              <span className="min-w-0 flex-1 truncate">{label}</span>
              {onSendNow && (
                <button
                  type="button"
                  onClick={() => onSendNow(item)}
                  aria-label={`${t("composer.sendNow")}: ${label}`}
                  title={t("composer.sendNow")}
                  className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-opacity hover:bg-background hover:text-foreground focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                >
                  {t("composer.sendNow")}
                  <PaperPlaneRightIcon className="size-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={`${t("composer.queue.remove")}: ${label}`}
                title={t("composer.queue.remove")}
                className="shrink-0 rounded-md p-1 text-muted-foreground transition-opacity hover:bg-background hover:text-foreground focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
              >
                <XIcon className="size-4" />
              </button>
            </li>
          );
          })}
        </ol>
      )}
    </section>
  );
}
