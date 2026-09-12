/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { useSettingsModal } from "@/contexts/settings-modal-context";
import { useTranslation } from "@/hooks/use-translation";

/**
 * Application-level settings dialog. Portals above the app shell so chat /
 * arena stay mounted underneath (no remount / refresh on close).
 */
export function SettingsModal() {
  const { t } = useTranslation();
  const { isOpen, section, closeSettings, setSection } = useSettingsModal();

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeSettings();
      }}
    >
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/40 backdrop-blur-[2px]"
        className="flex h-[min(620px,calc(100dvh-1rem))] w-[min(840px,calc(100vw-1rem))] max-w-[min(840px,calc(100vw-1rem))] translate-x-[-50%] translate-y-[-50%] gap-0 overflow-hidden rounded-2xl border border-border/60 bg-background p-0 shadow-[0_16px_64px_-16px_rgba(0,0,0,0.28)] max-sm:h-[min(720px,calc(100dvh-0.75rem))] sm:max-w-[min(840px,calc(100vw-1.5rem))]"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement).focus();
        }}
      >
        <DialogTitle className="sr-only">{t("settings.title")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("settings.subtitle")}
        </DialogDescription>
        <SettingsPanel
          variant="modal"
          initialSection={section}
          onSectionChange={setSection}
          onClose={closeSettings}
        />
      </DialogContent>
    </Dialog>
  );
}
