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

export function useChatComposerEnhance(
  query: string,
  setQuery: Dispatch<SetStateAction<string>>,
  t: Translate,
) {
  const [isEnhancing, setIsEnhancing] = useState(false);

  const onEnhance = useCallback(async () => {
    if (!query.trim()) {
      toast.warning(t("toast.enhance.empty"));
      return;
    }

    const originalQuery = query;
    setIsEnhancing(true);

    try {
      const res = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: query }),
      });

      if (!res.ok) {
        toast.error(t("toast.enhance.fail"));
        return;
      }

      const data = await res.json();

      if (data.enhanced) {
        const enhanced = data.enhanced.trim();
        const isErrorMessage =
          enhanced.toLowerCase().includes("please provide") ||
          enhanced.length < originalQuery.length;

        if (isErrorMessage) {
          toast.info(enhanced, { duration: 4000 });
        } else {
          setQuery(enhanced);
          toast.success(t("toast.enhance.success"));
        }
      } else {
        toast.error(t("toast.enhance.none"));
      }
    } catch (error) {
      console.error("Enhancement error:", error);
      toast.error(t("toast.enhance.fail"));
    } finally {
      setIsEnhancing(false);
    }
  }, [query, setQuery, t]);

  return { isEnhancing, onEnhance };
}
