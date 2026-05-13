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
import { ThemeProvider } from "next-themes";
import { AppFrame } from "@/components/layout/app-frame";

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
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${font.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <ViewModeProvider>
              <AppFrame>{children}</AppFrame>
            </ViewModeProvider>
          </Providers>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
