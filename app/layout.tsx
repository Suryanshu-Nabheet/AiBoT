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
              </SidebarProvider>
            </div>
          </ViewModeProvider>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
