"use client";

import { cn } from "@/lib/utils";
import type { WebSearchSource } from "@/lib/web-search/types";
import { WebSearchBrandMark } from "./web-search-brand-mark";

const MARK_SIZE = 16;
const OVERLAP = 5;

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

  const width =
    MARK_SIZE + Math.max(0, slice.length - 1) * (MARK_SIZE - OVERLAP);

  return (
    <span
      className={cn("relative inline-flex h-4 shrink-0 items-center", className)}
      style={{ width }}
      aria-hidden
    >
      {slice.map((source, index) => (
        <span
          key={source.href || `${source.domain}-${index}`}
          className="absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full bg-background"
          style={{
            left: index * (MARK_SIZE - OVERLAP),
            width: MARK_SIZE,
            height: MARK_SIZE,
            zIndex: slice.length - index,
          }}
        >
          <WebSearchBrandMark
            brand={source.brand}
            domain={source.domain}
            className="size-4 ring-1 ring-background"
          />
        </span>
      ))}
    </span>
  );
}
