"use client";

import { motion } from "framer-motion";
import { GlobeIcon } from "@phosphor-icons/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TextShimmer } from "@/components/core/text-shimmer";
import type { WebSearchSource } from "@/lib/web-search/types";
import { WebSearchSourceStack } from "./web-search-stack";

type WebSearchBarProps = {
  label: string;
  meta?: string;
  isExpanded: boolean;
  onClick?: () => void;
  shimmerLabel?: boolean;
  previewSources?: WebSearchSource[];
  className?: string;
};

const rowClassBase =
  "group flex w-full items-center justify-between gap-3 rounded-md border-0 bg-transparent py-2 text-left shadow-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function WebSearchBar({
  label,
  meta,
  isExpanded,
  onClick,
  shimmerLabel = false,
  previewSources = [],
  className,
}: WebSearchBarProps) {
  const displayText = meta ? `${label} · ${meta}` : label;

  const labelText = shimmerLabel ? (
    <TextShimmer className="text-sm font-medium" duration={1.2}>
      {displayText}
    </TextShimmer>
  ) : (
    <span className="text-sm font-medium text-foreground">
      {label}
      {meta ? <span className="text-muted-foreground"> · {meta}</span> : null}
    </span>
  );

  const rowClass = cn(
    rowClassBase,
    onClick && "cursor-pointer transition-colors hover:bg-muted/40",
    className,
  );

  const labelRow = (
    <span className="flex min-w-0 items-center gap-2">
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center text-muted-foreground transition-colors group-hover:text-foreground/80",
          (shimmerLabel || isExpanded || !onClick) && "text-foreground",
        )}
        aria-hidden
      >
        <GlobeIcon className="size-3.5" weight="bold" />
      </span>
      <span className="min-w-0 truncate">{labelText}</span>
    </span>
  );

  const chevron = onClick ? (
    <motion.span
      animate={{ rotate: isExpanded ? 180 : 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="shrink-0 text-muted-foreground/70"
    >
      <ChevronDown className="h-4 w-4" aria-hidden />
    </motion.span>
  ) : null;

  const trailing =
    !isExpanded && previewSources.length > 0 ? (
      <span className="flex shrink-0 items-center gap-2">
        <WebSearchSourceStack
          sources={previewSources}
          max={4}
          className="hidden sm:inline-flex"
        />
        {chevron}
      </span>
    ) : (
      chevron
    );

  if (!onClick) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={rowClass}
      >
        {labelRow}
      </motion.div>
    );
  }

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClick}
      className={rowClass}
      aria-expanded={isExpanded}
    >
      {labelRow}
      {trailing}
    </motion.button>
  );
}
