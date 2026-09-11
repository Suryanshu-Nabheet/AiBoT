"use client";

import { useEffect } from "react";

/**
 * Keeps --app-height in sync with the visible viewport (mobile browser chrome + keyboard).
 */
export function useVisualViewportHeight() {
  useEffect(() => {
    const setAppHeight = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--app-height", `${height}px`);
    };

    setAppHeight();

    const vv = window.visualViewport;
    vv?.addEventListener("resize", setAppHeight);
    vv?.addEventListener("scroll", setAppHeight);
    window.addEventListener("resize", setAppHeight);
    window.addEventListener("orientationchange", setAppHeight);

    return () => {
      vv?.removeEventListener("resize", setAppHeight);
      vv?.removeEventListener("scroll", setAppHeight);
      window.removeEventListener("resize", setAppHeight);
      window.removeEventListener("orientationchange", setAppHeight);
    };
  }, []);
}
