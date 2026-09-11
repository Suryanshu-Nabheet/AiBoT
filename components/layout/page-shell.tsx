/**
 * Shared full-height page layout for App Router views inside AppFrame.
 * Keeps flex + overflow behavior consistent across chat, agents, and settings.
 */

import { cn } from "@/lib/utils";

export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Scrollable main column (messages, settings content, agent forms). */
export function PageScrollRegion({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Slot for AnimatePresence / view-mode switches so each view fills the shell. */
export function PageViewSlot({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex min-h-0 w-full max-w-full flex-col overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}
