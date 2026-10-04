"use client";

import { cn } from "@/lib/utils";
import type { WebSearchSource } from "@/lib/web-search/types";
import { WebSearchBrandMark } from "./web-search-brand-mark";

export function WebSearchSourceStack({
  sources,
  max = 4,
  className,
}: {
  sources: WebSearchSource[];
  max?: number;
  className?: string;
}) {
  const slice = sources.slice(0, max);
  if (!slice.length) return null;

  return (
    <span
      className={cn("inline-flex shrink-0 items-center pl-0.5", className)}
      aria-hidden
    >
      {slice.map((source, index) => (
        <span
          key={source.href || `${source.domain}-${index}`}
          className={cn(
            "relative inline-flex shrink-0 rounded-full bg-background",
            index > 0 && "-ml-1.5",
          )}
          style={{ zIndex: slice.length - index }}
        >
          <WebSearchBrandMark
            brand={source.brand}
            domain={source.domain}
            className="size-4 ring-2 ring-background"
          />
        </span>
      ))}
    </span>
  );
}
