import { cn } from "@/lib/utils";

export type ComposerDock = "bottom" | "center";
export type ComposerDensity = "hero" | "thread";
export type ComposerLayoutContext = "chat" | "arena";

export function resolveComposerDensity(
  dock: ComposerDock,
  compact: boolean,
): ComposerDensity {
  if (dock === "bottom" && compact) return "thread";
  return "hero";
}

export function composerSurfaceClassName(
  density: ComposerDensity,
  hasQueuedInThread: boolean,
  layoutContext: ComposerLayoutContext = "chat",
) {
  const threadMaxWidth =
    layoutContext === "arena" ? "max-w-[min(100%,56rem)]" : "max-w-3xl";
  return cn(
    "mx-auto w-full",
    density === "thread" ? threadMaxWidth : "max-w-4xl",
    hasQueuedInThread &&
      "overflow-hidden rounded-2xl border border-border/50 bg-muted/40",
  );
}

export function composerFormClassName(
  density: ComposerDensity,
  hasQueuedInThread: boolean,
  hasAttachments: boolean,
) {
  const isThread = density === "thread";
  return cn(
    "relative flex w-full max-w-full min-w-0 overflow-hidden",
    isThread
      ? cn(
          "flex-col transition-[border-radius] duration-200",
          hasQueuedInThread
            ? "rounded-none border-0 bg-transparent"
            : "rounded-full border border-border/50 bg-muted/40",
          hasAttachments && "rounded-3xl",
        )
      : "flex-col gap-0 rounded-2xl border border-border/50 bg-muted/40 sm:rounded-3xl",
  );
}

export function composerDockShellClassName(
  dock: ComposerDock,
  layoutContext: ComposerLayoutContext = "chat",
) {
  if (dock !== "bottom") return "px-0 pb-0 pt-0";

  const isArena = layoutContext === "arena";
  return cn(
    "bg-gradient-to-t from-background via-background to-transparent",
    isArena
      ? "px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 sm:px-3 sm:pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pt-2"
      : "px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))] sm:pt-4 md:pt-6",
  );
}
