/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { useEffect, useState, useRef } from "react";
import {
  PaperPlaneRight,
  Code,
  Desktop,
  DownloadSimple,
  ArrowsClockwise,
  PencilSimple,
  FloppyDisk,
  Paperclip,
  X,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Message, Role } from "@/lib/types";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ThinkingOverlay } from "@/components/ui/thinking-overlay";
import { PageShell } from "@/components/layout/page-shell";
import { ATTACH_ACCEPT, type ChatAttachment } from "@/lib/chat/attachments";
import { processFilesForChat } from "@/lib/chat/process-files";
import { AGENT_MODEL_STORAGE } from "@/lib/chat/agent-models";
import { ModelSelector } from "@/components/ui/model-selector";
import { useModel } from "@/hooks/use-model";
import { useSettings } from "@/contexts/settings-context";
import { sanitizeCustomKeysForRequest } from "@/lib/chat/sanitize-custom-keys";

const EMPTY_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Website</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: white;
        }
        h1 {
            font-size: 4rem;
            font-weight: 700;
            letter-spacing: -0.02em;
            margin-bottom: 1rem;
        }
        .ai {
            color: black;
        }
        .bot {
            color: blue;
        }
        .subtitle {
            color: #666;
            font-size: 1.1rem;
            text-align: center;
            max-width: 600px;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <h1><span class="ai">Ai</span><span class="bot">BoT</span></h1>
    <p class="subtitle">Describe any website you want, and I'll create a complete, production-ready HTML file with beautiful CSS and functional JavaScript. No frameworks needed!</p>
</body>
</html>`;

export default function CoderAgentPage() {
  const [activeTab, setActiveTab] = useState<"code" | "preview">("preview");
  const [isEditing, setIsEditing] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [code, setCode] = useState(EMPTY_HTML);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { apiKeys } = useSettings();
  const { modelId, setModelId } = useModel({
    storageKey: AGENT_MODEL_STORAGE.coder,
  });

  useEffect(() => {
    // Load persisted state from Session Storage
    if (typeof window !== "undefined") {
      const savedCode = sessionStorage.getItem("coder-code");
      if (
        savedCode &&
        savedCode !== EMPTY_HTML &&
        !savedCode.includes("AiBoT")
      ) {
        setCode(savedCode);
      }

      const savedMessages = sessionStorage.getItem("coder-messages");
      if (savedMessages) {
        try {
          setMessages(JSON.parse(savedMessages));
        } catch (e) {
          console.error("Failed to parse saved messages", e);
        }
      }
    }
  }, []);

  useEffect(() => {
    // Save Code to Session Storage
    if (
      code !== EMPTY_HTML &&
      !code.includes('Ai</span><span class="bot">BoT') &&
      typeof window !== "undefined"
    ) {
      sessionStorage.setItem("coder-code", code);
    }
  }, [code]);

  useEffect(() => {
    // Save Messages to Session Storage
    if (messages.length > 0 && typeof window !== "undefined") {
      sessionStorage.setItem("coder-messages", JSON.stringify(messages));
    }
  }, [messages]);

  const handleGenerate = async () => {
    if (!prompt.trim() && attachments.length === 0) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: Role.User,
      content: prompt.trim() || "(attachment)",
      attachments: [...attachments],
    };
    setMessages((prev) => [...prev, userMsg]);

    const currentPrompt = prompt;
    const currentAttachments = [...attachments];
    const currentCode = code;
    setPrompt("");
    setAttachments([]);
    setIsGenerating(true);

    try {
      // Determine if this is a modification or new creation
      const isModification = currentCode !== EMPTY_HTML && messages.length > 0;

      let aiPrompt = "";

      if (isModification) {
        // Modification request
        aiPrompt = `You are modifying an existing website. Here is the CURRENT CODE:

\`\`\`html
${currentCode}
\`\`\`

USER REQUEST: ${currentPrompt}

INSTRUCTIONS:
- Analyze the current code carefully
- Make ONLY the changes requested by the user
- Preserve all existing functionality not mentioned
- Add smooth animations for any new elements
- Ensure responsive design for new additions
- Include error handling and validation
- Add helpful comments for complex logic

YOUR RESPONSE:
First, explain what you're changing (2-3 sentences).
Then write: ---CODE---
Then provide the COMPLETE updated HTML code.`;
      } else {
        // New website creation
        aiPrompt = `Create a complete, production-ready HTML website for: ${currentPrompt}

REQUIREMENTS:
- Single HTML file with embedded <style> and <script> tags
- Modern, premium design with smooth animations
- Fully functional JavaScript for all interactive features
- Responsive design (mobile, tablet, desktop)
- Advanced features: form validation, scroll animations, localStorage, etc.
- Clean, well-commented code
- NO external dependencies or frameworks
- NO placeholders - everything must work

YOUR RESPONSE:
First, explain what you're building (3-5 sentences covering features and design).
Then write: ---CODE---
Then provide the COMPLETE HTML code.`;
      }

      const res = await fetch("/api/agent/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          attachments: currentAttachments,
          model: modelId,
          customKeys: sanitizeCustomKeysForRequest(apiKeys),
        }),
      });

      if (!res.ok) {
        let detail = "Failed to generate code";
        try {
          const err = await res.json();
          detail =
            (typeof err?.message === "string" && err.message) ||
            (typeof err?.body === "string" && err.body) ||
            detail;
        } catch {
          /* ignore */
        }
        throw new Error(detail);
      }

      const data = await res.json();

      // Parse response: separate explanation from code
      let explanation = "";
      let generatedCode = data.code.trim();

      if (generatedCode.includes("---CODE---")) {
        const parts = generatedCode.split("---CODE---");
        explanation = parts[0].trim();
        generatedCode = parts[1].trim();
      }

      // Clean markdown code blocks
      generatedCode = generatedCode
        .replace(/^```html\n/, "")
        .replace(/^```\n/, "");
      generatedCode = generatedCode.replace(/\n```$/, "");

      // Update code and switch to preview
      setCode(generatedCode);
      setActiveTab("preview");

      // Show success message
      const successMessage = isModification
        ? "Website updated!"
        : "Website created!";
      toast.success(successMessage);

      // Add AI response to chat
      const aiMessage =
        explanation ||
        (isModification
          ? "I've updated your website with the requested changes. Check the preview!"
          : "I've created your website! Check the preview tab to see it in action.");

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: Role.Agent,
          content: aiMessage,
        },
      ]);
    } catch (error) {
      console.error("Generation error:", error);
      const message =
        error instanceof Error ? error.message : "Failed to generate code.";
      toast.error(message);

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: Role.Agent,
          content: `Sorry — ${message}`,
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    const blob = new Blob([code], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "index.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Website exported as index.html");
  };

  const handleSave = () => {
    sessionStorage.setItem("coder-code", code);
    setIsEditing(false);
    toast.success("Code saved successfully!");
  };

  return (
    <PageShell className="bg-background xl:flex-row">
      {/* Left: Chat Interface - 50% on desktop */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col border-b bg-background basis-0 xl:h-full xl:w-1/2 xl:flex-none xl:border-b-0 xl:border-r">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b p-3 sm:p-4">
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              <Code className="size-6 text-blue-600" weight="bold" />
              <span>
                Ai <span className="text-blue-600">Coder</span>
              </span>
            </h1>
          </div>
          <ModelSelector
            value={modelId}
            onValueChange={setModelId}
            modelStorageKey={AGENT_MODEL_STORAGE.coder}
            triggerVariant="compact"
            triggerClassName="h-8 max-w-[min(48vw,200px)]"
            enablePickerShortcut
          />
        </div>

        {/* Chat Messages */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-3 sm:space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
                msg.role === Role.User ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "relative max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                  msg.role === Role.User
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-muted border text-foreground rounded-bl-sm",
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="shrink-0 border-t bg-muted/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((att, i) => (
                <div
                  key={att.id}
                  className="flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-[11px]"
                >
                  <span className="max-w-[140px] truncate">{att.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setAttachments((prev) =>
                        prev.filter((_, idx) => idx !== i),
                      )
                    }
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="relative">
            <textarea
              className="w-full min-h-[88px] max-h-[min(30dvh,200px)] resize-none rounded-lg border bg-background p-3 pr-20 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 sm:min-h-[100px]"
              placeholder="Describe your website (e.g., 'A landing page for a coffee shop with menu and contact form')"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ATTACH_ACCEPT}
              className="hidden"
              onChange={async (e) => {
                const list = e.target.files;
                if (!list?.length) return;
                const { attachments: next, errors } = await processFilesForChat(
                  Array.from(list),
                  attachments.length,
                );
                if (next.length) setAttachments((prev) => [...prev, ...next]);
                for (const err of errors) toast.error(err);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute bottom-2 right-11 h-8 w-8 text-muted-foreground sm:bottom-3 sm:right-12"
              onClick={() => fileInputRef.current?.click()}
              title="Attach context"
            >
              <Paperclip className="size-4" />
            </Button>
            <Button
              size="icon"
              className={cn(
                "absolute bottom-2 sm:bottom-3 right-2 sm:right-3 h-8 w-8 transition-all",
                prompt || attachments.length
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-muted text-muted-foreground hover:bg-muted",
              )}
              disabled={(!prompt && attachments.length === 0) || isGenerating}
              onClick={handleGenerate}
            >
              {isGenerating ? (
                <ArrowsClockwise className="size-4 animate-spin" />
              ) : (
                <PaperPlaneRight className="size-4" weight="fill" />
              )}
            </Button>
          </div>
          <p className="text-[10px] sm:text-[11px] text-center text-muted-foreground mt-2 px-2">
            Attach images/docs for design context • Review code before use
          </p>
        </div>
      </div>

      {/* Right: Code/Preview Area */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background basis-0 xl:h-full xl:w-1/2 xl:flex-none">
        {/* Tabs */}
        <div className="flex h-12 shrink-0 items-center gap-1 overflow-x-auto overscroll-x-contain border-b bg-background/50 px-2 backdrop-blur-sm scrollbar-none sm:px-3">
          <button
            onClick={() => setActiveTab("code")}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              activeTab === "code"
                ? "bg-blue-100 text-blue-700"
                : "hover:bg-muted text-muted-foreground",
            )}
          >
            <Code className="size-4" />
            Code
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              activeTab === "preview"
                ? "bg-blue-100 text-blue-700"
                : "hover:bg-muted text-muted-foreground",
            )}
          >
            <Desktop className="size-4" />
            Preview
          </button>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 text-xs gap-1.5",
                isEditing && "bg-blue-100 text-blue-700 hover:bg-blue-200",
              )}
              onClick={() => {
                if (isEditing) {
                  handleSave();
                } else {
                  setIsEditing(true);
                }
              }}
            >
              {isEditing ? (
                <>
                  <FloppyDisk className="size-3.5" />
                  Save
                </>
              ) : (
                <>
                  <PencilSimple className="size-3.5" />
                  Edit
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={handleExport}
            >
              <DownloadSimple className="size-3.5" />
              Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => {
                sessionStorage.removeItem("coder-code");
                sessionStorage.removeItem("coder-messages");
                setCode(EMPTY_HTML);
                setMessages([]);
                setActiveTab("preview");
                toast.success("Reset to empty template");
              }}
              title="Reset to empty template"
            >
              <ArrowsClockwise className="size-3.5" />
              Reset
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative overflow-hidden">
          {activeTab === "code" ? (
            <div className="absolute inset-0 overflow-auto bg-[#1e1e1e]">
              {isEditing ? (
                <textarea
                  className="w-full h-full bg-[#1e1e1e] text-gray-100 font-mono text-sm leading-relaxed p-6 outline-none resize-none"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  spellCheck={false}
                />
              ) : (
                <SyntaxHighlighter
                  language="html"
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    padding: "1.5rem",
                    height: "100%",
                    fontSize: "0.875rem",
                  }}
                  showLineNumbers={true}
                >
                  {code}
                </SyntaxHighlighter>
              )}
              <ThinkingOverlay
                isVisible={isGenerating}
                onCancel={() => setIsGenerating(false)}
              />
            </div>
          ) : (
            <div className="absolute inset-0 bg-white">
              <iframe
                srcDoc={code}
                className="w-full h-full border-none"
                sandbox="allow-scripts allow-forms allow-modals"
                title="Website Preview"
              />
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
