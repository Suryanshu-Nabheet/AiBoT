/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import React, { isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { Components, Options } from "react-markdown";
import { cn } from "@/lib/utils";
import {
  assistantMarkdownClass,
  markdownOverflowClass,
  thinkingMarkdownClass,
} from "@/lib/chat/message-prose";
import type { WebSearchSource } from "@/lib/web-search/types";
import { ExternalSourceLink } from "@/components/web-search/external-source-link";

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
    p: ({ children, node, ...props }) => {
      void node;
      const Paragraph = components.p as
        | React.ComponentType<
            React.HTMLAttributes<HTMLParagraphElement> & {
              children?: ReactNode;
            }
          >
        | undefined;
      const cleanChildren = removeLinkWrappingParentheses(children);
      return Paragraph ? (
        <Paragraph {...props}>{cleanChildren}</Paragraph>
      ) : (
        <p {...props}>{cleanChildren}</p>
      );
    },
    a: ({ href, children, node, ...props }) => {
      void node;
      const normalizedHref = href ? normalizeHref(href) : "";
      if (!normalizedHref) {
        const Anchor = components.a as
          | React.ComponentType<
              React.AnchorHTMLAttributes<HTMLAnchorElement> & {
                children?: ReactNode;
              }
            >
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
      const result = sourceByHref.get(normalizedHref);
      void props;
      return (
        <ExternalSourceLink href={normalizedHref} source={result}>
          {children}
        </ExternalSourceLink>
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

function removeLinkWrappingParentheses(children: ReactNode): ReactNode {
  const nodes = React.Children.toArray(children);
  for (let index = 0; index < nodes.length; index += 1) {
    const current = nodes[index];
    if (!isValidElement(current)) continue;
    const props = current.props as { href?: unknown };
    const linkElement =
      current.type === "a" ||
      current.type === ExternalSourceLink ||
      (typeof props.href === "string" && Boolean(normalizeHref(props.href)));
    if (!linkElement) continue;

    const previous = nodes[index - 1];
    const next = nodes[index + 1];
    if (typeof previous === "string" && /\(\s*$/.test(previous)) {
      nodes[index - 1] = previous.replace(/\(\s*$/, "");
    }
    if (typeof next === "string" && /^\s*\)/.test(next)) {
      nodes[index + 1] = next.replace(/^\s*\)/, "");
    }
  }
  return nodes;
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
