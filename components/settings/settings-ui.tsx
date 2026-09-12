/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SettingsPageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-6 space-y-1">
      <h3 className="text-[17px] font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      {description ? (
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </header>
  );
}

export function SettingsSectionLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "mb-2 px-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Grouped card — rows divide with hairlines. */
export function SettingsCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/60 bg-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SettingsRow({
  label,
  description,
  icon,
  children,
}: {
  label: string;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-4 border-b border-border/40 px-3.5 py-3 last:border-b-0 sm:px-4">
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 space-y-0.5">
          <p className="text-[13px] font-medium leading-snug text-foreground">
            {label}
          </p>
          {description ? (
            <p className="text-[12px] leading-snug text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export const settingsControlClass =
  "h-8 cursor-pointer rounded-lg border border-border/60 bg-background px-2.5 text-[12px] font-medium text-foreground outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/40";
