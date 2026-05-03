/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useEffect } from "react";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  useEffect(() => {
    // Initialize boring theme from localStorage
    const savedBoringTheme = localStorage.getItem("boringTheme");
    if (savedBoringTheme === "true") {
      document.documentElement.classList.add("boring-theme");
    }
  }, []);

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
