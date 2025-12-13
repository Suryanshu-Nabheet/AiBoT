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
    () => (text: string) => {
      return (
        text
          // Handle ### markers embedded in text
          .replace(/###\s*(\d+)\.\s*/g, "\n\n### $1. ")
          // Handle ### at the end of sentences
          .replace(/([.!?])\s*###\s*/g, "$1\n\n### ")
          // Add breaks before "Application in Business"
          .replace(
            /###\s*Application in Business/g,
            "\n\n### Application in Business"
          )
          // Add breaks before "Considerations"
          .replace(/###\s*Considerations/g, "\n\n### Considerations")
          // Convert - Definition: to proper formatting
          .replace(/\s*-\s*Definition:/g, "\n\n**Definition:**")
          // Convert - Example: to proper formatting
          .replace(/\s*-\s*Example:/g, "\n\n**Example:**")
          // Add line breaks before numbered items
          .replace(/([.!?])\s*(\d+\.\s*[A-Z])/g, "$1\n\n$2")
          // Add breaks before specific keywords
          .replace(
            /([.!?])\s*(Perfectly Inelastic|Inelastic|Unitary|Elastic|Understanding)/g,
            "$1\n\n$2"
          )
          // Handle PED formulas
          .replace(/([.!?])\s*\(/g, "$1\n\n(")
          .replace(/\)\s*-\s*/g, ")\n\n- ")
          // Clean up multiple line breaks
          .replace(/\n{3,}/g, "\n\n")
          // Add breaks after sentences
          .replace(/([.!?])\s+([A-Z][a-z])/g, "$1\n\n$2")
          .trim()
      );
    },
    []
  );

  // Markdown components
  const markdownComponents = useMemo(
    () => ({
      // Headers
      h1: ({ children }: any) => (
        <h1 className="text-2xl font-bold mt-6 mb-3 text-foreground border-b border-border pb-2">
          {children}
        </h1>
      ),
      h2: ({ children }: any) => (
        <h2 className="text-xl font-semibold mt-5 mb-2 text-foreground">
          {children}
        </h2>
      ),
      h3: ({ children }: any) => (
        <h3 className="text-lg font-medium mt-4 mb-2 text-foreground">
          {children}
        </h3>
      ),
      h4: ({ children }: any) => (
        <h4 className="font-medium mt-3 mb-1 text-foreground">{children}</h4>
      ),

      // Paragraphs
      p: ({ children }: any) => (
        <p className="text-foreground mb-3 last:mb-0">{children}</p>
      ),

      // Lists
      ul: ({ children }: any) => (
        <ul className="list-disc list-inside space-y-1 mb-3 ml-3 text-foreground">
          {children}
        </ul>
      ),
      ol: ({ children }: any) => (
        <ol className="list-decimal list-inside space-y-1 mb-3 ml-3 text-foreground">
          {children}
        </ol>
      ),
      li: ({ children }: any) => (
        <li className="text-foreground">{children}</li>
      ),

      // Blockquotes
      blockquote: ({ children }: any) => (
        <blockquote className="border-l-3 border-primary/20 pl-3 py-1 my-3 bg-muted/30 rounded-r-lg italic text-muted-foreground">
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
              className
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
    [onCopy, copied, isWrapped, toggleWrap, resolvedTheme, geistMono]
  );

  // Remark and rehype plugins
  const remarkPlugins = useMemo(() => [remarkGfm, remarkBreaks], []);
  const rehypePlugins = useMemo(() => [rehypeRaw, rehypeSanitize], []);

  return {
    preprocessMarkdown,
    markdownComponents,
    remarkPlugins,
    rehypePlugins,
  };
};
