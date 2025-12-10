"use client";

import { useState } from "react";
import {
  PaperPlaneRight,
  Code,
  Desktop,
  DownloadSimple,
  SidebarSimple,
  ArrowsClockwise,
  PencilSimple,
  FloppyDisk,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function CoderAgentPage() {
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code");
  const [isToolsOpen, setIsToolsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [code, setCode] = useState(`// Your AI generated code will appear here
import React from 'react';

export default function App() {
  return (
    <div className="p-4">
      <h1>Hello World</h1>
    </div>
  );
}`);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);

    try {
      const response = await fetch("/api/agent/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate code");
      }

      const data = await response.json();
      setCode(data.code);
      setActiveTab("preview");
      toast.success("Code generated successfully!");
    } catch (error) {
      toast.error("Error generating code");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };
  const handleExport = () => {
    const blob = new Blob([code], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "App.js"; // Default filename
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Code exported to App.js");
  };

  return (
    <div className="flex h-full w-full bg-background overflow-hidden font-sans">
      {/* Settings / File Sidebar (Collapsed by default visually or small icon bar) */}

      {/* Main Split */}
      <div className="flex-1 flex flex-col md:flex-row h-full">
        {/* Left: Chat/Prompt Interface */}
        <div className="w-full md:w-1/3 border-r bg-background flex flex-col min-w-[300px]">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold flex items-center gap-2">
                <Code className="size-5 text-blue-600" weight="bold" />
                Coder Agent
              </h2>
            </div>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              Beta
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
              Hi! I'm your AI coding assistant. Describe the application or
              component you want to build, and I'll generate the code for you.
            </div>
            {/* Simulated Interaction History */}
            {code !== "" && !code.startsWith("// Your AI") && (
              <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2">
                <div className="self-end bg-blue-600 text-white p-3 rounded-2xl rounded-tr-sm max-w-[85%] text-sm">
                  {prompt}
                </div>
                <div className="self-start bg-muted p-3 rounded-2xl rounded-tl-sm max-w-[85%] text-sm">
                  I've generated the code for you. Check the preview tab!
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-muted/10">
            <div className="relative">
              <textarea
                className="w-full min-h-[100px] p-3 pr-12 rounded-lg border focus:ring-2 focus:ring-blue-500/20 outline-none resize-none bg-background text-sm"
                placeholder="Describe what to code..."
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
              AI can make mistakes. Review generated code.
            </p>
          </div>
        </div>

        {/* Right: Code / Preview Area */}
        <div className="flex-1 flex flex-col bg-muted/20">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-2 border-b bg-background">
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
                    toast.success("Code saved successfully!");
                  }
                  setIsEditing(!isEditing);
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
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 relative overflow-hidden">
            {activeTab === "code" ? (
              <div className="absolute inset-0 overflow-auto bg-[#1e1e1e]">
                {isEditing ? (
                  <textarea
                    className="w-full h-full bg-[#1e1e1e] text-blue-100 font-mono text-sm leading-relaxed p-6 outline-none resize-none"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    spellCheck={false}
                  />
                ) : (
                  <SyntaxHighlighter
                    language="javascript"
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
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-white">
                <div className="w-full h-full p-4 overflow-auto border-4 border-dashed border-gray-100 m-4 rounded-lg flex items-center justify-center">
                  <p className="text-gray-400 italic">
                    {code.includes("GeneratedApp") ? (
                      // Just a visual representation since we can't run React code dynamically easily here without a sandbox
                      <div className="text-center p-8 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl shadow-xl">
                        <h1 className="text-3xl font-bold mb-2">
                          AI Generated App
                        </h1>
                        <p>Interactive preview would live here.</p>
                      </div>
                    ) : (
                      "Preview Area"
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
