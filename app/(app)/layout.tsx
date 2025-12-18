/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2025 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { SidebarToggle } from "@/app/_components/sidebar-toggle";
import { SidebarInset } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ViewModeProvider } from "@/contexts/view-mode-context";
import { HeaderModeToggle } from "@/components/home/header-mode-toggle";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <ViewModeProvider>
          <SidebarInset className="h-full overflow-hidden bg-background max-w-full">
            <div className="flex h-full flex-col w-full max-w-full relative overflow-x-hidden">
              <header className="flex h-12 w-full items-center gap-2 shrink-0 px-2 sm:px-4 bg-background z-10 border-b border-border/50">
                <SidebarToggle />
                <div className="flex-1" />
                <HeaderModeToggle />
              </header>
              <main className="flex-1 w-full max-w-full relative overflow-hidden">
                {children}
              </main>
            </div>
          </SidebarInset>
        </ViewModeProvider>
      </ThemeProvider>
    </>
  );
}
