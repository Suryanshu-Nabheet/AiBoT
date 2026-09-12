/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { UIStructure } from "@/components/ui/ui-structure";
import { SidebarToggle } from "@/components/layout/sidebar-toggle";
import { HeaderModeToggle } from "@/components/home/header-mode-toggle";
import { CommandPalette } from "@/components/command-palette";
import { SettingsModal } from "@/components/settings/settings-modal";

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHomePage = pathname === "/" || pathname?.startsWith("/chat/");

  return (
    <div className="flex h-app max-h-app w-full max-w-full min-h-0 overflow-hidden pt-[env(safe-area-inset-top,0px)]">
      <SidebarProvider className="h-app max-h-app min-h-0 w-full overflow-hidden">
        <UIStructure />
        <CommandPalette />
        <SettingsModal />
        <SidebarInset className="relative flex min-h-0 h-full flex-1 flex-col bg-sidebar p-0 md:p-2">
          <div className="relative flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden border border-sidebar-border/50 bg-background shadow-sm md:rounded-2xl">
            <header className="flex h-12 w-full shrink-0 items-center gap-0 overflow-hidden select-none z-10">
              {/* Left and Center of Header - White Background */}
              <div className="flex h-full min-w-0 flex-1 items-center gap-3 border-b border-sidebar-border/30 bg-background px-3 sm:px-4">
                <SidebarToggle />
                <div className="flex-1" />
              </div>

              {isHomePage ? (
                <>
                  {/* The "Slanted" S-Curve Transition - Desktop Only */}
                  <div className="hidden md:block h-full w-8 bg-sidebar relative">
                    <svg
                      viewBox="0 0 32 44"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="absolute inset-0 w-full h-full text-background fill-current"
                      preserveAspectRatio="none"
                    >
                      <path d="M0 0H32V44H0V0Z" fill="var(--color-sidebar)" />
                      <path
                        d="M0 0C16 0 16 44 32 44H0V0Z"
                        fill="currentColor"
                      />
                      <path
                        d="M0 44H32"
                        stroke="border-sidebar-border/30"
                        strokeWidth="1"
                      />
                    </svg>
                  </div>

                  {/* Right "Cut-out" for the Toggle - Desktop Only */}
                  <div className="hidden md:flex items-center h-full bg-sidebar pr-4 border-b border-sidebar-border/30">
                    <HeaderModeToggle />
                  </div>

                  {/* Mobile Header Elements - Kept inside white background */}
                  <div className="flex h-full shrink-0 items-center border-b border-sidebar-border/30 bg-background px-2 sm:px-4 md:hidden">
                    <HeaderModeToggle />
                  </div>
                </>
              ) : (
                <div className="h-full bg-background border-b border-sidebar-border/30 pr-4" />
              )}
            </header>

            <main className="relative flex min-h-0 w-full max-w-full flex-1 overflow-hidden">
              {children}
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
