import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Terminal, Code, Cpu, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ThinkingOverlayProps {
  isVisible: boolean;
  onCancel: () => void;
}

const STEPS = [
  { icon: Terminal, text: "Reading terminal output..." },
  { icon: Cpu, text: "Analyzing technical context..." },
  { icon: Code, text: "Generating solution..." },
  { icon: Sparkles, text: "Polishing code..." },
];

export function ThinkingOverlay({ isVisible, onCancel }: ThinkingOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // Cycle through steps
  useEffect(() => {
    if (!isVisible) {
      setCurrentStep(0);
      return;
    }

    // Step duration: 2s, 3s, 4s...
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % STEPS.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  const StepIcon = STEPS[currentStep].icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[8px]"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="relative w-full max-w-[400px] overflow-hidden rounded-2xl border border-white/10 bg-[#18181b] p-8 shadow-2xl"
      >
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-[50%] -left-[50%] h-[200%] w-[200%] animate-spin-slow bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,transparent_60deg,rgba(59,130,246,0.5)_180deg,transparent_300deg)]" />
        </div>
        <div className="absolute inset-[1px] rounded-[15px] bg-[#18181b]" />

        {/* Content */}
        <div className="relative flex flex-col items-center gap-6 text-center">
          {/* Central Logo / Spinner */}
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-2xl border-t border-blue-500/50 opacity-50"
            />
            <motion.div
              key={currentStep}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <StepIcon className="h-8 w-8 text-blue-400" />
            </motion.div>
          </div>

          <div className="space-y-2">
            <motion.h3
              className="text-xl font-medium text-white"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              Building
            </motion.h3>

            <div className="h-6 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentStep}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  className="text-sm text-gray-400"
                >
                  {STEPS[currentStep].text}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
            <motion.div
              className="h-full bg-blue-500"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          </div>

          <button
            onClick={onCancel}
            className="group mt-2 flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-4 py-2 text-xs text-gray-400 transition-colors hover:border-white/10 hover:bg-white/10 hover:text-white"
          >
            <X className="h-3 w-3" />
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
