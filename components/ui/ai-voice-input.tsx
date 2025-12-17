"use client";

import { Microphone } from "@phosphor-icons/react";
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

  // Active state combines listening, processing, or speaking for the "submitted" look
  const isActive = isListening || isProcessing || isSpeaking;

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

  // Determine status text
  const statusText = isProcessing
    ? "Thinking..."
    : isSpeaking
      ? "Speaking..."
      : isListening
        ? "Listening..."
        : "Click to speak";

  return (
    <div className="w-full py-4 flex flex-col items-center justify-center">
      <div className="relative max-w-xl w-full mx-auto flex items-center flex-col gap-4">
        <button
          className={cn(
            "group w-24 h-24 rounded-2xl flex items-center justify-center transition-all z-50 shadow-sm",
            // Idle: White styling with shadow. Active: Transparent.
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
              {/* Spinner for Thinking/Active */}
              <div
                className={cn(
                  "w-10 h-10 rounded-md animate-spin cursor-pointer",
                  "bg-blue-600"
                )}
                style={{ animationDuration: "3s" }}
              />
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
            isActive
              ? "text-blue-900 opacity-100" // Clearly visible Text
              : "text-slate-400 opacity-0"
          )}
        >
          {formatTime(time)}
        </span>

        {/* Bars Visualizer */}
        <div className="h-12 w-64 flex items-center justify-center gap-1.5">
          {[...Array(16)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-1.5 rounded-full transition-all duration-300",
                isActive
                  ? "bg-blue-600 animate-pulse" // Bright Blue
                  : "bg-slate-200 h-1.5"
              )}
              style={
                isActive && isClient
                  ? {
                      height: `${30 + Math.random() * 70}%`, // Dynamic height
                      animationDelay: `${i * 0.05}s`,
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
