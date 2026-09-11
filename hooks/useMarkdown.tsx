/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  ClipboardTextIcon,
  ArrowsLeftRightIcon,
  CheckIcon,
} from "@phosphor-icons/react";
import { WrapText } from "lucide-react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { cn } from "@/lib/utils";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { preprocessAssistantMarkdown } from "@/lib/chat/markdown-preprocess";

interface UseMarkdownOptions {
  onCopy?: (content: string) => void;
  copied?: boolean;
  isWrapped?: boolean;
  toggleWrap?: () => void;
  resolvedTheme?: string;
  geistMono?: any;
}

export const useMarkdown = (options: UseMarkdownOptions = {}) => {
  const {
    onCopy,
    copied = false,
    isWrapped = false,
    toggleWrap,
    resolvedTheme,
    geistMono,
  } = options;

  // Preprocessing function
  const preprocessMarkdown = useMemo(
    () => (text: string) => preprocessAssistantMarkdown(text),
    [],
  );

  // Markdown components
  const markdownComponents = useMemo(
    () => ({
      // Headers
      h1: ({ children }: any) => (
        <h1 className="text-lg font-bold mt-4 mb-2 text-inherit border-b border-border pb-1.5 first:mt-0">
          {children}
        </h1>
      ),
      h2: ({ children }: any) => (
        <h2 className="text-base font-semibold mt-4 mb-2 text-inherit first:mt-0">
          {children}
        </h2>
      ),
      h3: ({ children }: any) => (
        <h3 className="text-sm font-semibold mt-3 mb-1.5 text-inherit first:mt-0">
          {children}
        </h3>
      ),
      h4: ({ children }: any) => (
        <h4 className="text-sm font-medium mt-2 mb-1 text-inherit">{children}</h4>
      ),

      // Paragraphs
      p: ({ children }: any) => (
        <p className="mb-2 text-sm last:mb-0 leading-[1.65] text-inherit">
          {children}
        </p>
      ),

      // Lists
      ul: ({ children }: any) => (
        <ul className="mb-2.5 ml-0 list-disc space-y-1.5 pl-5 text-inherit marker:text-muted-foreground">
          {children}
        </ul>
      ),
      ol: ({ children }: any) => (
        <ol className="mb-2.5 ml-0 list-decimal space-y-2 pl-5 text-inherit marker:font-medium marker:text-muted-foreground">
          {children}
        </ol>
      ),
      li: ({ children }: any) => (
        <li className="pl-0.5 text-sm leading-[1.65] text-inherit [&>p]:mb-1 [&>p]:last:mb-0 [&>p]:text-sm">
          {children}
        </li>
      ),

      // Blockquotes
      blockquote: ({ children }: any) => (
        <blockquote className="border-l-2 border-border pl-3 py-1 my-3 bg-muted/30 rounded-r-lg italic text-muted-foreground">
          {children}
        </blockquote>
      ),

      // Code blocks
      code(props: any) {
        const { children, className, ...rest } = props;
        const match = /language-(\w+)/.exec(className ?? "");
        const isInline = !match;
        const codeContent = String(children).replace(/\n$/, "");

        const copyCode = async () => {
          try {
            await navigator.clipboard.writeText(codeContent);
            onCopy?.(codeContent);
          } catch (err) {
            console.error("Failed to copy code:", err);
          }
        };

        return isInline ? (
          <code
            className={cn(
              "bg-muted text-muted-foreground rounded-md px-1 py-0.5 text-xs font-mono border",
              className,
            )}
            {...rest}
          >
            {children}
          </code>
        ) : (
          <div className="my-4 overflow-hidden rounded-lg border border-border bg-muted/30">
            <div className="flex items-center justify-between bg-muted/50 px-3 py-1.5 text-xs border-b border-border">
              <span className="font-medium text-muted-foreground">
                {match ? match[1] : "text"}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyCode}
                  className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors rounded-sm"
                  title={copied ? "Copied!" : "Copy code"}
                >
                  {copied ? (
                    <CheckIcon className="h-3.5 w-3.5" />
                  ) : (
                    <ClipboardTextIcon className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
            <SyntaxHighlighter
              language={match ? match[1] : "text"}
              style={atomOneDark}
              customStyle={{
                margin: 0,
                padding: "0.75rem",
                backgroundColor: "transparent",
                fontSize: "0.75rem",
                lineHeight: "1.4",
              }}
              wrapLongLines={isWrapped}
            >
              {codeContent}
            </SyntaxHighlighter>
          </div>
        );
      },

      // Text styling
      strong: ({ children }: any) => (
        <strong className="font-semibold text-foreground text-sm">
          {children}
        </strong>
      ),
      em: ({ children }: any) => (
        <em className="italic text-foreground text-sm">{children}</em>
      ),

      // Links
      a: ({ href, children }: any) => (
        <a
          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors font-medium text-sm"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      ),

      // Tables
      table: ({ children }: any) => (
        <div className="my-4 overflow-x-auto">
          <table className="w-full border-collapse border border-border rounded-lg overflow-hidden text-sm">
            {children}
          </table>
        </div>
      ),
      thead: ({ children }: any) => (
        <thead className="bg-muted/50">{children}</thead>
      ),
      tbody: ({ children }: any) => (
        <tbody className="divide-y divide-border">{children}</tbody>
      ),
      tr: ({ children }: any) => (
        <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
      ),
      th: ({ children }: any) => (
        <th className="border border-border px-3 py-1.5 text-left font-semibold text-foreground text-xs">
          {children}
        </th>
      ),
      td: ({ children }: any) => (
        <td className="border border-border px-3 py-1.5 text-foreground text-xs">
          {children}
        </td>
      ),

      // Horizontal rule
      hr: () => (
        <hr className="my-6 border-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      ),
    }),
    [onCopy, copied, isWrapped, toggleWrap, resolvedTheme, geistMono],
  );

  // Remark and rehype plugins
  const remarkPlugins = useMemo(
    () => [remarkGfm, remarkBreaks, remarkMath],
    [],
  );
  const rehypePlugins = useMemo(
    () => [rehypeRaw, rehypeSanitize, rehypeKatex],
    [],
  );

  return {
    preprocessMarkdown,
    markdownComponents,
    remarkPlugins,
    rehypePlugins,
  };
};
