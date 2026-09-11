/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { ViewMode } from "@/components/home/settings-toggle";

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(
  undefined,
);

const VIEW_MODE_STORAGE_KEY = "aibot_view_mode";

function readStoredViewMode(): ViewMode {
  if (typeof window === "undefined") return "direct";
  try {
    const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (
      stored === "direct" ||
      stored === "side-by-side" ||
      stored === "settings"
    ) {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return "direct";
}

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode>("direct");

  useEffect(() => {
    setViewModeState(readStoredViewMode());
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
      } catch {
        /* ignore */
      }
    }
  }, []);

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error("useViewMode must be used within a ViewModeProvider");
  }
  return context;
}
