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
import { Providers } from "./providers";
import { AppFrame } from "@/components/layout/app-frame";
import { ViewModeProvider } from "@/contexts/view-mode-context";
import { SettingsProvider } from "@/contexts/settings-context";
import { SettingsModalProvider } from "@/contexts/settings-modal-context";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = siteConfig;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>
          <ViewModeProvider>
            <SettingsProvider>
              <SettingsModalProvider>
                <TooltipProvider delayDuration={0}>
                  <AppFrame>{children}</AppFrame>
                </TooltipProvider>
              </SettingsModalProvider>
            </SettingsProvider>
          </ViewModeProvider>
        </Providers>
        <Toaster
          position="bottom-right"
          offset={{
            bottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
            right: "calc(0.75rem + env(safe-area-inset-right, 0px))",
          }}
          mobileOffset={{
            bottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
            right: "calc(0.75rem + env(safe-area-inset-right, 0px))",
          }}
        />
      </body>
    </html>
  );
}
