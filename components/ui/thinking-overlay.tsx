import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Zap, Brain, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";

interface ThinkingOverlayProps {
  isVisible: boolean;
  onCancel: () => void;
}

const STEPS = [
  { icon: Brain, text: "Analyzing your request..." },
  { icon: Zap, text: "Crafting premium design..." },
  { icon: Wand2, text: "Writing production code..." },
  { icon: Sparkles, text: "Finalizing website..." },
];

export function ThinkingOverlay({ isVisible, onCancel }: ThinkingOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setCurrentStep(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % STEPS.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  const StepIcon = STEPS[currentStep].icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-xl"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-blue-100 bg-white p-10 shadow-2xl shadow-blue-500/10"
      >
        {/* Subtle gradient orbs */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-blue-600/5 blur-3xl" />

        {/* Content */}
        <div className="relative flex flex-col items-center gap-8 text-center">
          {/* Icon container */}
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500/10 to-blue-600/10 blur-xl"
            />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 ring-1 ring-blue-200">
              <motion.div
                key={currentStep}
                initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
                transition={{ type: "spring", damping: 20 }}
              >
                <StepIcon className="h-10 w-10 text-blue-600" strokeWidth={2} />
              </motion.div>
            </div>
          </div>

          {/* Text */}
          <div className="space-y-3">
            <motion.div
              className="flex items-center justify-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-2xl font-semibold text-gray-900">
                <span className="text-gray-900">AI is </span>
                <span className="text-blue-600">Creating</span>
              </h3>
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Sparkles className="h-5 w-5 text-blue-600" />
              </motion.div>
            </motion.div>

            <div className="h-6 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentStep}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm font-medium text-gray-600"
                >
                  {STEPS[currentStep].text}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full space-y-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-50">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                animate={{
                  x: ["-100%", "100%"],
                }}
                transition={{
                  x: { duration: 1.5, repeat: Infinity, ease: "linear" },
                }}
              />
            </div>
            <div className="flex items-center justify-center gap-1">
              {STEPS.map((_, index) => (
                <motion.div
                  key={index}
                  className="h-1 w-8 rounded-full"
                  animate={{
                    backgroundColor:
                      index === currentStep ? "#2563eb" : "#e0e7ff",
                  }}
                  transition={{ duration: 0.3 }}
                />
              ))}
            </div>
          </div>

          {/* Cancel button */}
          <motion.button
            onClick={onCancel}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-medium text-gray-700 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            <X className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" />
            Cancel Generation
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
