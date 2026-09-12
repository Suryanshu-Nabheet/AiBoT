/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSettingsModal } from "@/contexts/settings-modal-context";

/**
 * Legacy /settings route — opens the modal over the previous experience
 * and returns home so chat state is never wiped by a full-page settings view.
 */
export default function SettingsPage() {
  const router = useRouter();
  const { openSettings } = useSettingsModal();

  useEffect(() => {
    openSettings();
    router.replace("/");
  }, [openSettings, router]);

  return null;
}
