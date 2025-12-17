"use client";

import { Microphone, Pause, SpeakerHigh } from "@phosphor-icons/react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface AIVoiceInputProps {
  onStart: () => void;
  onStop: () => void;
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
}

export function AIVoiceInput({
  onStart,
  onStop,
  isListening,
  isProcessing,
  isSpeaking,
}: AIVoiceInputProps) {
  const [time, setTime] = useState(0);
  const [isClient, setIsClient] = useState(false);

  // Active if either listening or speaking
  const isActive = isListening || isSpeaking;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isListening) {
      intervalId = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);
    } else {
      setTime(0);
    }

    return () => clearInterval(intervalId);
  }, [isListening]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleClick = () => {
    if (isActive) {
      onStop();
    } else {
      onStart();
    }
  };

  // Determine status text & color theme
  // Unified Blue Theme as per user request ("past style")
  const isModeSpeaking = isSpeaking;
  const statusText = isSpeaking
    ? "Speaking..."
    : isListening
      ? "Listening..."
      : "Click to speak";

  // Always Blue
  const pulseColor = "bg-blue-600";
  const darkPulseColor = "dark:bg-blue-400";
  const textColor = "text-blue-700";

  return (
    <div className="w-full py-4 flex flex-col items-center justify-center">
      <div className="relative max-w-xl w-full mx-auto flex items-center flex-col gap-4">
        <button
          className={cn(
            "group w-24 h-24 rounded-2xl flex items-center justify-center transition-all z-50 shadow-sm",
            isActive
              ? "bg-transparent cursor-default shadow-none"
              : "bg-white hover:bg-slate-50 border border-slate-200 cursor-pointer shadow-md"
          )}
          type="button"
          onClick={handleClick}
          disabled={isProcessing}
          aria-label={isActive ? "Stop" : "Start Microphone"}
        >
          {isActive ? (
            <div className="relative flex items-center justify-center">
              {/* Stop Icon for active state - Blue Background */}
              <div
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-colors bg-blue-100 text-blue-600"
                )}
              >
                {isModeSpeaking ? (
                  <SpeakerHigh className="size-8 animate-pulse" weight="fill" />
                ) : (
                  <Pause className="size-6" weight="fill" />
                )}
              </div>
            </div>
          ) : (
            <Microphone
              className="w-10 h-10 text-slate-800 transition-colors"
              weight="fill"
            />
          )}
        </button>

        <span
          className={cn(
            "font-mono text-base font-medium transition-opacity duration-300 h-6",
            isActive ? `${textColor} opacity-100` : "text-slate-400 opacity-0"
          )}
        >
          {isListening ? formatTime(time) : <span>&nbsp;</span>}
        </span>

        {/* Bars Visualizer */}
        <div className="h-12 w-64 flex items-center justify-center gap-1.5">
          {[...Array(16)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-1.5 rounded-full transition-all duration-300",
                isActive
                  ? `${pulseColor} ${darkPulseColor} animate-pulse`
                  : "bg-slate-200 h-1.5"
              )}
              style={
                isActive && isClient
                  ? {
                      height: `${30 + Math.random() * 70}%`, // Dynamic height
                      animationDelay: `${i * 0.05}s`,
                      // Keep slightly faster animation for speaking to differentiate state subtly
                      animationDuration: isModeSpeaking ? "0.5s" : "0.8s",
                    }
                  : { height: "6px" }
              }
            />
          ))}
        </div>

        <p className="h-6 text-sm font-semibold text-slate-600 uppercase tracking-widest mt-2">
          {statusText}
        </p>
      </div>
    </div>
  );
}
