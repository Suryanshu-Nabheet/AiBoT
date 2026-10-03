"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  WebSearchSource,
  WebSearchStep,
  WebSearchTrace,
} from "@/lib/web-search/types";
import { useTranslation } from "@/hooks/use-translation";
import { WebSearchBrandMark } from "./web-search-brand-mark";
import { WebSearchBar } from "./web-search-bar";

const INITIAL_SOURCES_VISIBLE = 4;
const PANEL_RAIL =
  "mb-0.5 border-l-2 border-border/55 py-1.5 pl-3 sm:pl-3.5";
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

function collectSources(steps: WebSearchStep[]): WebSearchSource[] {
  const seen = new Set<string>();
  const out: WebSearchSource[] = [];
  for (const step of steps) {
    if (step.kind !== "query" || !step.sources) continue;
    for (const source of step.sources) {
      const key = source.href || source.domain;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(source);
    }
  }
  return out;
}

function Collapse({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
      aria-hidden={!open}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

function QueryChip({ query }: { query: string }) {
  return (
    <span
      className="inline-flex max-w-full items-center rounded-md bg-muted/60 px-2 py-0.5 font-mono text-[12px] font-medium text-foreground ring-1 ring-border/30"
    >
      {query}
    </span>
  );
}

function SourceRow({ source }: { source: WebSearchSource }) {
  return (
    <li className="min-w-0">
      <a
        href={source.href}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-2.5 rounded-md py-1.5 transition-colors hover:bg-muted/35"
      >
        <WebSearchBrandMark
          brand={source.brand}
          domain={source.domain}
          className="size-[18px] shrink-0 ring-1 ring-border/25"
        />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground/90 group-hover:text-foreground">
          {source.title}
        </span>
        <span className="hidden max-w-[38%] shrink-0 truncate text-[11px] text-muted-foreground sm:block">
          {source.domain}
        </span>
      </a>
    </li>
  );
}

function SourcesPanel({ sources }: { sources: WebSearchSource[] }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);

  if (!sources.length) return null;

  const visible = showAll
    ? sources
    : sources.slice(0, INITIAL_SOURCES_VISIBLE);
  const hiddenCount = sources.length - INITIAL_SOURCES_VISIBLE;

  return (
    <div className="mt-3 border-t border-border/40 pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        aria-expanded={open}
      >
        {t("chat.webSearch.sources")}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className="inline-flex"
        >
          <ChevronDown className="size-3.5 opacity-70" aria-hidden />
        </motion.span>
      </button>
      <Collapse open={open}>
        <ul className="mt-1 list-none">
          {visible.map((source, i) => (
            <SourceRow
              key={source.href || `${source.domain}-${i}`}
              source={source}
            />
          ))}
          {hiddenCount > 0 && (
            <li className="pt-0.5">
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {showAll
                  ? t("chat.webSearch.showLess")
                  : t("chat.webSearch.showMore", { count: hiddenCount })}
              </button>
            </li>
          )}
        </ul>
      </Collapse>
    </div>
  );
}

function QueryStepBlock({
  step,
}: {
  step: Extract<WebSearchStep, { kind: "query" }>;
}) {
  return (
    <div className="space-y-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1.5">
          <span className="text-sm text-muted-foreground">{step.label}</span>
          {step.query ? <QueryChip query={step.query} /> : null}
        </div>
        {step.meta ? (
          <span className="shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">
            {step.meta}
          </span>
        ) : null}
      </div>
      {step.sources?.length ? <SourcesPanel sources={step.sources} /> : null}
    </div>
  );
}

export function WebSearch({
  trace,
  className,
}: {
  trace: WebSearchTrace;
  className?: string;
}) {
  const { t } = useTranslation();
  const [detailsOpen, setDetailsOpen] = useState(true);

  useEffect(() => {
    if (trace.status === "running") setDetailsOpen(true);
  }, [trace.status]);

  const summaryStep = trace.steps.find((s) => s.kind === "summary");
  const querySteps = trace.steps.filter(
    (s): s is Extract<WebSearchStep, { kind: "query" }> => s.kind === "query",
  );
  const previewSources = useMemo(
    () => collectSources(trace.steps),
    [trace.steps],
  );

  if (!trace.steps.length) return null;

  const headerLabel = summaryStep?.label ?? t("chat.webSearch.label");
  const headerMeta = summaryStep?.meta;
  const hasDetails = querySteps.length > 0;
  const isRunning = trace.status === "running";
  const showBody = detailsOpen && hasDetails;

  return (
    <div
      data-testid="web-search-trace"
      aria-label={t("chat.webSearch.label")}
      className={cn("w-full max-w-full", className)}
    >
      <WebSearchBar
        label={headerLabel}
        meta={headerMeta}
        isExpanded={detailsOpen}
        onClick={hasDetails ? () => setDetailsOpen((v) => !v) : undefined}
        shimmerLabel={isRunning}
        previewSources={previewSources}
      />

      <Collapse open={showBody}>
        <div className={cn(PANEL_RAIL, querySteps.length > 1 && "space-y-5")}>
          {querySteps.map((step, i) => (
            <QueryStepBlock key={`${step.query}-${i}`} step={step} />
          ))}
          {trace.status === "error" && trace.errorMessage ? (
            <p className="text-xs text-destructive">{trace.errorMessage}</p>
          ) : null}
        </div>
      </Collapse>
    </div>
  );
}
