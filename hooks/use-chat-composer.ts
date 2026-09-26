"use client";

import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { toast } from "sonner";
import type { TranslationKey } from "@/lib/i18n";

type Translate = (
  key: TranslationKey,
  vars?: Record<string, string | number>,
) => string;

export function useChatComposerClipboard() {
  return useCallback(async (content: string) => {
    await navigator.clipboard.writeText(content);
  }, []);
}

export function useChatComposerSpeech(
  setQuery: Dispatch<SetStateAction<string>>,
  t: Translate,
  locale: string,
) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const onSpeechToggle = useCallback(() => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    if (!("webkitSpeechRecognition" in window)) {
      toast.error(t("toast.speech.unsupported"));
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = locale === "hi" ? "hi-IN" : "en-US";

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      toast.info(t("toast.speech.listening"));
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setQuery((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.start();
  }, [isListening, locale, setQuery, t]);

  return { isListening, onSpeechToggle };
}
