"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  File as FileIcon,
  Folder as FolderIcon,
  FolderOpen,
} from "lucide-react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

const FilesContext = React.createContext<{
  openItems: string[];
  setOpenItems: React.Dispatch<React.SetStateAction<string[]>>;
} | null>(null);

interface FilesProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultOpen?: string[];
}

export const Files = ({
  children,
  className,
  defaultOpen = [],
  ...props
}: FilesProps) => {
  const [openItems, setOpenItems] = React.useState<string[]>(defaultOpen);

  return (
    <FilesContext.Provider value={{ openItems, setOpenItems }}>
      <div className={cn("flex flex-col gap-1", className)} {...props}>
        {children}
      </div>
    </FilesContext.Provider>
  );
};

interface FolderItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const FolderItem = ({
  children,
  className,
  value,
  ...props
}: FolderItemProps) => {
  const context = React.useContext(FilesContext);
  if (!context) throw new Error("FolderItem must be used within Files");

  const isOpen = context.openItems.includes(value);

  return (
    <CollapsiblePrimitive.Root
      open={isOpen}
      onOpenChange={(open) => {
        context.setOpenItems((prev) =>
          open ? [...prev, value] : prev.filter((item) => item !== value)
        );
      }}
      className={cn("w-full", className)}
      {...props}
    >
      {children}
    </CollapsiblePrimitive.Root>
  );
};

interface FolderTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  gitStatus?: "modified" | "untracked" | "deleted" | "ignored";
}

export const FolderTrigger = ({
  children,
  className,
  gitStatus,
  ...props
}: FolderTriggerProps) => {
  const context = React.useContext(FilesContext);
  // We can't easily know "isOpen" here without context or prop, but standard use assumes direct child of FolderItem
  // For simplicity, we'll just render. Ideally, FolderItem passes state down or we use context better.
  // Visuals:

  return (
    <CollapsiblePrimitive.Trigger
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm font-medium hover:bg-muted/50 transition-colors text-left",
        gitStatus === "modified" && "text-yellow-500",
        gitStatus === "untracked" && "text-green-500",
        className
      )}
      {...props}
    >
      <ChevronRight className="size-4 shrink-0 transition-transform duration-200 ui-open:rotate-90 text-muted-foreground" />
      <FolderIcon className="size-4 shrink-0 fill-current opacity-70" />
      <span className="truncate flex-1">{children}</span>
      {gitStatus && (
        <span className="text-[10px] uppercase opacity-70 ml-2">
          {gitStatus[0]}
        </span>
      )}
    </CollapsiblePrimitive.Trigger>
  );
};

export const FolderPanel = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <CollapsiblePrimitive.Content
      className={cn(
        "overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down pl-4 border-l border-border/40 ml-2 mt-0.5",
        className
      )}
      {...props}
    >
      {children}
    </CollapsiblePrimitive.Content>
  );
};

export const SubFiles = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={cn("flex flex-col gap-0.5", className)} {...props}>
      {children}
    </div>
  );
};

interface FileItemProps extends React.HTMLAttributes<HTMLDivElement> {
  gitStatus?: "modified" | "untracked" | "deleted" | "ignored";
  icon?: React.ElementType; // Accept icon component
}

export const FileItem = ({
  children,
  className,
  gitStatus,
  icon: Icon = FileIcon,
  ...props
}: FileItemProps) => {
  return (
    <div
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm cursor-pointer hover:bg-muted/50 transition-colors",
        gitStatus === "modified" && "text-yellow-600 dark:text-yellow-400",
        gitStatus === "untracked" && "text-green-600 dark:text-green-400",
        className
      )}
      {...props}
    >
      {/* Indent is handled by Panel padding */}
      <Icon className="size-4 shrink-0 opacity-70" />
      <span className="truncate flex-1">{children}</span>
      {gitStatus && (
        <span className="text-[10px] uppercase opacity-70 ml-2 font-mono">
          {gitStatus[0]}
        </span>
      )}
    </div>
  );
};
