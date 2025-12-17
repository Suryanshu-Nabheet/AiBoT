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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
            {/* Spinning Square - Advanced Polish */}
            <div
              className={cn(
                "w-14 h-14 rounded-lg flex items-center justify-center transition-all duration-500 cursor-pointer",
                isSpeaking
                  ? "animate-spin bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30 ring-4 ring-blue-50"
                  : "text-blue-600 bg-blue-50 hover:bg-blue-100"
              )}
              style={isSpeaking ? { animationDuration: "3s" } : undefined}
            >
              {!isSpeaking && <SpeakerHigh className="size-7" weight="bold" />}
            </div>

            {/* Decorative background glow when speaking */}
            {isSpeaking && (
              <div className="absolute inset-0 bg-blue-400/20 blur-xl rounded-full animate-pulse z-[-1]" />
            )}
          </div>
        </button>

        {/* Bars - Polished Blue */}
        <div className="h-12 w-64 flex items-center justify-center gap-0.5">
          {[...Array(48)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-0.5 rounded-full transition-all duration-300",
                isSpeaking
                  ? "bg-blue-600 animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.4)]" // Glow effect on bars
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
