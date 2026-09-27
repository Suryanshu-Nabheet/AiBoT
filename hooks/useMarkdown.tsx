/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";
import {
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { ClipboardTextIcon, CheckIcon } from "@phosphor-icons/react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import {
  CheckIcon as Check,
  CopyIcon as Copy,
  DownloadIcon as Download,
  Maximize2Icon as Maximize,
  MinusIcon as ZoomOut,
  PlusIcon as ZoomIn,
  RotateCcwIcon as ResetZoom,
  XIcon as Close,
} from "lucide-react";
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
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface MermaidDiagramProps {
  source: string;
  theme: "dark" | "default";
}

function MermaidDiagram({ source, theme }: MermaidDiagramProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("");
  const [zoom, setZoom] = useState(1);
  const diagramRef = useRef<HTMLDivElement>(null);
  const fullscreenDiagramRef = useRef<HTMLDivElement>(null);
  const fullscreenViewportRef = useRef<HTMLDivElement>(null);
  const hasAutoFitRef = useRef(false);

  const fitDiagram = useCallback(() => {
    const svg =
      fullscreenDiagramRef.current?.querySelector<SVGSVGElement>(
        "svg.flowchart",
      );
    const viewport = fullscreenViewportRef.current;
    const viewBox = svg
      ?.getAttribute("viewBox")
      ?.split(/[\s,]+/)
      .map(Number);
    const width = viewBox?.[2];
    const height = viewBox?.[3];
    if (!width || !height || !viewport) return;

    const availableWidth = Math.max(1, viewport.clientWidth - 64);
    const availableHeight = Math.max(1, viewport.clientHeight - 64);
    setZoom(Math.min(1, availableWidth / width, availableHeight / height));
  }, []);

  useEffect(() => {
    if (!fullscreen) return;

    const applyReadableDiagramSize = () => {
      const root = fullscreenDiagramRef.current;
      const svg = root?.querySelector<SVGSVGElement>("svg.flowchart");
      const viewBox = svg
        ?.getAttribute("viewBox")
        ?.split(/[\s,]+/)
        .map(Number);
      const width = viewBox?.[2];
      const height = viewBox?.[3];
      if (!svg || !width || !height) return;

      if (!hasAutoFitRef.current) {
        const viewport = fullscreenViewportRef.current;
        if (viewport) {
          const scale = Math.min(
            1,
            Math.max(1, viewport.clientWidth - 64) / width,
            Math.max(1, viewport.clientHeight - 64) / height,
          );
          hasAutoFitRef.current = true;
          setZoom(scale);
          svg.style.setProperty("width", `${width * scale}px`, "important");
          svg.style.setProperty("height", `${height * scale}px`, "important");
          return;
        }
      }

      // Mermaid defaults to width="100%". That makes very wide charts fit,
      // but renders every label too small to read. In fullscreen, preserve
      // Mermaid's source dimensions and let the viewer scroll/zoom instead.
      svg.style.setProperty("width", `${width * zoom}px`, "important");
      svg.style.setProperty("height", `${height * zoom}px`, "important");
    };

    const observer = new MutationObserver(applyReadableDiagramSize);
    // The dialog portal and Mermaid SVG mount after this effect can run.
    observer.observe(document.body, { childList: true, subtree: true });
    applyReadableDiagramSize();
    return () => observer.disconnect();
  }, [fullscreen, source, zoom]);

  const copyDiagram = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(source);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = source;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        if (!copied) throw new Error("Clipboard copy was rejected");
      }
      setCopied(true);
      setStatus("Diagram source copied");
      toast.success("Diagram source copied");
      window.setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.error("Failed to copy diagram source", error);
      setStatus("Could not copy diagram source");
      toast.error("Could not copy diagram source");
    }
  }, [source]);

  const downloadPng = useCallback(async () => {
    const root = fullscreen ? fullscreenDiagramRef.current : diagramRef.current;
    const svg = root?.querySelector<SVGSVGElement>("svg.flowchart");
    if (!svg) {
      setStatus("Diagram is still rendering");
      toast.error("Diagram is still rendering");
      return;
    }

    try {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        securityLevel: "strict",
        startOnLoad: false,
        theme,
        htmlLabels: false,
        flowchart: { useMaxWidth: true, htmlLabels: false },
      });
      const rendered = await mermaid.render(
        `aibot-diagram-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        source,
      );
      if (!rendered.svg) throw new Error("Mermaid did not return an SVG");

      const viewBox = rendered.svg.match(/viewBox="([^"]+)"/i)?.[1];
      const [, , viewWidth, viewHeight] = viewBox?.split(/[\s,]+/) ?? [];
      const width = Math.ceil(Number(viewWidth));
      const height = Math.ceil(Number(viewHeight));
      if (!width || !height) throw new Error("Diagram has no exportable size");

      const scale = Math.min(
        2,
        16_384 / width,
        16_384 / height,
        Math.sqrt(100_000_000 / (width * height)),
      );
      const image = new Image();
      image.crossOrigin = "anonymous";
      const svgData = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(rendered.svg)))}`;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () =>
          reject(new Error("The browser could not read the diagram SVG"));
        image.src = svgData;
      });

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(width * scale));
      canvas.height = Math.max(1, Math.floor(height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("PNG canvas is unavailable");
      context.fillStyle = theme === "dark" ? "#09090b" : "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const png = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) =>
            blob
              ? resolve(blob)
              : reject(new Error("The browser could not encode the diagram")),
          "image/png",
        );
      });
      const downloadUrl = URL.createObjectURL(png);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "diagram.png";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      setStatus("PNG downloaded");
      toast.success("Diagram downloaded as PNG");
    } catch (error) {
      console.error("Failed to export Mermaid diagram as PNG", error);
      setStatus("Could not export PNG. Try copying the diagram source.");
      toast.error("Could not export diagram as PNG");
    }
  }, [fullscreen, source, theme]);

  const renderDiagram = (
    ref: RefObject<HTMLDivElement | null>,
    expanded = false,
  ) => (
    <div
      ref={ref}
      className={`mermaid-fit w-full min-w-0 ${expanded ? "mermaid-fit-fullscreen" : ""}`}
    >
      <Streamdown
        mode="static"
        controls={{
          code: false,
          table: false,
          mermaid: {
            copy: false,
            download: false,
            fullscreen: false,
            panZoom: false,
          },
        }}
        mermaid={{
          config: {
            securityLevel: "strict",
            theme,
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            htmlLabels: false,
            flowchart: { useMaxWidth: true, htmlLabels: false },
          },
        }}
      >
        {`\`\`\`mermaid\n${source}\n\`\`\``}
      </Streamdown>
    </div>
  );

  const toolbar = (expanded = false) => (
    <div className="flex shrink-0 items-center justify-end gap-1 border-b border-border/70 px-2 py-1.5">
      <span className="mr-auto hidden font-sans text-xs text-muted-foreground md:block">
        {expanded
          ? "Scroll to explore · Fit to view shows the whole diagram"
          : "Scroll to explore · Fullscreen shows the whole diagram"}
      </span>
      {expanded && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 rounded-lg"
            aria-label="Zoom out"
            title="Zoom out"
            disabled={zoom <= 0.15}
            onClick={() => setZoom((current) => Math.max(0.15, current - 0.25))}
          >
            <ZoomOut className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 rounded-lg"
            aria-label="Fit diagram to view"
            title="Fit diagram to view"
            onClick={fitDiagram}
          >
            <ResetZoom className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 rounded-lg"
            aria-label="Zoom in"
            title="Zoom in"
            disabled={zoom >= 2.5}
            onClick={() => setZoom((current) => Math.min(2.5, current + 0.25))}
          >
            <ZoomIn className="size-4" />
          </Button>
        </>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 rounded-lg"
        aria-label={copied ? "Diagram source copied" : "Copy diagram source"}
        title={copied ? "Copied" : "Copy diagram source"}
        onClick={copyDiagram}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 rounded-lg"
        aria-label="Download diagram as PNG"
        title="Download PNG"
        onClick={downloadPng}
      >
        <Download className="size-4" />
      </Button>
      {expanded ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 rounded-lg"
          aria-label="Close fullscreen diagram"
          title="Close fullscreen"
          onClick={() => {
            setZoom(1);
            hasAutoFitRef.current = false;
            setFullscreen(false);
          }}
        >
          <Close className="size-4" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 rounded-lg"
          aria-label="View diagram fullscreen"
          title="View fullscreen"
          onClick={() => {
            hasAutoFitRef.current = false;
            setZoom(1);
            setFullscreen(true);
          }}
        >
          <Maximize className="size-4" />
        </Button>
      )}
    </div>
  );

  return (
    <div className="my-4 min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-card">
      {toolbar()}
      <div
        className="flex h-[min(58vh,36rem)] min-h-52 w-full items-stretch overflow-auto"
        tabIndex={0}
        aria-label="Scrollable diagram preview"
      >
        {renderDiagram(diagramRef)}
      </div>
      <span className="sr-only" aria-live="polite">
        {status}
      </span>
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent
          showCloseButton={false}
          className="flex h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 bg-background p-0 sm:max-w-none"
          overlayClassName="bg-background/95 backdrop-blur-sm"
        >
          <DialogTitle className="sr-only">Diagram viewer</DialogTitle>
          {toolbar(true)}
          <div
            ref={fullscreenViewportRef}
            className={cn(
              "flex min-h-0 flex-1 overflow-auto p-3 sm:p-8",
              zoom < 0.95
                ? "items-center justify-center"
                : "items-start justify-start",
            )}
            tabIndex={0}
            aria-label="Scrollable diagram canvas"
          >
            {renderDiagram(fullscreenDiagramRef, true)}
          </div>
          <span className="sr-only" aria-live="polite">
            {status}
          </span>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface UseMarkdownOptions {
  onCopy?: (content: string) => void;
  copied?: boolean;
  isWrapped?: boolean;
  toggleWrap?: () => void;
  resolvedTheme?: string;
}

export const useMarkdown = (options: UseMarkdownOptions = {}) => {
  const { onCopy, copied = false, isWrapped = false } = options;

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
        <h4 className="text-sm font-medium mt-2 mb-1 text-inherit">
          {children}
        </h4>
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
      pre({ children }: any) {
        if (isValidElement(children)) {
          const code = children as ReactElement<{
            children?: ReactNode;
            node?: { properties?: { className?: string[] } };
          }>;
          const codeText = String(code.props.children ?? "").trim();
          const hasLanguage =
            (code.props.node?.properties?.className?.length ?? 0) > 0;
          const isMarkdownBlock =
            /\*\*[^*\n]+\*\*/.test(codeText) &&
            /(?:^|\n)\s*(?:[-*]\s|\d+[.)]\s|#{1,6}\s)/.test(codeText);

          if (!hasLanguage && isMarkdownBlock) {
            return (
              <Streamdown mode="static" controls={false}>
                {codeText}
              </Streamdown>
            );
          }
        }

        return (
          <pre className="my-3 max-w-full overflow-x-auto rounded-lg">
            {children}
          </pre>
        );
      },

      code(props: any) {
        const { children, className, ...rest } = props;
        const match = /language-(\w+)/.exec(className ?? "");
        const isInline = !match;
        const codeContent = String(children).replace(/\n$/, "");
        const embeddedMermaid = codeContent.match(
          /^\s*(`{3,}|~{3,})\s*mermaid[^\n]*\n([\s\S]*?)(?:\n\s*(?:`{3,}|~{3,})\s*)?$/i,
        );
        const isMermaid =
          match?.[1].toLowerCase() === "mermaid" || !!embeddedMermaid;
        const mermaidSource = embeddedMermaid?.[2] ?? codeContent;

        if (isMermaid) {
          return (
            <MermaidDiagram
              source={mermaidSource}
              theme={options.resolvedTheme === "dark" ? "dark" : "default"}
            />
          );
        }

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
    [onCopy, copied, isWrapped, options.resolvedTheme],
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
