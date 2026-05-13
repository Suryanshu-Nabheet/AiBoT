/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import "@/styles/globals.css";
import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { siteConfig } from "@/config/site";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "./providers";
import { UIStructure } from "@/components/ui/ui-structure";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ViewModeProvider } from "@/contexts/view-mode-context";
import { SidebarToggle } from "@/components/layout/sidebar-toggle";
import { HeaderModeToggle } from "@/components/home/header-mode-toggle";

export const metadata: Metadata = siteConfig;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${font.className} text-foreground bg-background overflow-x-hidden`}
      >
        <Providers>
          <ViewModeProvider>
            <div className="flex h-screen w-full max-w-full overflow-hidden">
              <SidebarProvider>
                <UIStructure />
                <SidebarInset className="bg-sidebar p-0 md:p-2 relative flex-col">
                  <div className="flex h-full flex-col w-full max-w-full relative overflow-hidden bg-background md:rounded-2xl border border-sidebar-border/50 shadow-sm">
                    <header className="flex h-12 w-full items-center gap-0 shrink-0 z-10 overflow-hidden">
                      {/* Left and Center of Header - White Background */}
                      <div className="flex-1 flex items-center gap-2 px-4 h-full bg-background border-b border-sidebar-border/30">
                        <SidebarToggle />
                        <div className="flex-1" />
                      </div>
                      
                      {/* Minimalist Right "Cut-out" for Settings Gear */}
                      <div className="hidden md:flex items-center h-full bg-sidebar pl-3 pr-3 rounded-bl-[1.25rem] border-l border-b border-sidebar-border/30 shadow-[inset_2px_-2px_4px_rgba(0,0,0,0.02)]">
                        <HeaderModeToggle />
                      </div>

                      {/* Mobile fallback */}
                      <div className="md:hidden flex items-center px-4 h-full bg-background border-b border-sidebar-border/30">
                        <HeaderModeToggle />
                      </div>
                    </header>

                    <main className="flex-1 w-full max-w-full relative overflow-hidden">
                      {children}
                    </main>
                  </div>
                </SidebarInset>
              </SidebarProvider>
            </div>
          </ViewModeProvider>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
