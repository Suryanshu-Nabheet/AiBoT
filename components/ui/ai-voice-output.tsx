"use client";

import { SpeakerHigh } from "@phosphor-icons/react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface AIVoiceOutputProps {
  onStop: () => void;
  isSpeaking: boolean;
}

export default function AIVoiceOutput({
  onStop,
  isSpeaking,
}: AIVoiceOutputProps) {
  const [time, setTime] = useState(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isSpeaking) {
      intervalId = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);
    } else {
      setTime(0);
    }

    return () => clearInterval(intervalId);
  }, [isSpeaking]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="w-full py-4 flex flex-col items-center justify-center">
      <div className="relative max-w-xl w-full mx-auto flex items-center flex-col gap-2">
        <button
          className={cn(
            "group w-16 h-16 rounded-xl flex items-center justify-center transition-colors",
            // AI Output style: Spinning square when active (Speaking)
            // User snippet logic: submitted ? "bg-none" : "bg-none hover:..."
            "bg-none hover:bg-black/5 dark:hover:bg-white/5"
          )}
          type="button"
          onClick={onStop}
        >
          <div
            className={cn(
              "w-6 h-6 rounded-sm flex items-center justify-center transition-all",
              isSpeaking
                ? "animate-spin bg-black dark:bg-white cursor-pointer pointer-events-auto"
                : "text-black/90 dark:text-white/90"
            )}
            style={isSpeaking ? { animationDuration: "3s" } : undefined}
          >
            {!isSpeaking && <SpeakerHigh className="w-6 h-6" />}
          </div>
        </button>

        <span
          className={cn(
            "font-mono text-sm transition-opacity duration-300",
            isSpeaking
              ? "text-black/70 dark:text-white/70"
              : "text-black/30 dark:text-white/30"
          )}
        >
          {formatTime(time)}
        </span>

        <div className="h-4 w-64 flex items-center justify-center gap-0.5">
          {[...Array(48)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-0.5 rounded-full transition-all duration-300",
                isSpeaking
                  ? // User logic: active = bg-black/50 animate-pulse
                    "bg-black/50 dark:bg-white/50 animate-pulse"
                  : "bg-black/10 dark:bg-white/10 h-1"
              )}
              style={
                isSpeaking && isClient
                  ? {
                      height: `${20 + Math.random() * 80}%`,
                      animationDelay: `${i * 0.05}s`,
                    }
                  : undefined
              }
            />
          ))}
        </div>

        <p className="h-4 text-xs text-black/70 dark:text-white/70">
          {isSpeaking ? "Speaking..." : "AI Ready"}
        </p>
      </div>
    </div>
  );
}
