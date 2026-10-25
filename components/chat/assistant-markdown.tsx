/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import ReactMarkdown from "react-markdown";
import type { Components, Options } from "react-markdown";
import { cn } from "@/lib/utils";
import {
  assistantMarkdownClass,
  markdownOverflowClass,
  thinkingMarkdownClass,
} from "@/lib/chat/message-prose";
import type { WebSearchSource } from "@/lib/web-search/types";
import { WebSearchBrandMark } from "@/components/web-search/web-search-brand-mark";

type AssistantMarkdownProps = {
  content: string;
  variant: "answer" | "thinking";
  remarkPlugins: Options["remarkPlugins"];
  rehypePlugins: Options["rehypePlugins"];
  components: Components;
  preprocess?: (text: string) => string;
  className?: string;
  sources?: WebSearchSource[];
};

export function AssistantMarkdown({
  content,
  variant,
  remarkPlugins,
  rehypePlugins,
  components,
  preprocess,
  className,
  sources = [],
}: AssistantMarkdownProps) {
  const trimmed = content?.trim();
  if (!trimmed) return null;

  const source = preprocess ? preprocess(trimmed) : trimmed;
  const sourceByHref = new Map(
    sources.map((item) => [normalizeHref(item.href), item] as const),
  );
  const markdownComponents: Components = {
    ...components,
    a: ({ href, children, node, ...props }) => {
      void node;
      const result = href ? sourceByHref.get(normalizeHref(href)) : undefined;
      if (!result) {
        const Anchor = components.a as
          | React.ComponentType<React.ComponentProps<"a">>
          | undefined;
        return Anchor ? (
          <Anchor href={href} {...props}>
            {children}
          </Anchor>
        ) : (
          <a href={href} {...props}>
            {children}
          </a>
        );
      }
      return (
        <a
          href={result.href}
          target="_blank"
          rel="noopener noreferrer"
          title={`${result.title} · ${result.domain}`}
          className="my-0.5 inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/60 bg-muted/35 px-1.5 py-0.5 align-baseline text-sm text-foreground no-underline transition-colors hover:bg-muted/70 hover:underline"
        >
          <WebSearchBrandMark
            brand={result.brand}
            domain={result.domain}
            className="size-4"
          />
          <span className="max-w-[24rem] truncate">
            {children || result.title}
          </span>
          <span className="max-w-[9rem] shrink-0 truncate text-xs text-muted-foreground">
            {result.domain}
          </span>
        </a>
      );
    },
  };

  return (
    <div
      className={cn(
        variant === "thinking" ? thinkingMarkdownClass : assistantMarkdownClass,
        markdownOverflowClass,
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={markdownComponents}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}

function normalizeHref(href: string): string {
  try {
    const url = new URL(href);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    url.hash = "";
    return url.href.replace(/\/$/, "");
  } catch {
    return "";
  }
}
