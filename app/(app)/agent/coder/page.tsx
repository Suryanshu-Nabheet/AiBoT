"use client";

import { useEffect, useState, useRef } from "react";
import {
  PaperPlaneRight,
  Code,
  Desktop,
  DownloadSimple,
  SidebarSimple,
  ArrowsClockwise,
  PencilSimple,
  FloppyDisk,
  TerminalWindow,
  X,
  Minus,
  Square,
  Warning,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Message, Role } from "@/lib/types";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  FileItem,
  FolderItem,
  FolderTrigger,
  FolderPanel,
  Files,
  SubFiles,
} from "@/components/ui/file-tree";
import { FileJson, FileCode, FileType, File } from "lucide-react";
import dynamic from "next/dynamic";

import { useWebContainer } from "@/hooks/use-web-container";
import { WebContainer } from "@webcontainer/api";
import { TerminalRef } from "@/components/editor/terminal";
import { Sparkle, Loader2, User } from "lucide-react";
import { ThinkingOverlay } from "@/components/ui/thinking-overlay";
import ReactMarkdown from "react-markdown";

const TerminalComponent = dynamic(
  () => import("@/components/editor/terminal"),
  {
    ssr: false,
  }
);

// Map VFS to WebContainer FileSystemTree
const convertNodesToTree = (nodes: FileNode[]) => {
  const tree: any = {};
  nodes.forEach((node) => {
    if (node.type === "file") {
      tree[node.name] = {
        file: {
          contents: node.content || "",
        },
      };
    } else if (node.type === "folder" && node.children) {
      tree[node.name] = {
        directory: convertNodesToTree(node.children),
      };
    }
  });
  console.log("Tree", tree);
  return tree;
};

// VFS Types
// FileNode type replaced by interface below

// Helper to determine icon
const getFileIcon = (name: string) => {
  if (name.endsWith(".tsx") || name.endsWith(".ts")) return FileCode;
  if (name.endsWith(".css")) return FileType;
  if (name.endsWith(".json")) return FileJson;
  return File;
};

interface FileNode {
  name: string;
  type: "file" | "folder";
  path: string;
  isOpen?: boolean;
  content?: string;
  children?: FileNode[];
}

const initialFiles: FileNode[] = [
  {
    name: "package.json",
    type: "file",
    path: "package.json",
    content: `{
  "name": "my-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 8080 -H 0.0.0.0",
    "build": "next build",
    "start": "next start -p 8080 -H 0.0.0.0",
    "lint": "next lint"
  },
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "next": "14.2.16",
    "lucide-react": "^0.460.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.4",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "postcss": "^8",
    "tailwindcss": "^3",
    "eslint": "^8",
    "eslint-config-next": "14.2.16"
  }
}`,
  },
  {
    name: "app",
    type: "folder",
    path: "app",
    isOpen: true,
    children: [
      {
        name: "page.tsx",
        type: "file",
        path: "app/page.tsx",
        content: `import React from 'react';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold">Hello World</h1>
    </div>
  );
}`,
      },
      {
        name: "layout.tsx",
        type: "file",
        path: "app/layout.tsx",
        content: `import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`,
      },
      {
        name: "globals.css",
        type: "file",
        path: "app/globals.css",
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;`,
      },
    ],
  },
  {
    name: "postcss.config.js",
    type: "file",
    path: "postcss.config.js",
    content: `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};`,
  },
  {
    name: "tailwind.config.ts",
    type: "file",
    path: "tailwind.config.ts",
    content: `import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;`,
  },
];

export default function CoderAgentPage() {
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code");
  const [isToolsOpen, setIsToolsOpen] = useState(true);
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [terminalCommand, setTerminalCommand] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const terminalRef = useRef<TerminalRef>(null);

  // VFS State
  const [files, setFiles] = useState<FileNode[]>(initialFiles);
  const [activeFile, setActiveFile] = useState<string>("app/page.tsx");
  const [code, setCode] = useState(`// Select a file to view its content`);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem("vfs");
    if (saved) {
      try {
        setFiles(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load VFS", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("vfs", JSON.stringify(files));
  }, [files]);

  // Initial prompt removed as requested - user starts empty state.

  const { webContainer, error: bootError } = useWebContainer();
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  // Listen for preview server
  useEffect(() => {
    if (webContainer) {
      const unsubscribe = webContainer.on("server-ready", (port, url) => {
        console.log("Server ready:", url);
        setIframeUrl(url);
        setActiveTab("preview");
        toast.success(`Server ready on port ${port}`);
      });
      return () => {
        unsubscribe();
      };
    }
  }, [webContainer]);

  // Sync VFS to WebContainer
  useState(() => {
    if (webContainer) {
      const tree = convertNodesToTree(files);
      webContainer.mount(tree);
    }
  }); // This runs too often. Better to buffer or use explicit sync.
  // For now, let's keep it simple: initial mount + update on specific actions.
  // Actually, 'files' changes on every edit. Re-mounting entire tree is safe but might be slow?
  // WebContainer mount is fast for diffs.
  // Let's use useEffect

  /* 
     useEffect(() => {
        if (webContainer && files.length > 0) {
            webContainer.mount(convertNodesToTree(files));
        }
     }, [webContainer, files]);
     
     // Listen for preview server
     useEffect(() => {
         if (webContainer) {
             webContainer.on('server-ready', (port, url) => {
                 setIframeUrl(url);
                 toast.success(`Server ready at ${url}`);
             });
         }
     }, [webContainer]);
  */

  // Initialize code from default active file
  useState(() => {
    const findContent = (
      nodes: FileNode[],
      path: string
    ): string | undefined => {
      for (const node of nodes) {
        if (node.path === path && node.type === "file") return node.content;
        if (node.children) {
          const found = findContent(node.children, path);
          if (found) return found;
        }
      }
    };
    const initial = findContent(files, "app/page.tsx");
    if (initial) setCode(initial);
  });

  // Helper to update file content in the VFS
  const updateFileContent = (path: string, newContent: string) => {
    const updateNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((node) => {
        if (node.path === path) {
          return { ...node, content: newContent };
        }
        if (node.children) {
          return { ...node, children: updateNodes(node.children) };
        }
        return node;
      });
    };
    setFiles((prev) => updateNodes(prev));

    // Sync to WebContainer
    if (webContainer) {
      webContainer.fs
        .writeFile(path, newContent)
        .catch((err) => console.error("Failed to sync file to container", err));
    }
  };

  const handleEditorChange = (value: string) => {
    setCode(value);
    if (activeFile) {
      updateFileContent(activeFile, value);
    }
  };

  const parseAIOutput = (generatedText: string) => {
    // Regex to find file markers: // === filename === or similar
    // Also strictly handles cases without markers (single file)
    const fileRegex = /\/\/ === (.*?) ===[\s\S]*?(?=(\/\/ === |$))/g;
    const matches = [...generatedText.matchAll(fileRegex)];

    if (matches.length === 0) {
      // treat as single file or generic update
      return;
    }

    const newRoot: FileNode[] = []; // We can rebuild or merge. Rebuilding is safer for "new project".
    let hasPackageJson = false;

    const insertNode = (
      root: FileNode[],
      pathParts: string[],
      content: string,
      fullPath: string
    ) => {
      if (pathParts.length === 0) return;
      const [current, ...rest] = pathParts;

      if (rest.length === 0) {
        // It's a file
        const existing = root.find(
          (n) => n.name === current && n.type === "file"
        );
        if (existing) {
          existing.content = content;
        } else {
          root.push({ name: current, type: "file", path: fullPath, content });
        }
      } else {
        // It's a folder
        let folder = root.find(
          (n) => n.name === current && n.type === "folder"
        );
        if (!folder) {
          folder = {
            name: current,
            type: "folder",
            path: fullPath.split(current)[0] + current,
            children: [],
            isOpen: true,
          };
          root.push(folder);
        }
        insertNode(folder.children!, rest, content, fullPath);
      }
    };

    matches.forEach((match) => {
      // match[0] is the full block, match[1] is filename
      const header = match[0].split("\n")[0];
      let content = match[0].substring(header.length).trim();

      // Clean Markdown code blocks if present
      // Remove opening block (e.g. ```typescript, ```json, or just ```)
      content = content.replace(/^```[^\n]*\n/, "");
      // Remove closing block
      content = content.replace(/\n```$/, "");
      content = content.trim();

      const filepath = match[1].trim();

      // Clean filepath (remove ./ or leading /)
      const cleanPath = filepath.replace(/^\.\//, "").replace(/^\//, "");
      if (cleanPath === "package.json") hasPackageJson = true;
      const parts = cleanPath.split("/");

      insertNode(newRoot, parts, content, cleanPath);
    });

    setFiles(newRoot);

    // Sync new files to WebContainer
    if (webContainer) {
      const tree = convertNodesToTree(newRoot);
      webContainer.mount(tree).then(() => {
        console.log("Mounted AI generated files");
        // Auto-run if package.json exists
        if (hasPackageJson) {
          toast.info(
            "Project created! Installing dependencies & starting server..."
          );
          // Delay slightly to ensure mount is stable
          setTimeout(() => {
            setTerminalCommand("npm install && npm run dev");
            setTimeout(() => setTerminalCommand(null), 1000);
          }, 500);
        }
      });
    }

    // Open first file found
    const firstFile = findFirstFile(newRoot);
    if (firstFile) {
      setActiveFile(firstFile.path);
      setCode(firstFile.content || "");
    }
  };

  const findFirstFile = (nodes: FileNode[]): FileNode | null => {
    for (const node of nodes) {
      if (node.type === "file") return node;
      if (node.children) {
        const found = findFirstFile(node.children);
        if (found) return found;
      }
    }
    return null;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    // Add User Message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: Role.User,
      content: prompt,
    };
    setMessages((prev) => [...prev, userMsg]);

    setIsGenerating(true);

    try {
      const termOutput = terminalRef.current?.getOutput() || "";
      const fullPrompt = `User Request: ${prompt}\n\nTechnical Context:\nTerminal Output (last lines):\n${termOutput.slice(-2000)}`;

      const res = await fetch("/api/agent/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate code");
      }

      const data = await res.json();

      // Parse multi-file output
      if (data.code.includes("// ===")) {
        parseAIOutput(data.code);
      } else {
        // Fallback for single response
        setCode(data.code);
      }

      setActiveTab("preview");
      toast.success("Code generated successfully!");

      // Add Assistant Message
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: Role.Agent,
          content: "I've generated the code for you. Check the preview tab!",
        },
      ]);
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
            {/* Chat Messages */}
            <div className="flex flex-col gap-4">
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
                      "relative max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm transition-all",
                      msg.role === Role.User
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-[#27272a] border border-white/5 text-gray-100 rounded-bl-sm"
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
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
        <div className="flex-1 flex h-full overflow-hidden bg-background">
          {/* File Explorer Sidebar */}
          <div className="w-64 border-r border-border/40 bg-muted/10 flex flex-col hidden md:flex shrink-0">
            <div className="h-[45px] px-4 border-b border-border/40 flex items-center">
              <span className="text-xs font-bold tracking-wider text-muted-foreground/80 uppercase">
                Explorer
              </span>
            </div>
            {/* Boot Error Banner */}
            {bootError && (
              <div className="bg-red-900/20 border-b border-red-500/30 p-2 px-4 flex items-start gap-2 text-xs text-red-400">
                <Warning className="size-4 shrink-0 mt-0.5" />
                <span>{bootError}</span>
              </div>
            )}

            <div className="flex-1 overflow-auto">
              <Files className="w-full" defaultOpen={["app"]}>
                {renderFileTree(files)}
              </Files>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-w-0 bg-background">
            {/* Content Container (Tabs + Editor) */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Tabs */}
              <div className="h-[45px] flex items-center gap-1 px-2 border-b border-border/40 bg-background/50 backdrop-blur-sm shrink-0">
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 text-xs gap-1.5",
                      isTerminalOpen && "bg-muted"
                    )}
                    onClick={() => setIsTerminalOpen(!isTerminalOpen)}
                    title="Toggle Terminal"
                  >
                    <TerminalWindow className="size-3.5" />
                  </Button>
                </div>
              </div>

              {/* Editor/Preview Area */}
              <div className="flex-1 relative overflow-hidden">
                {activeTab === "code" ? (
                  <div className="absolute inset-0 overflow-auto bg-[#1e1e1e]">
                    {isEditing ? (
                      <textarea
                        className="w-full h-full bg-[#1e1e1e] text-blue-100 font-mono text-sm leading-relaxed p-6 outline-none resize-none"
                        value={code}
                        onChange={(e) => handleEditorChange(e.target.value)}
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
                    {/* Generation Overlay */}
                    <ThinkingOverlay
                      isVisible={isGenerating}
                      onCancel={() => setIsGenerating(false)}
                    />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-white">
                    {/* ... preview ... */}

                    {iframeUrl ? (
                      <iframe
                        src={iframeUrl}
                        className="w-full h-full border-none"
                      />
                    ) : (
                      <div className="w-full h-full p-4 overflow-auto border-4 border-dashed border-gray-100 m-4 rounded-lg flex items-center justify-center">
                        <p className="text-gray-400 italic">
                          {webContainer
                            ? "Loading preview..."
                            : "Booting WebContainer..."}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Terminal Panel */}
            {isTerminalOpen && (
              <div className="h-48 border-t border-border/40 bg-[#1e1e1e] flex flex-col shrink-0">
                <div className="h-9 border-b border-white/5 px-4 flex items-center justify-between bg-[#18181b]">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <div className="flex items-center gap-2 px-2 py-1 rounded bg-white/5 border border-white/5">
                      <TerminalWindow className="size-3 text-blue-400" />
                      <span className="font-medium text-gray-300">
                        Terminal
                      </span>
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      <button
                        className="px-2 py-0.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded text-[10px] transition-colors"
                        onClick={() => {
                          if (webContainer) {
                            toast.loading("Starting project...");
                            setTerminalCommand("npm install && npm run dev");
                            setTimeout(() => setTerminalCommand(null), 500);
                          }
                        }}
                      >
                        Run Project
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="p-1 hover:bg-white/10 rounded"
                      onClick={() => setIsTerminalOpen(false)}
                    >
                      <X className="size-3 text-gray-400" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 w-full overflow-hidden bg-[#1e1e1e]">
                  {/* @ts-ignore */}
                  <TerminalComponent
                    ref={terminalRef}
                    webContainer={webContainer}
                    commandToRun={terminalCommand}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  function renderFileTree(nodes: FileNode[]) {
    return nodes.map((node) => {
      if (node.type === "folder") {
        return (
          <FolderItem key={node.path} value={node.path}>
            <FolderTrigger className="w-full flex items-center justify-between">
              {node.name}
            </FolderTrigger>
            <FolderPanel>
              <SubFiles>
                {node.children && renderFileTree(node.children)}
              </SubFiles>
            </FolderPanel>
          </FolderItem>
        );
      } else {
        return (
          <FileItem
            key={node.path}
            icon={getFileIcon(node.name)}
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setActiveFile(node.path);
              if (node.content !== undefined) setCode(node.content);
            }}
          >
            {node.name}
          </FileItem>
        );
      }
    });
  }
}
