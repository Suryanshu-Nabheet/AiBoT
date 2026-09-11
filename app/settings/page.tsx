/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { SettingsPanel } from "@/components/settings/settings-panel";
import { PageShell, PageViewSlot } from "@/components/layout/page-shell";

export default function SettingsPage() {
  return (
    <PageShell>
      <div className="relative min-h-0 flex-1">
        <PageViewSlot>
          <SettingsPanel />
        </PageViewSlot>
      </div>
    </PageShell>
  );
}
