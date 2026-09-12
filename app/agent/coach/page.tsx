/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { TextT, X, SpeakerHigh } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Message, Role } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import "regenerator-runtime/runtime";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { AIVoiceInput } from "@/components/ui/ai-voice-input";
import AITextLoading from "@/components/ui/ai-text-loading";
import AIVoiceOutput from "@/components/ui/ai-voice-output";
import { PageShell } from "@/components/layout/page-shell";
import { AGENT_MODEL_STORAGE } from "@/lib/chat/agent-models";
import { ModelSelector } from "@/components/ui/model-selector";
import { useModel } from "@/hooks/use-model";
import { useSettings } from "@/contexts/settings-context";
import { sanitizeCustomKeysForRequest } from "@/lib/chat/sanitize-custom-keys";

export default function CoachAgentPage() {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { apiKeys } = useSettings();
  const { modelId, setModelId } = useModel({
    storageKey: AGENT_MODEL_STORAGE.coach,
  });

  // Session Storage Persistence
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMessages = sessionStorage.getItem("coach-messages");
      if (savedMessages) {
        try {
          setMessages(JSON.parse(savedMessages));
        } catch (e) {
          console.error("Failed to parse saved coach messages", e);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0 && typeof window !== "undefined") {
      sessionStorage.setItem("coach-messages", JSON.stringify(messages));
    }
  }, [messages]);

  // Speech Recognition
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition();

  // TTS Ref
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Initialize
  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Update State based on listening
  useEffect(() => {
    if (!listening && transcript.trim() && !isProcessing && !isSpeaking) {
      // Only process if we stopped listening and have text
      processUserMessage(transcript);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once when mic stops
  }, [listening]);

  // Handle Speech Input Start
  const startListening = () => {
    if (!browserSupportsSpeechRecognition) {
      toast.error("Browser doesn't support speech recognition.");
      return;
    }
    if (!isMicrophoneAvailable) {
      toast.error("Microphone access denied.");
      return;
    }
    // Stop any current speech
    if (synthRef.current?.speaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
    resetTranscript();
    SpeechRecognition.startListening({ continuous: true, language: "en-US" });
  };

  const stopListening = () => {
    // If currently listening, this stops it and triggers the useEffect to process text
    if (listening) {
      SpeechRecognition.stopListening();
    }
    // If AI is speaking, this cancels it
    if (isSpeaking || synthRef.current?.speaking) {
      synthRef.current?.cancel();
      setIsSpeaking(false);
    }
  };

  // Process User Message
  const processUserMessage = async (text: string) => {
    setIsProcessing(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: Role.User,
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/agent/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          model: modelId,
          customKeys: sanitizeCustomKeysForRequest(apiKeys),
        }),
      });

      if (!res.ok) {
        let detail = "Failed to get response";
        try {
          const err = await res.json();
          detail = (typeof err?.message === "string" && err.message) || detail;
        } catch {
          /* ignore */
        }
        throw new Error(detail);
      }

      const data = await res.json();
      const aiResponse = data.content;

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: Role.Agent,
        content: aiResponse,
      };

      setMessages((prev) => [...prev, aiMsg]);
      speakResponse(aiResponse);
    } catch (error) {
      console.error("Coach error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to get response.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Text to Speech
  const speakResponse = (text: string) => {
    if (!synthRef.current) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    // Clean text (remove formatting / asterisks) - Double safety
    const cleanText = text.replace(/[*#_`]/g, "").replace(/\n/g, ". ");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "en-US";
    utterance.rate = 1.0; // Normal speed
    utterance.pitch = 1.0;

    // Try to find a good FEMALE voice
    const voices = synthRef.current.getVoices();

    // Priority list for "Better Woman Voice"
    const preferredVoice =
      voices.find((v) => v.name.includes("Google US English")) || // Often female
      voices.find((v) => v.name.includes("Samantha")) || // Mac Female
      voices.find((v) => v.name.includes("Zira")) || // Windows Female
      voices.find((v) => v.name.includes("Female")) ||
      voices.find((v) => v.lang.includes("en-US")) ||
      voices[0];

    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  return (
    <PageShell className="relative bg-background font-sans text-foreground">
      {/* Background Accents */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/50 via-background to-background opacity-70 pointer-events-none" />

      {/* Top Bar - Minimalist */}
      <div className="relative z-50 flex w-full shrink-0 items-start justify-between gap-3 p-4 sm:p-6">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            <SpeakerHigh className="size-6 text-blue-600" weight="bold" />
            <span>
              Ai <span className="text-blue-600">Coach</span>
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <ModelSelector
            value={modelId}
            onValueChange={setModelId}
            modelStorageKey={AGENT_MODEL_STORAGE.coach}
            triggerVariant="compact"
            triggerClassName="h-8 max-w-[min(42vw,180px)]"
            enablePickerShortcut
          />
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full transition-colors",
              showTranscript ? "bg-blue-100 text-blue-600" : "hover:bg-muted",
            )}
            onClick={() => setShowTranscript(!showTranscript)}
            title="Toggle Transcript"
          >
            <TextT className="size-5" />
          </Button>
        </div>
      </div>

      {/* Center - Visualizer & Controls - Fixed Height Container for Alignment */}
      <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:py-10">
        <div className="flex min-h-[200px] w-full max-w-xl items-center justify-center sm:min-h-[320px]">
          {/* Center - Visualizer & Controls */}
          <AnimatePresence mode="wait">
            {isProcessing ? (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <AITextLoading
                  texts={[
                    "Thinking...",
                    "Understanding...",
                    "Formulating...",
                    "Almost there...",
                  ]}
                  interval={2000}
                />
              </motion.div>
            ) : isSpeaking ? (
              <motion.div
                key="speaking"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <AIVoiceOutput isSpeaking={isSpeaking} onStop={stopListening} />
              </motion.div>
            ) : (
              <motion.div
                key="listening"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <AIVoiceInput
                  onStart={startListening}
                  onStop={stopListening}
                  isListening={listening}
                  isProcessing={false}
                  isSpeaking={isSpeaking}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Transcript Overlay - Hidden by default */}
      <AnimatePresence>
        {showTranscript && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-y-0 right-0 z-[60] flex w-full max-w-full flex-col border-l bg-background/95 shadow-2xl backdrop-blur-xl md:w-[min(400px,100vw)]"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-lg text-foreground">
                Transcript
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowTranscript(false)}
              >
                <X className="size-5" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col gap-1 p-3 rounded-xl text-sm border shadow-sm",
                    msg.role === Role.User
                      ? "ml-2 border-blue-100 bg-blue-50 text-blue-900 sm:ml-8"
                      : "mr-2 border-slate-100 bg-white text-slate-900 sm:mr-8",
                  )}
                >
                  <span className="text-[10px] font-bold opacity-60 uppercase">
                    {msg.role}
                  </span>
                  <p>{msg.content}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
