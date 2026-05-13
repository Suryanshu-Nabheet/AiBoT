"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { UIStructure } from "@/components/ui/ui-structure";
import { SidebarToggle } from "@/components/layout/sidebar-toggle";
import { HeaderModeToggle } from "@/components/home/header-mode-toggle";

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHomePage = pathname === "/" || pathname?.startsWith("/chat/");

  return (
    <div className="flex h-screen w-full max-w-full overflow-hidden">
      <SidebarProvider>
        <UIStructure />
        <SidebarInset className="bg-sidebar p-0 md:p-2 relative flex-col">
          <div className="flex h-full flex-col w-full max-w-full relative overflow-hidden bg-background md:rounded-2xl border border-sidebar-border/50 shadow-sm">
            <header className="flex h-12 w-full items-center gap-0 shrink-0 z-10 overflow-hidden select-none">
              {/* Left and Center of Header - White Background */}
              <div className="flex-1 flex items-center gap-4 px-4 h-full bg-background border-b border-sidebar-border/30">
                <SidebarToggle />
                <div className="flex-1" />
              </div>

              {isHomePage ? (
                <>
                  {/* The "Slanted" S-Curve Transition - Desktop Only */}
                  <div className="hidden md:block h-full w-12 bg-sidebar relative">
                    <svg
                      viewBox="0 0 48 48"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="absolute inset-0 w-full h-full text-background fill-current"
                      preserveAspectRatio="none"
                    >
                      <path d="M0 0H48V48H0V0Z" fill="var(--color-sidebar)" />
                      <path
                        d="M0 0C24 0 24 48 48 48H0V0Z"
                        fill="currentColor"
                      />
                      <path
                        d="M0 48H48"
                        stroke="border-sidebar-border/30"
                        strokeWidth="1"
                      />
                    </svg>
                  </div>

                  {/* Right "Cut-out" for the Toggle - Desktop Only */}
                  <div className="hidden md:flex items-center h-full bg-sidebar pr-6 border-b border-sidebar-border/30">
                    <HeaderModeToggle />
                  </div>

                  {/* Mobile Header Elements - Kept inside white background */}
                  <div className="md:hidden flex items-center px-4 h-full bg-background border-b border-sidebar-border/30">
                    <HeaderModeToggle />
                  </div>
                </>
              ) : (
                <div className="h-full bg-background border-b border-sidebar-border/30 pr-4" />
              )}
            </header>

            <main className="flex-1 w-full max-w-full relative overflow-hidden">
              {children}
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
