"use client";

import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { brandFromDomain, domainFromUrl } from "@/lib/web-search/brand";
import type { WebSearchSource } from "@/lib/web-search/types";
import { WebSearchBrandMark } from "./web-search-brand-mark";

type ExternalSourceLinkProps = {
  href?: string;
  children?: ReactNode;
  source?: WebSearchSource;
  variant?: "inline" | "row";
  className?: string;
};

/** A single safe, branded link treatment shared by answers and search sources. */
export function ExternalSourceLink({
  href,
  children,
  source,
  variant = "inline",
  className,
}: ExternalSourceLinkProps) {
  const url = getHttpUrl(source?.href ?? href);
  if (!url) return null;

  const domain = source?.domain || domainFromUrl(url);
  const label = getLinkLabel(children, source?.title, url, domain);
  const row = variant === "row";

  return (
    <a
      data-source-link={variant}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${label} · ${domain}`}
      aria-label={`${label} (${domain}), opens in a new tab`}
      className={cn(
        row
          ? "group flex min-w-0 items-center gap-2.5 rounded-md py-1.5 transition-colors hover:bg-muted/35"
          : "my-0.5 inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-lg border border-border/60 bg-muted/35 px-2 py-1 align-baseline text-sm text-foreground no-underline transition-colors hover:bg-muted/70",
        className,
      )}
    >
      <WebSearchBrandMark
        brand={source?.brand ?? brandFromDomain(domain)}
        domain={domain}
        className={cn("size-4", row && "size-[18px] ring-1 ring-border/25")}
      />
      <span
        className={cn(
          "min-w-0 truncate",
          row
            ? "flex-1 text-[13px] font-medium text-foreground/90 group-hover:text-foreground"
            : "max-w-[24rem] text-foreground",
        )}
      >
        {label}
      </span>
      {row ? (
        <span className="hidden max-w-[38%] shrink-0 truncate text-[11px] text-muted-foreground sm:block">
          {domain}
        </span>
      ) : (
        <>
          {label !== domain ? (
            <>
              <span className="shrink-0 text-muted-foreground/70" aria-hidden>
                ·
              </span>
              <span className="max-w-[9rem] shrink-0 truncate text-xs text-muted-foreground">
                {domain}
              </span>
            </>
          ) : null}
          <ArrowUpRight
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </>
      )}
    </a>
  );
}

function getHttpUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:")
      return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function getLinkLabel(
  children: ReactNode,
  sourceTitle: string | undefined,
  href: string,
  domain: string,
): ReactNode {
  if (typeof children === "string" && children.trim()) {
    const text = children.trim();
    if (isUrlLabel(text, href)) return sourceTitle || domain;
    return text;
  }
  if (typeof children === "number") return children;
  return sourceTitle || domain;
}

function isUrlLabel(label: string, href: string): boolean {
  if (/^https?:\/\//i.test(label)) {
    try {
      return new URL(label).href.replace(/\/$/, "") === href.replace(/\/$/, "");
    } catch {
      return true;
    }
  }
  return false;
}
