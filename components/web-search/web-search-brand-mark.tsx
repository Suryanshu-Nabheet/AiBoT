"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import type { CSSProperties } from "react";
import { GlobeIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { WebSearchBrand } from "@/lib/web-search/types";
import { faviconUrlForDomain } from "@/lib/web-search/favicon";

const brandFallback: Record<
  WebSearchBrand,
  { label: string; className: string }
> = {
  reddit: {
    label: "R",
    className: "bg-[#FF4500] text-white",
  },
  x: {
    label: "𝕏",
    className: "bg-foreground text-background",
  },
  github: {
    label: "GH",
    className: "bg-[#24292f] text-white dark:bg-[#f0f6fc] dark:text-[#24292f]",
  },
  youtube: {
    label: "▶",
    className: "bg-[#FF0000] text-white",
  },
  wikipedia: {
    label: "W",
    className: "bg-muted text-foreground ring-1 ring-border/60",
  },
  stackoverflow: {
    label: "{}",
    className: "bg-[#F48024] text-white",
  },
  generic: {
    label: "·",
    className: "bg-muted text-muted-foreground ring-1 ring-border/50",
  },
};

function FallbackMark({
  brand,
  className,
  style,
}: {
  brand: WebSearchBrand;
  className?: string;
  style?: CSSProperties;
}) {
  const fallback = brandFallback[brand];
  return (
    <span
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold leading-none",
        fallback.className,
        className,
      )}
      style={style}
      aria-hidden
    >
      {brand === "generic" ? (
        <GlobeIcon className="size-3" weight="bold" />
      ) : (
        fallback.label
      )}
    </span>
  );
}

export function WebSearchBrandMark({
  brand,
  domain,
  className,
  style,
}: {
  brand: WebSearchBrand;
  domain?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const [failed, setFailed] = useState(false);

  if (!domain || failed) {
    return <FallbackMark brand={brand} className={className} style={style} />;
  }

  return (
    <img
      src={faviconUrlForDomain(domain)}
      alt=""
      width={20}
      height={20}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn(
        "block size-5 shrink-0 rounded-full bg-muted/50 object-cover ring-1 ring-border/40",
        className,
      )}
      style={style}
    />
  );
}
