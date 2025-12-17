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
      <div className="relative max-w-xl w-full mx-auto flex items-center flex-col gap-4">
        <button
          className={cn(
            "group w-24 h-24 rounded-2xl flex items-center justify-center transition-all z-50 shadow-sm",
            "bg-transparent cursor-default shadow-none"
          )}
          type="button"
          onClick={onStop}
        >
          <div className="relative flex items-center justify-center">
            {/* Spinning Square - Blue Theme */}
            <div
              className={cn(
                "w-14 h-14 rounded-md flex items-center justify-center transition-colors cursor-pointer",
                isSpeaking
                  ? "animate-spin bg-blue-600 shadow-sm" // Solid Blue Spinner
                  : "text-blue-600"
              )}
              style={isSpeaking ? { animationDuration: "3s" } : undefined}
            >
              {/* No icon inside solid spinner, purely abstract shape like the user snippet */}
              {!isSpeaking && <SpeakerHigh className="size-8" />}
            </div>
          </div>
        </button>

        <span
          className={cn(
            "font-mono text-base font-medium transition-opacity duration-300 h-6",
            isSpeaking
              ? "text-blue-700 opacity-100" // Matches Input Timer
              : "text-slate-400 opacity-0"
          )}
        >
          {formatTime(time)}
        </span>

        {/* Bars - Thin Style but Blue */}
        <div className="h-12 w-64 flex items-center justify-center gap-0.5">
          {[...Array(48)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-0.5 rounded-full transition-all duration-300",
                isSpeaking
                  ? "bg-blue-600 animate-pulse" // Blue Pulse
                  : "bg-slate-200 h-1"
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

        <p className="h-6 text-sm font-semibold text-slate-600 uppercase tracking-widest mt-2">
          {isSpeaking ? "Speaking..." : "AI Ready"}
        </p>
      </div>
    </div>
  );
}
