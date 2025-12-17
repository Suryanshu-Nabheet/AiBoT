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

export default function CoachAgentPage() {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

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
        }),
      });

      if (!res.ok) throw new Error("Failed to get response");

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
      toast.error("Failed to get response.");
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
    <div className="relative flex h-full w-full bg-background overflow-hidden flex-col items-center justify-center text-foreground font-sans">
      {/* Background Accents */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/50 via-background to-background opacity-70 pointer-events-none" />

      {/* Top Bar - Minimalist */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-50">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <SpeakerHigh className="size-6 text-blue-600" weight="bold" />
            <span>
              Ai <span className="text-blue-600">Coach</span>
            </span>
          </h1>
        </div>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full transition-colors",
              showTranscript ? "bg-blue-100 text-blue-600" : "hover:bg-muted"
            )}
            onClick={() => setShowTranscript(!showTranscript)}
            title="Toggle Transcript"
          >
            <TextT className="size-5" />
          </Button>
        </div>
      </div>

      {/* Center - Visualizer & Controls - Fixed Height Container for Alignment */}
      <div className="flex-1 w-full flex flex-col items-center justify-center relative z-10 px-4">
        <div className="w-full max-w-xl min-h-[320px] flex items-center justify-center">
          {/* Center - Visualizer & Controls */}
          {isProcessing ? (
            <AITextLoading
              texts={[
                "Thinking...",
                "Understanding...",
                "Formulating...",
                "Almost there...",
              ]}
              interval={2000}
            />
          ) : isSpeaking ? (
            <AIVoiceOutput isSpeaking={isSpeaking} onStop={stopListening} />
          ) : (
            <AIVoiceInput
              onStart={startListening}
              onStop={stopListening}
              isListening={listening}
              isProcessing={false}
              isSpeaking={isSpeaking}
            />
          )}
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
            className="absolute inset-y-0 right-0 w-full md:w-[400px] bg-background/95 backdrop-blur-xl border-l z-[60] shadow-2xl flex flex-col"
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col gap-1 p-3 rounded-xl text-sm border shadow-sm",
                    msg.role === Role.User
                      ? "bg-blue-50 border-blue-100 ml-8 text-blue-900"
                      : "bg-white border-slate-100 mr-8 text-slate-900"
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
    </div>
  );
}
