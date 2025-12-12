"use client";

import { useEffect, useState } from "react";
import {
  PaperPlaneRight,
  Code,
  Desktop,
  DownloadSimple,
  ArrowsClockwise,
  PencilSimple,
  FloppyDisk,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Message, Role } from "@/lib/types";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ThinkingOverlay } from "@/components/ui/thinking-overlay";

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [code, setCode] = useState(EMPTY_HTML);

  useEffect(() => {
    const saved = localStorage.getItem("coder-code");
    if (saved && saved !== EMPTY_HTML && !saved.includes("AiBoT")) {
      setCode(saved);
    }
  }, []);

  useEffect(() => {
    if (
      code !== EMPTY_HTML &&
      !code.includes('Ai</span><span class="bot">BoT')
    ) {
      localStorage.setItem("coder-code", code);
    }
  }, [code]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: Role.User,
      content: prompt,
    };
    setMessages((prev) => [...prev, userMsg]);

    const currentPrompt = prompt;
    const currentCode = code;
    setPrompt("");
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
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate code");
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
      toast.error("Failed to generate code. Please try again.");

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: Role.Agent,
          content: "Sorry, I encountered an error. Please try again.",
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
    localStorage.setItem("coder-code", code);
    setIsEditing(false);
    toast.success("Code saved successfully!");
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full max-w-full bg-background overflow-hidden">
      {/* Left: Chat Interface */}
      <div className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r bg-background flex flex-col min-h-[300px] lg:min-h-0 lg:min-w-[300px] max-w-full">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Code className="size-5 text-blue-600" weight="bold" />
              Website Builder
            </h2>
          </div>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            HTML/CSS/JS
          </span>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-lg text-sm border border-blue-100">
            <p className="font-medium text-blue-900 mb-2">
              ✨ AI Website Builder
            </p>
            <p className="text-blue-700 text-xs leading-relaxed">
              Describe any website you want, and I'll create a complete,
              production-ready HTML file with beautiful CSS and functional
              JavaScript. No frameworks needed!
            </p>
          </div>

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
                msg.role === Role.User ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "relative max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                  msg.role === Role.User
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-muted border text-foreground rounded-bl-sm"
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t bg-muted/10">
          <div className="relative">
            <textarea
              className="w-full min-h-[100px] p-3 pr-12 rounded-lg border focus:ring-2 focus:ring-blue-500/20 outline-none resize-none bg-background text-sm"
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
            <Button
              size="icon"
              className={cn(
                "absolute bottom-3 right-3 h-8 w-8 transition-all",
                prompt
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-muted text-muted-foreground hover:bg-muted"
              )}
              disabled={!prompt || isGenerating}
              onClick={handleGenerate}
            >
              {isGenerating ? (
                <ArrowsClockwise className="size-4 animate-spin" />
              ) : (
                <PaperPlaneRight className="size-4" weight="fill" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-center text-muted-foreground mt-2">
            AI-generated code • Review before use
          </p>
        </div>
      </div>

      {/* Right: Code/Preview Area */}
      <div className="flex-1 flex flex-col h-full max-w-full overflow-hidden bg-background">
        {/* Tabs */}
        <div className="h-[45px] flex items-center gap-1 px-2 sm:px-3 border-b bg-background/50 backdrop-blur-sm shrink-0">
          <button
            onClick={() => setActiveTab("code")}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              activeTab === "code"
                ? "bg-blue-100 text-blue-700"
                : "hover:bg-muted text-muted-foreground"
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
                : "hover:bg-muted text-muted-foreground"
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
                isEditing && "bg-blue-100 text-blue-700 hover:bg-blue-200"
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
                localStorage.removeItem("coder-code");
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
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                title="Website Preview"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
