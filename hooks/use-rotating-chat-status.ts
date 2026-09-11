"use client";

import { useEffect, useState } from "react";
import type { TranslationKey } from "@/lib/i18n";

type Translate = (key: TranslationKey) => string;

/** Cycling status line while a response is streaming (direct chat + arena lanes). */
export function useRotatingChatStatus(
  isLoading: boolean,
  isThinking: boolean,
  t: Translate,
) {
  const [loadingStatus, setLoadingStatus] = useState(() =>
    isThinking ? t("chat.status.thinking") : t("chat.status.generating"),
  );

  useEffect(() => {
    if (!isLoading) {
      setLoadingStatus(
        isThinking ? t("chat.status.thinking") : t("chat.status.generating"),
      );
      return;
    }

    const thinkingStatuses = [
      t("chat.status.thinking"),
      t("chat.status.reasoningQuery"),
      t("chat.status.analyzing"),
      t("chat.status.crafting"),
      t("chat.status.polishing"),
    ];

    const normalStatuses = [
      t("chat.status.generating"),
      t("chat.status.writing"),
      t("chat.status.analyzing"),
      t("chat.status.crafting"),
      t("chat.status.polishing"),
    ];

    const statuses = isThinking ? thinkingStatuses : normalStatuses;

    let i = 0;
    setLoadingStatus(statuses[0]);
    const interval = setInterval(() => {
      i = (i + 1) % statuses.length;
      setLoadingStatus(statuses[i]);
    }, 2000);

    return () => clearInterval(interval);
  }, [isLoading, isThinking, t]);

  return loadingStatus;
}
